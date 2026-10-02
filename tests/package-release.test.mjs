import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath( new URL( '../scripts/package-release.mjs', import.meta.url ) );
const prepareScript = fileURLToPath( new URL( '../scripts/prepare-release.mjs', import.meta.url ) );
const notes = '* Add a storefront pattern (#42)\n* Fix café styling (#43)';
const stylesheet = '/*\nTheme Name: Purple\nVersion: 1.2.3\n*/\n';
const readme = `=== Purple ===\nStable tag: 1.2.3\n\n== Changelog ==\n\n= 1.2.3 =\n${ notes }\n\n= 1.2.2 =\n* Older change\n\n== Copyright ==\nLicense text\n`;

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
	const files = f.git( 'ls-tree', '-r', '--name-only', f.commit, 'purple/' ).split( '\n' );
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
	assert.deepEqual( entries.filter( ( entry ) => ! entry.endsWith( '/' ) ).sort(), files.sort() );
	assert.ok( entries.every( ( entry ) => entry.startsWith( 'purple/' ) ) );
	for ( const file of files ) {
		assert.deepEqual( execFileSync( 'unzip', [ '-p', archive, file ] ), execFileSync( 'git', [ 'show', `${ f.commit }:${ file }` ], { cwd: f.root } ) );
	}
	assert.equal( f.git( 'tag', '--list' ), '', 'Packaging must not create tags.' );
	assert.equal( f.git( 'status', '--short', '--', 'purple' ), status );
} );

test( 'accepts CRLF metadata and stops the last changelog entry before the next readme heading', ( t ) => {
	const f = fixture( t, {
		style: stylesheet.replaceAll( '\n', '\r\n' ),
		text: readme.replace( '= 1.2.2 =\n* Older change\n\n', '' ).replaceAll( '\n', '\r\n' ),
	} );
	assert.equal( f.run().status, 0 );
	assert.equal( fs.readFileSync( path.join( f.output, 'release-notes.md' ), 'utf8' ), `${ notes }\n` );
} );

for ( const [ name, newline ] of [ [ 'LF', '\n' ], [ 'CRLF', '\r\n' ] ] ) {
	test( `packages the preparation script's output with ${ name } files`, ( t ) => {
		const f = fixture( t, {
			style: stylesheet.replaceAll( '\n', newline ),
			text: readme.replaceAll( '\n', newline ),
		} );
		f.git( 'tag', 'purple/1.2.3' );
		f.write( 'purple/assets/new.txt', 'New release asset' );
		f.git( 'add', '.' );
		f.git( 'commit', '-qm', 'Add a release asset (#44)' );
		const prepared = spawnSync( process.execPath, [ prepareScript, '1.2.4' ], { cwd: f.root, encoding: 'utf8' } );
		assert.equal( prepared.status, 0, prepared.stderr );
		const preparedStyle = fs.readFileSync( path.join( f.root, 'purple/style.css' ), 'utf8' );
		const preparedReadme = fs.readFileSync( path.join( f.root, 'purple/readme.txt' ), 'utf8' );
		const expectedNotes = '* Add a release asset (#44)';
		assert.equal( preparedStyle, stylesheet.replace( '1.2.3', '1.2.4' ).replaceAll( '\n', newline ) );
		assert.equal( preparedReadme, readme
			.replace( 'Stable tag: 1.2.3', 'Stable tag: 1.2.4' )
			.replace( '== Changelog ==\n', `== Changelog ==\n\n= 1.2.4 =\n${ expectedNotes }\n` )
			.replaceAll( '\n', newline ) );
		f.git( 'add', '.' );
		f.git( 'commit', '-qm', 'Prepare Purple 1.2.4' );
		const releaseCommit = f.git( 'rev-parse', 'HEAD' );
		f.git( 'update-ref', 'refs/remotes/origin/trunk', releaseCommit );
		const packaged = f.run( releaseCommit );
		assert.equal( packaged.status, 0, packaged.stderr );
		assert.equal( fs.readFileSync( path.join( f.output, 'release-notes.md' ), 'utf8' ), `${ expectedNotes }\n` );
		const archive = path.join( f.output, 'purple-1.2.4.zip' );
		execFileSync( 'unzip', [ '-t', archive ] );
		assert.equal( execFileSync( 'unzip', [ '-p', archive, 'purple/readme.txt' ], { encoding: 'utf8' } ), preparedReadme );
		assert.equal( execFileSync( 'unzip', [ '-p', archive, 'purple/style.css' ], { encoding: 'utf8' } ), preparedStyle );
		assert.equal( execFileSync( 'unzip', [ '-p', archive, 'purple/assets/new.txt' ], { encoding: 'utf8' } ), 'New release asset' );
		assert.equal( f.git( 'tag', '--list' ), 'purple/1.2.3' );
	} );
}

test( 'rejects branch names, short SHAs, option-like input, and nonexistent commits', ( t ) => {
	const f = fixture( t );
	for ( const sha of [ 'trunk', f.commit.slice( 0, 7 ), '--output=bad' ] ) {
		rejected( f, sha, /full commit SHA/ );
	}
	rejected( f, '0'.repeat( 40 ), /could not get object info/ );
} );

test( 'rejects tag and tree object SHAs even when they resolve to valid theme content', ( t ) => {
	const f = fixture( t );
	f.git( 'tag', '-am', 'Prepared commit reference', 'prepared', f.commit );
	rejected( f, f.git( 'rev-parse', 'prepared' ), /SHA of a commit/ );
	rejected( f, f.git( 'rev-parse', 'HEAD^{tree}' ), /SHA of a commit/ );
} );

test( 'rejects a prepared commit outside trunk history', ( t ) => {
	const f = fixture( t );
	f.git( 'checkout', '-qb', 'unmerged' );
	f.write( 'purple/new.txt', 'Unmerged change' );
	f.git( 'add', '.' );
	f.git( 'commit', '-qm', 'Unmerged release' );
	rejected( f, f.git( 'rev-parse', 'HEAD' ), /must belong to origin\/trunk history/ );
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

for ( const [ name, text ] of Object.entries( {
	missing: readme.replace( '= 1.2.3 =', '= 1.2.0 =' ),
	empty: readme.replace( notes, '  ' ),
	duplicate: readme.replace( '= 1.2.2 =', '= 1.2.3 =' ),
	outside: readme.replace( '== Changelog ==', '== Description ==' ) + '\n== Changelog ==\n= 1.2.2 =\n* Old\n',
	heading: readme + '\n== Changelog ==\n',
} ) ) {
	test( `rejects ${ name } changelog`, ( t ) => {
		const f = fixture( t, { text } );
		rejected( f, f.commit, /changelog section|Changelog heading/ );
	} );
}

test( 'rejects existing lightweight and annotated tags without changing their targets', ( t ) => {
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
