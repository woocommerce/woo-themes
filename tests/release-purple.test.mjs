import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath( new URL( '../scripts/release-purple.mjs', import.meta.url ) );
const prepareScript = fileURLToPath( new URL( '../scripts/prepare-release.mjs', import.meta.url ) );
const notes = '* Add a storefront pattern (#42)\n* Fix café styling (#43)';
const stylesheet = '/*\nTheme Name: Purple\nVersion: 1.2.3\n*/\n';
const readme = `=== Purple ===\nStable tag: 1.2.3\n\n== Changelog ==\n\n= 1.2.3 =\n${ notes }\n\n= 1.2.2 =\n* Older change\n`;

function fixture( t, { style = stylesheet, text = readme } = {} ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'purple-release-test-' ) );
	t.after( () => fs.rmSync( root, { recursive: true, force: true } ) );
	const git = ( ...args ) => execFileSync( 'git', args, { cwd: root, encoding: 'utf8' } ).trim();
	const write = ( file, content ) => fs.writeFileSync( path.join( root, file ), content );
	git( 'init', '-q', '-b', 'trunk' );
	git( 'config', 'user.name', 'Release test' );
	git( 'config', 'user.email', 'release-test@example.com' );
	git( 'config', 'commit.gpgsign', 'false' );
	git( 'config', 'tag.gpgsign', 'false' );
	fs.mkdirSync( path.join( root, 'purple/templates' ), { recursive: true } );
	fs.mkdirSync( path.join( root, 'purple/assets' ) );
	write( 'purple/style.css', style );
	write( 'purple/readme.txt', text );
	write( 'purple/theme.json', '{"version":3}' );
	write( 'purple/templates/index.html', '<!-- wp:post-content /-->' );
	write( 'purple/assets/test.bin', Buffer.from( [ 0, 255, 128, 1 ] ) );
	write( 'purple/phpcs.xml.dist', '<ruleset name="Purple" />' );
	write( '.gitattributes', fs.readFileSync( new URL( '../.gitattributes', import.meta.url ) ) );
	write( 'README.md', 'Repository documentation, not theme content.' );
	git( 'add', '.' );
	git( 'commit', '-qm', 'Prepare Purple 1.2.3' );
	const commit = git( 'rev-parse', 'HEAD' );
	git( 'update-ref', 'refs/remotes/origin/trunk', commit );
	const output = path.join( root, 'output' );
	const githubOutput = path.join( root, 'github-output' );
	const run = ( sha = commit ) => spawnSync( process.execPath, [ script, sha, output ], {
		cwd: root,
		encoding: 'utf8',
		env: { ...process.env, GITHUB_OUTPUT: githubOutput },
	} );
	return { root, git, write, commit, output, githubOutput, run };
}

function rejected( f, sha, message ) {
	const result = f.run( sha );
	assert.notEqual( result.status, 0 );
	assert.match( result.stderr, message );
	assert.equal( fs.existsSync( f.output ), false, 'Validation must fail before writing artifacts.' );
	assert.equal( fs.existsSync( f.githubOutput ), false );
}

test( 'packages exactly the selected ancestor, including binary assets, with only its release notes', ( t ) => {
	const f = fixture( t );
	const files = f.git( 'ls-tree', '-r', '--name-only', f.commit, 'purple/' ).split( '\n' )
		.filter( ( file ) => file !== 'purple/phpcs.xml.dist' );
	f.write( 'purple/style.css', stylesheet.replace( '1.2.3', '1.2.4' ) );
	f.write( 'purple/later.txt', 'Not in the selected release' );
	f.git( 'add', '.' );
	f.git( 'commit', '-qm', 'Later trunk change' );
	f.git( 'update-ref', 'refs/remotes/origin/trunk', 'HEAD' );
	f.write( 'purple/readme.txt', 'Uncommitted content must not leak' );
	f.write( 'purple/untracked.txt', 'Untracked content must not leak' );
	const status = f.git( 'status', '--short', '--', 'purple' );
	const result = f.run();
	assert.equal( result.status, 0, result.stderr );
	assert.equal( fs.readFileSync( path.join( f.output, 'release-notes.md' ), 'utf8' ), `${ notes }\n` );
	assert.equal( fs.readFileSync( f.githubOutput, 'utf8' ), 'version=1.2.3\ntag=purple/1.2.3\n' );
	const archive = path.join( f.output, 'purple-1.2.3.zip' );
	execFileSync( 'unzip', [ '-t', archive ] );
	const entries = execFileSync( 'unzip', [ '-Z1', archive ], { encoding: 'utf8' } ).trim().split( '\n' );
	assert.ok( ! entries.includes( 'purple/phpcs.xml.dist' ), 'The release ZIP must exclude the PHPCS configuration.' );
	assert.deepEqual( entries.filter( ( entry ) => ! entry.endsWith( '/' ) ).sort(), files.sort() );
	assert.ok( entries.every( ( entry ) => entry.startsWith( 'purple/' ) ) );
	for ( const file of files ) {
		assert.deepEqual( execFileSync( 'unzip', [ '-p', archive, file ] ), execFileSync( 'git', [ 'show', `${ f.commit }:${ file }` ], { cwd: f.root } ) );
	}
	assert.equal( f.git( 'tag', '--list' ), '', 'Packaging must not create tags.' );
	assert.equal( f.git( 'status', '--short', '--', 'purple' ), status );
} );

