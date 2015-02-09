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
    program = require( 'commander' ),
    pageres = require( 'pageres' );

/**
 * Default variables.
 */
var opts = {
    url: 'https://eamann.com',
    now: new Date(),
    viewports: ['320x2000', '768x2000', '1024x2000', '1280x2000' ]
};
opts.dateTime = opts.now.getFullYear() + pad( opts.now.getMonth() + 1 ) + pad( opts.now.getDate() ) + '-' + pad( opts.now.getHours() ) + pad( opts.now.getMinutes() ) + pad( opts.now.getSeconds() );

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
 * Process a urls file to create screenshots.
 *
 * @param {String} file
 * @param {Object} options
 */
function process_file( file, options ) {
    if ( undefined === options.output ) {
        options.output = 'screenshots';
    }

    print.log( 'info', 'Processing screenshots for all URLS in the \'%s\' file.', file );

    var reader = new lineReader( file ),
        promises = [];

    reader.on( 'line', function( url ) {
        print.log( 'info', 'Queueing screenshots for: %s', url );

        promises.push( get_screenshots( url, options.output ) );
    } );

    reader.on( 'end', function() {
        print.log( 'info', 'Finished processing the \'%s\' file.', file );

        NPromise.all( promises ).done( function() {
            print.log( 'info', 'Screenshots saved to the \'%s\' directory.', options.output );
            process.exit( 0 );
        } );
    } );
}

/**
 * The core application
 */
program.version( pjson.version );

/**
 * The scan command to build a `urls` file.
 */
program
    .command( 'scan <baseurl>' )
    .option( '-o, --output [file]', 'Define an output file other than \'urls\'' )
    .action( scanurl );

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





/**
 * Gets a series of screenshots for a given URL
 * 
 * @param  string url a URL
 */
function getScreenshots(url) {

  casper.each(viewports, function(casper, viewport) {
    this.then(function() {
      this.viewport(viewport.viewport.width, viewport.viewport.height);
    });
    this.thenOpen(url, wait( this ));
    this.then(function(){
      var screenshotPath = 'screenshots/' + screenshotDateTime + '/' + escapeUrlForDirectory(url) + '-' + viewport.viewport.width + 'x' + viewport.viewport.height + '.png';
      this.echo('Screenshot for ' + url + ' (' + viewport.viewport.width + 'x' + viewport.viewport.height + ')', 'info');
      // this.capture(screenshotPath, {
      //     top: 0,
      //     left: 0,
      //     width: viewport.viewport.width,
      //     height: viewport.viewport.height
      // });
      this.captureSelector(screenshotPath, 'html');
    });
  });
}

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
 * Remove slashes and a leading http:// from URls so they are suitable for filenames
 *
 * @param {String} str
 *
 * @return {String} escaped string
 */
function escapeUrlForDirectory( str ) {
    return str.replace( /^http[s]?:\/\/(?:w{3}.)?/, '' ).replace( /\//g, '-' ).replace( /-$/, '' );
}
