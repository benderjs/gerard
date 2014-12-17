/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

var minimatch = require( 'minimatch' ),
	fs = require( 'graceful-fs' ),
	path = require( 'path' );

/**
 * Reads directory recursively
 * @param  {String}   dir                     Directory to be read
 * @param  {Object}   [options]               Configuration options
 * @param  {String}   [options.ignore]        Ignore file pattern, supports globstar matching
 * @param  {Boolean}  [options.stats]         Return file objects containing file statistics
 * @param  {Boolean}  [options.stopOnErrors]  Stop reading the directory on first error
 * @param  {Function} callback                Function called when done or error occured
 */
function gerard( dir, options, callback ) {
	var results = [],
		count = 0;

	if ( arguments.length < 2 ) {
		return callback( new Error( 'Invalid number arguments for Gerard specified.' ) );
	}

	if ( typeof options == 'function' ) {
		callback = options;
		options = {};
	}

	options.stopOnErrors = ( options.stopOnErrors === undefined ) ? true : options.stopOnErrors;

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, results );
		}
	}

	fs.readdir( dir, function( err, files ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !files || !( count = files.length ) ) {
			return callback( null, results );
		}

		files.forEach( function( file ) {
			var name = file;

			file = path.join( dir, file );

			if ( options.ignore && minimatch( file, options.ignore ) ) {
				return decreaseCounter();
			}

			fs.lstat( file, function( err, stats ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				if ( err ) {
					return decreaseCounter();
				}

				if ( stats.isDirectory() ) {
					gerard( file, options, function( err, files ) {
						if ( err && options.stopOnErrors ) {
							return callback( err );
						}

						if ( !err ) {
							results = results.concat( files );
						}

						decreaseCounter();
					} );
				} else {
					if ( options.stats ) {
						results.push( {
							name: name,
							dir: dir,
							path: file,
							stats: stats
						} );
					} else {
						results.push( file );
					}

					decreaseCounter();
				}
			} );
		} );
	} );
}

module.exports = gerard;
