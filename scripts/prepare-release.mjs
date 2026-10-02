import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { readChangelog, readReleaseVersion, versionPattern } from './release-utils.mjs';

const version = process.argv[ 2 ];
const git = ( ...args ) => execFileSync( 'git', args, { encoding: 'utf8' } ).trim();

function fail( message ) {
	throw new Error( message );
}

function compareVersions( left, right ) {
	const a = left.split( '.' ).map( BigInt );
	const b = right.split( '.' ).map( BigInt );
	for ( let index = 0; index < 3; index++ ) {
		if ( a[ index ] !== b[ index ] ) {
			return a[ index ] > b[ index ] ? 1 : -1;
		}
	}
	return 0;
}

if ( ! versionPattern.test( version ?? '' ) ) {
	fail( 'Supply a version in X.Y.Z format, for example: node scripts/prepare-release.mjs 0.0.3' );
}

const stylesheetPath = 'purple/style.css';
const readmePath = 'purple/readme.txt';
const stylesheet = fs.readFileSync( stylesheetPath, 'utf8' );
const readme = fs.readFileSync( readmePath, 'utf8' );
const currentVersion = readReleaseVersion( stylesheet, readme );

if ( compareVersions( version, currentVersion ) <= 0 ) {
	fail( `The new version must be greater than ${ currentVersion }.` );
}
if ( git( 'tag', '--list', `purple/${ version }` ) ) {
	fail( `Tag purple/${ version } already exists.` );
}

// Follow trunk's history so tags on unmerged or side branches are not selected.
const previousTag = git( 'describe', '--tags', '--first-parent', '--match', 'purple/[0-9]*', '--abbrev=0', 'HEAD' );
const previousVersion = previousTag.replace( /^purple\//, '' );
if ( ! versionPattern.test( previousVersion ) || compareVersions( version, previousVersion ) <= 0 ) {
	fail( `The new version must be greater than the previous release (${ previousTag }).` );
}

// Standard GitHub merge commits store the PR title in the first body line.
// Squash merges store it in the subject, followed by the PR number.
const history = git( 'log', '--first-parent', '--reverse', '--format=%s%x1f%b%x1e', `${ previousTag }..HEAD` );
const entries = [];
for ( const record of history.split( '\x1e' ) ) {
	const [ subject, body = '' ] = record.trim().split( '\x1f' );
	const merge = subject.match( /^Merge pull request #(\d+) from / );
	const squash = subject.match( /^(.+) \(#(\d+)\)$/ );
	if ( merge ) {
		const title = body.trim().split( '\n' )[ 0 ].trim();
		if ( ! title ) {
			fail( `Missing title for PR #${ merge[ 1 ] }.` );
		}
		entries.push( `* ${ title } (#${ merge[ 1 ] })` );
	} else if ( squash ) {
		entries.push( `* ${ squash[ 1 ] } (#${ squash[ 2 ] })` );
	}
}
if ( entries.length === 0 ) {
	fail( `No merged PR titles found since ${ previousTag }.` );
}

const { offset, newline, sections } = readChangelog( readme );
if ( sections.some( ( section ) => section.version === version ) ) {
	fail( `readme.txt already has a changelog for ${ version }.` );
}

const changelog = `= ${ version } =${ newline }${ entries.join( newline ) }`;
const updatedReadme = ( readme.slice( 0, offset ) + newline + changelog + newline + readme.slice( offset ) )
	.replace( /^(Stable tag:[ \t]*)\S+([ \t]*\r?)$/m, ( match, prefix, suffix ) => `${ prefix }${ version }${ suffix }` );

fs.writeFileSync( stylesheetPath, stylesheet.replace( /^(Version:[ \t]*)\S+([ \t]*\r?)$/m, ( match, prefix, suffix ) => `${ prefix }${ version }${ suffix }` ) );
fs.writeFileSync( readmePath, updatedReadme );
console.log( `Prepared Purple ${ version } from ${ previousTag } with ${ entries.length } PRs.` );
