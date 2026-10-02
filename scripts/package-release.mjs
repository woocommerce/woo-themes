import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Read and archive committed files only; the working tree is never release input.
const [ commit, outputDirectory ] = process.argv.slice( 2 );
const git = ( ...args ) => execFileSync( 'git', args, { encoding: 'utf8' } ).trim();

if ( ! /^[a-f0-9]{40}$/.test( commit ?? '' ) || ! outputDirectory ) {
	throw new Error( 'Usage: node scripts/package-release.mjs <full commit SHA> <output directory>' );
}
if ( git( 'cat-file', '-t', commit ) !== 'commit' ) {
	throw new Error( 'Supply the SHA of a commit, not a tag or tree object.' );
}
try {
	git( 'merge-base', '--is-ancestor', commit, 'refs/remotes/origin/trunk' );
} catch {
	throw new Error( 'The selected commit must belong to origin/trunk history. Fetch trunk first.' );
}

const stylesheet = git( 'show', `${ commit }:purple/style.css` );
const readme = git( 'show', `${ commit }:purple/readme.txt` ).replace( /\r\n/g, '\n' );
const versions = [ ...stylesheet.matchAll( /^Version:[ \t]*(\S+)[ \t]*\r?$/gm ) ];
const stableTags = [ ...readme.matchAll( /^Stable tag:[ \t]*(\S+)[ \t]*$/gm ) ];
const version = versions[ 0 ]?.[ 1 ];
if ( versions.length !== 1 || stableTags.length !== 1 ||
	! /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test( version ?? '' ) ||
	version !== stableTags[ 0 ][ 1 ] ) {
	throw new Error( 'style.css Version and readme.txt Stable tag must contain the same X.Y.Z version.' );
}

const tag = `purple/${ version }`;
if ( git( 'tag', '--list', tag ) ) {
	throw new Error( `Tag ${ tag } already exists. Inspect the existing release before retrying; tags are never replaced.` );
}

const changelogs = readme.split( /^== Changelog ==[ \t]*$/m );
if ( changelogs.length !== 2 ) {
	throw new Error( 'readme.txt must contain exactly one Changelog heading.' );
}
const changelog = changelogs[ 1 ].split( /^== .+ ==[ \t]*$/m )[ 0 ];
const sections = [ ...changelog.matchAll( /^= (.+) =[ \t]*\n([\s\S]*?)(?=^= .+ =[ \t]*$|(?![\s\S]))/gm ) ];
const matches = sections.filter( ( section ) => section[ 1 ] === version );
if ( matches.length !== 1 || ! matches[ 0 ][ 2 ].trim() ) {
	throw new Error( `readme.txt must contain exactly one nonempty changelog section for ${ version }.` );
}
const notes = `${ matches[ 0 ][ 2 ].trim() }\n`;

// These are the entry points required by Purple's block theme package.
git( 'cat-file', '-e', `${ commit }:purple/theme.json` );
git( 'cat-file', '-e', `${ commit }:purple/templates/index.html` );
fs.mkdirSync( outputDirectory, { recursive: true } );
const archive = path.resolve( outputDirectory, `purple-${ version }.zip` );
const notesFile = path.resolve( outputDirectory, 'release-notes.md' );
git( 'archive', '--format=zip', `--output=${ archive }`, commit, 'purple/' );
fs.writeFileSync( notesFile, notes );

if ( process.env.GITHUB_OUTPUT ) {
	fs.appendFileSync( process.env.GITHUB_OUTPUT, `version=${ version }\ntag=${ tag }\n` );
}
console.log( `Packaged ${ tag } from ${ commit }: ${ archive }` );
console.log( `Release notes: ${ notesFile }` );
