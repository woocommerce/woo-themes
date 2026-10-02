import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath( new URL( '../scripts/prepare-release.mjs', import.meta.url ) );

function fixture( t ) {
	const directory = fs.mkdtempSync( path.join( os.tmpdir(), 'purple-release-test-' ) );
	t.after( () => fs.rmSync( directory, { recursive: true, force: true } ) );
	const git = ( ...args ) => execFileSync( 'git', args, { cwd: directory, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
	const write = ( file, contents ) => fs.writeFileSync( path.join( directory, file ), contents );
	const read = ( file ) => fs.readFileSync( path.join( directory, file ), 'utf8' );
	const commit = ( subject, body ) => git( 'commit', '--allow-empty', '-m', subject, ...( body ? [ '-m', body ] : [] ) );
	const prepare = ( version ) => spawnSync( process.execPath, [ script, version ], { cwd: directory, encoding: 'utf8' } );
	git( 'init', '-b', 'trunk' );
	git( 'config', 'user.name', 'Release Test' );
	git( 'config', 'user.email', 'release-test@example.com' );
	fs.mkdirSync( path.join( directory, 'purple' ) );
	write( 'purple/style.css', '/*\nVersion: 0.0.2\n*/\nbody { color: purple; }\n' );
	write( 'purple/readme.txt', '=== Purple ===\nStable tag: 0.0.2\n\n== Changelog ==\n\n= 0.0.1 =\n* Initial release\n\n== Copyright ==\nKeep this.\n' );
	git( 'add', '.' );
	commit( 'Initial release (#1)' );
	git( 'tag', 'purple/0.0.1' );
	commit( 'Previous fix (#2)' );
	git( 'tag', 'purple/0.0.2' );
	return { git, write, read, commit, prepare };
}

test( 'updates only release metadata and collects merge and squash titles since the latest tag', ( t ) => {
	const repo = fixture( t );
	repo.commit( 'Merge pull request #3 from example/fix', 'Fix the cart\n\nAdditional details.' );
	repo.commit( 'Fix checkout ($5) (#4)' );
	repo.commit( 'Direct maintenance commit' );
	const result = repo.prepare( '0.0.3' );
	assert.equal( result.status, 0, result.stderr );
	assert.equal( repo.read( 'purple/style.css' ), '/*\nVersion: 0.0.3\n*/\nbody { color: purple; }\n' );
	assert.equal( repo.read( 'purple/readme.txt' ), '=== Purple ===\nStable tag: 0.0.3\n\n== Changelog ==\n\n= 0.0.3 =\n* Fix the cart (#3)\n* Fix checkout ($5) (#4)\n\n= 0.0.1 =\n* Initial release\n\n== Copyright ==\nKeep this.\n' );
	assert.equal( repo.git( 'diff', '--name-only' ), 'purple/readme.txt\npurple/style.css' );
	assert.equal( repo.git( 'tag', '--list' ), 'purple/0.0.1\npurple/0.0.2' );
} );

test( 'uses trunk history without duplicating PRs from side branches or selecting their tags', ( t ) => {
	const repo = fixture( t );
	repo.git( 'switch', '-c', 'feature' );
	repo.commit( 'Nested change (#99)' );
	repo.git( 'tag', 'purple/9.0.0' );
	repo.git( 'switch', 'trunk' );
	repo.git( 'merge', '--no-ff', 'feature', '-m', 'Merge pull request #5 from example/feature', '-m', 'Feature title' );
	const result = repo.prepare( '0.0.3' );
	assert.equal( result.status, 0, result.stderr );
	assert.match( result.stdout, /from purple\/0\.0\.2 with 1 PRs/ );
	assert.match( repo.read( 'purple/readme.txt' ), /\* Feature title \(#5\)/ );
	assert.doesNotMatch( repo.read( 'purple/readme.txt' ), /Nested change/ );
} );

test( 'rejects invalid, equal, and older versions without modifying files', ( t ) => {
	const repo = fixture( t );
	for ( const version of [ '', '1.2', '01.2.3', '1.2.3-beta', '0.0.2', '0.0.1', '0.0.3; echo bad' ] ) {
		assert.notEqual( repo.prepare( version ).status, 0, version );
		assert.equal( repo.git( 'status', '--porcelain' ), '', version );
	}
} );

test( 'rejects an existing target tag', ( t ) => {
	const repo = fixture( t );
	repo.git( 'tag', 'purple/0.0.3' );
	const result = repo.prepare( '0.0.3' );
	assert.notEqual( result.status, 0 );
	assert.match( result.stderr, /already exists/ );
	assert.equal( repo.git( 'status', '--porcelain' ), '' );
} );

test( 'fails before editing when the metadata or changelog cannot be safely updated', ( t ) => {
	const repo = fixture( t );
	repo.commit( 'A fix (#3)' );
	const original = repo.read( 'purple/readme.txt' );
	for ( const contents of [
		original.replace( 'Stable tag: 0.0.2', 'Stable tag: 0.0.1' ),
		`Stable tag: 0.0.2\n${ original }`,
		original.replace( '== Changelog ==', '== Missing ==' ),
		original.replace( '= 0.0.1 =', '= 0.0.3 =' ),
		original.replace( '== Copyright ==\nKeep this.\n', '= 0.0.3 =' ),
	] ) {
		repo.write( 'purple/readme.txt', contents );
		assert.notEqual( repo.prepare( '0.0.3' ).status, 0 );
		assert.equal( repo.read( 'purple/readme.txt' ), contents );
		assert.match( repo.read( 'purple/style.css' ), /Version: 0\.0\.2/ );
	}
} );

test( 'rejects missing release tags and empty PR histories without modifying files', ( t ) => {
	const repo = fixture( t );
	let result = repo.prepare( '0.0.3' );
	assert.notEqual( result.status, 0 );
	assert.match( result.stderr, /No merged PR titles/ );
	assert.equal( repo.git( 'status', '--porcelain' ), '' );
	repo.git( 'tag', '-d', 'purple/0.0.1', 'purple/0.0.2' );
	result = repo.prepare( '0.0.3' );
	assert.notEqual( result.status, 0 );
	assert.equal( repo.git( 'status', '--porcelain' ), '' );
} );
