import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';

const themeDirectory = 'purple';
const errors = [];

async function walk( directory ) {
	const entries = await fs.readdir( directory, { withFileTypes: true } );
	const files = await Promise.all(
		entries.map( ( entry ) => {
			const entryPath = path.join( directory, entry.name );
			return entry.isDirectory() ? walk( entryPath ) : entryPath;
		} )
	);

	return files.flat();
}

function report( file, message ) {
	errors.push( `${ file }: ${ message }` );
}

function readThemeHeader( stylesheet, name ) {
	const match = stylesheet.match(
		new RegExp( `^${ name.replace( /[.*+?^${}()|[\\]\\\\]/g, '\\$&' ) }:\\s*(.+)$`, 'mi' )
	);

	return match ? match[ 1 ].trim() : null;
}

function normalizeVersion( version ) {
	if ( ! /^\d+\.\d+(?:\.\d+)?$/.test( version ?? '' ) ) {
		return null;
	}

	return version.split( '.' ).map( Number );
}

function compareVersions( left, right ) {
	for ( let index = 0; index < 3; index++ ) {
		const difference = ( left[ index ] ?? 0 ) - ( right[ index ] ?? 0 );
		if ( difference !== 0 ) {
			return difference;
		}
	}

	return 0;
}

const files = await walk( themeDirectory );
const stylesheetPath = path.join( themeDirectory, 'style.css' );
const stylesheet = await fs.readFile( stylesheetPath, 'utf8' );
const requiredHeaders = [
	'Theme Name',
	'Author',
	'Description',
	'Requires at least',
	'Tested up to',
	'Requires PHP',
	'Version',
	'License',
	'License URI',
	'Text Domain',
];

for ( const header of requiredHeaders ) {
	if ( ! readThemeHeader( stylesheet, header ) ) {
		report( stylesheetPath, `missing required "${ header }" header` );
	}
}

const minimumWordPress = readThemeHeader( stylesheet, 'Requires at least' );
const testedWordPress = readThemeHeader( stylesheet, 'Tested up to' );
const minimumVersion = normalizeVersion( minimumWordPress );
const testedVersion = normalizeVersion( testedWordPress );

if ( ! minimumVersion ) {
	report( stylesheetPath, '"Requires at least" must be a valid WordPress version' );
}
if ( ! testedVersion ) {
	report( stylesheetPath, '"Tested up to" must be a valid WordPress version' );
} else if ( minimumVersion && compareVersions( testedVersion, minimumVersion ) < 0 ) {
	report( stylesheetPath, '"Tested up to" cannot be lower than "Requires at least"' );
}

const phpcsConfig = await fs.readFile(
	path.join( themeDirectory, 'phpcs.xml.dist' ),
	'utf8'
);
const configuredMinimum = phpcsConfig.match(
	/<config\s+name="minimum_wp_version"\s+value="([^"]+)"\s*\/>/
)?.[ 1 ];
if ( minimumWordPress && configuredMinimum !== minimumWordPress ) {
	report(
		path.join( themeDirectory, 'phpcs.xml.dist' ),
		`minimum_wp_version must match style.css (${ minimumWordPress })`
	);
}

const jsonFiles = files.filter( ( file ) => file.endsWith( '.json' ) );
const parsedJson = new Map();
for ( const file of jsonFiles ) {
	try {
		parsedJson.set( file, JSON.parse( await fs.readFile( file, 'utf8' ) ) );
	} catch ( error ) {
		report( file, `invalid JSON: ${ error.message }` );
	}
}

if ( minimumVersion ) {
	const schemaUrl = `https://schemas.wp.org/wp/${ minimumWordPress }/theme.json`;
	const schemaCache = new Map();
	const loadSchema = async ( url ) => {
		if ( schemaCache.has( url ) ) {
			return schemaCache.get( url );
		}

		const response = await fetch( url );
		if ( ! response.ok ) {
			throw new Error( `could not load ${ url }: ${ response.status }` );
		}

		const schema = await response.json();
		schemaCache.set( url, schema );
		return schema;
	};

	try {
		const schema = await loadSchema( schemaUrl );
		const ajv = new Ajv( { allErrors: true, loadSchema, strict: false } );
		const validate = await ajv.compileAsync( schema );
		const themeJsonFiles = jsonFiles.filter(
			( file ) =>
				file === path.join( themeDirectory, 'theme.json' ) ||
				file.startsWith( path.join( themeDirectory, 'styles' ) + path.sep )
		);

		for ( const file of themeJsonFiles ) {
			const contents = parsedJson.get( file );
			if ( contents && ! validate( contents ) ) {
				for ( const error of validate.errors ?? [] ) {
					report(
						file,
						`schema error at ${ error.instancePath || '/' }: ${ error.message }`
					);
				}
			}
		}
	} catch ( error ) {
		report( 'theme.json schema', error.message );
	}
}

const patternFiles = files.filter(
	( file ) =>
		file.startsWith( path.join( themeDirectory, 'patterns' ) + path.sep ) &&
		file.endsWith( '.php' )
);
const patternSlugs = new Map();

for ( const file of patternFiles ) {
	const contents = await fs.readFile( file, 'utf8' );
	const title = contents.match( /^\s*\*\s+Title:\s*(.+)$/m )?.[ 1 ].trim();
	const slug = contents.match( /^\s*\*\s+Slug:\s*(\S+)$/m )?.[ 1 ];

	if ( ! title ) {
		report( file, 'missing pattern Title header' );
	}
	if ( ! slug ) {
		report( file, 'missing pattern Slug header' );
		continue;
	}
	if ( patternSlugs.has( slug ) ) {
		report( file, `duplicates pattern slug declared by ${ patternSlugs.get( slug ) }` );
	} else {
		patternSlugs.set( slug, file );
	}
}

const referenceFiles = files.filter( ( file ) => /\.(?:html|php)$/.test( file ) );
for ( const file of referenceFiles ) {
	const contents = await fs.readFile( file, 'utf8' );
	for ( const match of contents.matchAll(
		/<!--\s+wp:pattern\s+\{"slug":"([^"]+)"/g
	) ) {
		const slug = match[ 1 ];
		if ( slug.startsWith( 'purple/' ) && ! patternSlugs.has( slug ) ) {
			report( file, `references missing pattern ${ slug }` );
		}
	}
}

const assetReferences = [];
for ( const file of files.filter( ( candidate ) =>
	/\.(?:css|html|js|json|php)$/.test( candidate )
) ) {
	const contents = await fs.readFile( file, 'utf8' );
	for ( const match of contents.matchAll( /file:\.\/(assets\/[^"'\s)]+)/g ) ) {
		assetReferences.push( { file, asset: match[ 1 ] } );
	}
	for ( const match of contents.matchAll( /\/(assets\/[^"'\s<)]+)/g ) ) {
		assetReferences.push( { file, asset: match[ 1 ] } );
	}
}

for ( const { file, asset } of assetReferences ) {
	const cleanAsset = asset.replace( /[?#].*$/, '' );
	try {
		await fs.access( path.join( themeDirectory, cleanAsset ) );
	} catch {
		report( file, `references missing asset ${ cleanAsset }` );
	}
}

if ( errors.length ) {
	for ( const error of errors ) {
		console.error( `::error::${ error }` );
	}
	process.exitCode = 1;
} else {
	console.log(
		`Validated ${ jsonFiles.length } JSON files, ${ patternFiles.length } patterns, and ${ assetReferences.length } asset references.`
	);
}
