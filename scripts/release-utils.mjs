// Shared rules for the metadata passed from preparation to publishing.
export const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function readReleaseVersion( stylesheet, readme ) {
	const versions = [ ...stylesheet.matchAll( /^Version:[ \t]*(\S+)[ \t]*\r?$/gm ) ];
	const stableTags = [ ...readme.matchAll( /^Stable tag:[ \t]*(\S+)[ \t]*\r?$/gm ) ];
	const version = versions[ 0 ]?.[ 1 ];
	if ( versions.length !== 1 || stableTags.length !== 1 ||
		! versionPattern.test( version ?? '' ) || version !== stableTags[ 0 ][ 1 ] ) {
		throw new Error( 'style.css Version and readme.txt Stable tag must contain the same X.Y.Z version.' );
	}
	return version;
}

export function readChangelog( readme ) {
	const headings = [ ...readme.matchAll( /^== Changelog ==[ \t]*(\r?\n|$)/gm ) ];
	if ( headings.length !== 1 ) {
		throw new Error( 'readme.txt must contain exactly one Changelog heading.' );
	}
	const offset = headings[ 0 ].index + headings[ 0 ][ 0 ].length;
	const newline = headings[ 0 ][ 1 ] || '\n';
	const body = readme.slice( offset ).replace( /\r\n/g, '\n' ).split( /^== .+ ==[ \t]*$/m )[ 0 ];
	const sections = [ ...body.matchAll( /^= (.+) =[ \t]*(?:\n|$)([\s\S]*?)(?=^= .+ =[ \t]*$|(?![\s\S]))/gm ) ]
		.map( ( section ) => ( { version: section[ 1 ], notes: section[ 2 ].trim() } ) );
	return { offset, newline, sections };
}
