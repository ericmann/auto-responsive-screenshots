/*
* Generate a series of screenshots at different viewport widths based on a file of URLs
*
* Required: A line separated list of URLs to capture screenshots for in a file titled 'urls' in this directory.
*
* Generated screenshots will be in a folder titled screenshots/{date}/
* 
* Usage:
* $ casperjs screenshots.js
*/

/**
 * Module dependencies.
 */
var fs = require( 'fs' ),
    lineReader = require( 'line-by-line' ),
    NPromise = require( 'promise' ),
    pjson = require( './package.json' ),
    print = require( 'winston' ).cli(),
    spinner = require( 'cli-spinner' ).Spinner,
    program = require( 'commander' ),
    pageres = require( 'pageres' );

/**
 * Default variables.
 */
var opts = {
	viewports: ['320x2000', '768x2000', '1024x2000', '1280x2000' ],
	batch_size: 5
};

/**
 * Pad dates so they are consistent
 *
 * @param  {Number} number
 *
 * @return {Number} padded integer
 */
function pad( number ) {
    var r = String( number );
    if ( r.length === 1 ) {
        r = '0' + r;
    }
    return r;
}

/**
 * Get the screenshots for a specific URL and store them in the specified directory.
 *
 * @param {String} url
 * @param {String} output_dir
 */
function get_screenshots( url, output_dir ) {
    return new NPromise( function( fulfill, reject ) {
        var page = new pageres( { delay: 2 } )
            .src( url, opts.viewports, {crop: true } )
            .dest( output_dir );

        page.run( function( err ) {
            if ( err ) {
                reject( err );
            }

            fulfill();
        } );
    } );
}

/**
 * Attempt to generate a URL file for a given basepath.
 *
 * @param {String} baseurl
 * @param {Object} options
 */
function scanurl( baseurl, options ) {
    if ( undefined === options.output ) {
        options.output = 'urls';
    }

    print.log( 'info', 'Scanning for page URLs on \'%s\'.', baseurl );

    print.log( 'info', 'Scan complete. URLs logged to file: \'%s\'.', options.output );
}

/**
 * Process a batch of URLs.
 *
 * @param {Array}  urls
 * @param {String} output
 *
 * @returns {NPromise}
 */
function process_batch( urls, output ) {
	return new NPromise( function( fulfill, reject ) {
		var promises = [];

		for( var i = 0; i < urls.length; i ++ ) {
			var url = urls[ i ];
			promises.push( get_screenshots( url, output ) );
		}

		var spin = new spinner( 'Processing batch ... %s' );
		spin.setSpinnerString( '|/-\\' );
		spin.start();

		NPromise.all( promises ).done( function() {
			spin.stop( true );

			fulfill();
		} );
	} );
}

/**
 * Process a urls file to create screenshots.
 *
 * @param {String} file
 * @param {Object} options
 */
function process_file( file, options ) {
    if ( undefined === options.output ) {
        options.output = 'screenshots';
    }

    print.log( 'info', 'Processing screenshots for all URLS in file: \'%s\'.', file );

    var reader = new lineReader( file ),
	    urls = [];

	var readPromise = new NPromise( function ( fulfill, reject ) {
		reader.on( 'line', function ( url ) {
			print.log( 'info', 'Queueing screenshots for: %s', url );

			urls.push( url );
		} );

		reader.on( 'end', function () {
			print.log( 'info', 'Finished queueing from file: \'%s\'.', file );

			var batch_no = 1;

			function next_batch() {
				print.log( 'info', 'Processing batch #%d of %d paths.', batch_no, opts.batch_size );

				return new NPromise( function( innerfulfill, reject ) {
					if ( urls.length <= 0 ) {
						fulfill();
					}

					var batch = urls.splice( 0, opts.batch_size );

					process_batch( batch, options.output ).done( function() {
						if ( urls.length <= 0 ) {
							innerfulfill();
						} else {
							batch_no++;
							next_batch();
						}
					} );
				} );
			}

			next_batch().done( fulfill );
		} );

	} );

	readPromise.done( function() {
		print.log( 'info', 'Screenshots saved to the \'%s\' directory.', options.output );
		process.exit( 0 );
	} );



}

/**
 * The core application
 */
program.version( pjson.version );

/**
 * The scan command to build a `urls` file.
 */
/*program
    .command( 'scan <baseurl>' )
    .option( '-o, --output [file]', 'Define an output file other than \'urls\'' )
    .action( scanurl );*/

/**
 * The process command to parse the `urls` file.
 */
program
    .command( 'process <file>' )
    .option( '-o, --output [directory]', 'Define an output directory other than \'screenshots\'' )
    .action( process_file );

/**
 * Run the application and parse command line arguments.
 */
program.parse( process.argv );