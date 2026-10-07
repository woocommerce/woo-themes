import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// The official API includes the latest maintenance release of older series.
export const endpoint = 'https://api.wordpress.org/core/version-check/1.7/';

export function resolveVersions( data ) {
	if ( ! Array.isArray( data.offers ) ) {
		throw new Error( 'WordPress API did not return release offers.' );
	}
	const stable = data.offers.filter( ( offer ) =>
		[ 'upgrade', 'autoupdate' ].includes( offer.response ) &&
		/^\d+\.\d+(?:\.\d+)?$/.test( offer.version )
	);
	const compare = ( a, b ) => {
		const left = a.split( '.' ).map( Number );
		const right = b.split( '.' ).map( Number );
		for ( let index = 0; index < 3; index++ ) {
			const difference = ( left[ index ] ?? 0 ) - ( right[ index ] ?? 0 );
			if ( difference ) return difference;
		}
		return 0;
	};
	const versions = [ ...new Set( stable.map( ( offer ) => offer.version ) ) ]
		.sort( ( a, b ) => compare( b, a ) );
	const series = ( version ) => version.split( '.' ).slice( 0, 2 ).join( '.' );
	const latest = versions[ 0 ];
	const previous = versions.find( ( version ) => series( version ) !== series( latest ) );
	if ( ! latest || ! previous || ! stable.some( ( offer ) =>
		offer.response === 'upgrade' && offer.version === latest
	) ) {
		throw new Error( 'Could not resolve latest stable and preceding WordPress release series.' );
	}
	return { include: [
		{ label: `Latest stable (${ latest })`, version: latest },
		{ label: `Previous release series (${ previous })`, version: previous },
	].map( ( target ) => ( {
		...target,
		core: `https://wordpress.org/wordpress-${ target.version }.zip`,
	} ) ) };
}

if ( process.argv[ 1 ] && import.meta.url === pathToFileURL( process.argv[ 1 ] ).href ) {
	const response = await fetch( endpoint, { signal: AbortSignal.timeout( 30_000 ) } );
	if ( ! response.ok ) throw new Error( `WordPress API returned HTTP ${ response.status }.` );
	const matrix = JSON.stringify( resolveVersions( await response.json() ) );
	console.log( matrix );
	if ( process.env.GITHUB_OUTPUT ) {
		appendFileSync( process.env.GITHUB_OUTPUT, `matrix=${ matrix }\n` );
	}
}
