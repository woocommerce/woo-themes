import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readChangelog, readReleaseVersion } from './release-utils.mjs';

// Read and archive committed files only; the working tree is never release input.
const [ commit, outputDirectory ] = process.argv.slice( 2 );
const git = ( ...args ) => execFileSync( 'git', args, { encoding: 'utf8' } ).trim();

if ( ! /^[a-f0-9]{40}$/.test( commit ?? '' ) || ! outputDirectory ) {
	throw new Error( 'Usage: node scripts/release-purple.mjs <full commit SHA> <output directory>' );
}
if ( git( 'cat-file', '-t', commit ) !== 'commit' ) {
	throw new Error( 'Supply the SHA of a commit, not a tag or tree object.' );
}

const stylesheet = git( 'show', `${ commit }:purple/style.css` );
const readme = git( 'show', `${ commit }:purple/readme.txt` );
const version = readReleaseVersion( stylesheet, readme );

const tag = `purple/${ version }`;
if ( git( 'tag', '--list', tag ) ) {
	throw new Error( `Tag ${ tag } already exists. Inspect the existing release before retrying; tags are never replaced.` );
}

const { sections } = readChangelog( readme );
const matches = sections.filter( ( section ) => section.version === version );
if ( matches.length !== 1 || ! matches[ 0 ].notes ) {
	throw new Error( `readme.txt must contain exactly one nonempty changelog section for ${ version }.` );
}
const notes = `${ matches[ 0 ].notes }\n`;

fs.mkdirSync( outputDirectory, { recursive: true } );
const archive = path.resolve( outputDirectory, `purple-${ version }.zip` );
const notesFile = path.resolve( outputDirectory, 'release-notes.md' );
git( 'archive', '--format=zip', `--output=${ archive }`, commit, 'purple/' );
fs.writeFileSync( notesFile, notes );

if ( process.env.GITHUB_OUTPUT ) {
	fs.appendFileSync( process.env.GITHUB_OUTPUT, `version=${ version }\ntag=${ tag }\n` );
}
console.log( `Created ZIP for ${ tag } from ${ commit }: ${ archive }` );
console.log( `Release notes: ${ notesFile }` );