test( 'rejects tag and tree object SHAs even when they resolve to valid theme content', ( t ) => {
	const f = fixture( t );
	f.git( 'tag', '-am', 'Prepared commit reference', 'prepared', f.commit );
	rejected( f, f.git( 'rev-parse', 'prepared' ), /SHA of a commit/ );
	rejected( f, f.git( 'rev-parse', 'HEAD^{tree}' ), /SHA of a commit/ );
} );

test( 'releasing the PR merge commit keeps the next changelog anchored to the release tag', ( t ) => {
	const f = fixture( t );
	f.git( 'tag', 'purple/1.2.3' );
	f.write( 'purple/feature.txt', 'First feature' );
	f.git( 'add', 'purple' );
	f.git( 'commit', '-qm', 'First feature (#44)' );
	f.git( 'checkout', '-qb', 'codex/prepare-purple-1.2.4' );
	const prepare = ( version ) => spawnSync( process.execPath, [ prepareScript, version ], { cwd: f.root, encoding: 'utf8' } );
	assert.equal( prepare( '1.2.4' ).status, 0 );
	f.git( 'add', 'purple' );
	f.git( 'commit', '-qm', 'Prepare Purple 1.2.4' );
	const branchTip = f.git( 'rev-parse', 'HEAD' );
	f.git( 'checkout', '-q', 'trunk' );
	f.git( 'merge', '--no-ff', 'codex/prepare-purple-1.2.4', '-m', 'Merge pull request #45 from example/prepare', '-m', 'Prepare Purple 1.2.4' );
	const mergeCommit = f.git( 'rev-parse', 'HEAD' );
	assert.notEqual( mergeCommit, branchTip );
	// GitHub's merged event supplies this merge commit, not the PR branch tip.
	const released = f.run( mergeCommit );
	assert.equal( released.status, 0, released.stderr );
	const archive = path.join( f.output, 'purple-1.2.4.zip' );
	assert.equal( execFileSync( 'unzip', [ '-p', archive, 'purple/readme.txt' ], { encoding: 'utf8' } ), `${ f.git( 'show', `${ mergeCommit }:purple/readme.txt` ) }\n` );
	f.git( 'tag', 'purple/1.2.4', mergeCommit );
	f.write( 'purple/next.txt', 'Next feature' );
	f.git( 'add', 'purple' );
	f.git( 'commit', '-qm', 'Next feature (#46)' );
	const next = prepare( '1.2.5' );
	assert.equal( next.status, 0, next.stderr );
	assert.match( next.stdout, /from purple\/1.2.4 with 1 PRs/ );
	const nextReadme = fs.readFileSync( path.join( f.root, 'purple/readme.txt' ), 'utf8' );
	assert.equal( nextReadme.split( '= 1.2.5 =' )[ 1 ].split( '= 1.2.4 =' )[ 0 ].trim(), '* Next feature (#46)' );
} );

for ( const [ name, options ] of Object.entries( {
	mismatch: { text: readme.replace( 'Stable tag: 1.2.3', 'Stable tag: 1.2.4' ) },
	invalid: { style: stylesheet.replace( '1.2.3', '01.2.3' ) },
	missing: { style: stylesheet.replace( 'Version:', 'Other:' ) },
	duplicate: { text: `Stable tag: 1.2.3\n${ readme }` },
} ) ) {
	test( `rejects ${ name } version metadata`, ( t ) => {
		const f = fixture( t, options );
		rejected( f, f.commit, /same X.Y.Z version/ );
	} );
}

test( 'rejects existing tags without changing their targets', ( t ) => {
	const f = fixture( t );
	f.git( 'tag', 'purple/1.2.3', f.commit );
	rejected( f, f.commit, /already exists/ );
	assert.equal( f.git( 'rev-parse', 'purple/1.2.3' ), f.commit );
	f.git( 'tag', '-d', 'purple/1.2.3' );
	f.git( 'tag', '-am', 'Existing release', 'purple/1.2.3', f.commit );
	const tagObject = f.git( 'rev-parse', 'purple/1.2.3' );
	rejected( f, f.commit, /already exists/ );
	assert.equal( f.git( 'rev-parse', 'purple/1.2.3' ), tagObject );
} );
