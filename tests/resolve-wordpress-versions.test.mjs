import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVersions } from '../scripts/resolve-wordpress-versions.mjs';

const offers = ( versions ) => ( { offers: versions.map( ( version, index ) => ( {
	version, response: index === 0 ? 'upgrade' : 'autoupdate',
} ) ) } );

test( 'uses newest patch in preceding series, ignoring duplicates and prereleases', () => {
	const data = offers( [ '7.1.3', '7.1.3', '7.0.2', '6.9.10', '7.0.7', '7.2-beta1' ] );
	const matrix = resolveVersions( data );
	assert.deepEqual( matrix.include.map( ( target ) => target.version ), [ '7.1.3', '7.0.7' ] );
	assert.equal( matrix.include[ 1 ].core, 'https://wordpress.org/wordpress-7.0.7.zip' );
} );

test( 'rolls forward and handles first-component boundaries and numeric ordering', () => {
	for ( const [ versions, expected ] of [
		[ [ '7.2', '7.1.10', '7.1.9' ], [ '7.2', '7.1.10' ] ],
		[ [ '7.0', '6.9.10', '6.8.11' ], [ '7.0', '6.9.10' ] ],
		[ [ '6.10.1', '6.9.11', '6.9.9' ], [ '6.10.1', '6.9.11' ] ],
	] ) {
		assert.deepEqual( resolveVersions( offers( versions ) ).include.map( ( target ) => target.version ), expected );
	}
} );

test( 'fails closed for missing series, malformed data, or missing latest stable offer', () => {
	for ( const data of [ {}, offers( [] ), offers( [ '7.1.3' ] ), offers( [ '7.2-RC1', '7.1.3', '7.0.7' ] ) ] ) {
		assert.throws( () => resolveVersions( data ) );
	}
} );
