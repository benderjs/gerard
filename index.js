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
 * @param  {String}   dir               Directory to be read
 * @param  {Object}   [options]         Configuration options
 * @param  {String}   [options.ignore]  Ignore file pattern, supports globstar matching
 * @param  {Boolean}  [options.stats]   Return file objects containing file statistics
 * @param  {Function} callback          Function called when done or error occured
 */
function gerard( dir, options, callback ) {
	var results = [],
		count = 0;

	if ( typeof options == 'function' ) {
		callback = options;
		options = {};
	}

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, results );
		}
	}

	fs.readdir( dir, function( err, files ) {
		if ( err ) {
			return callback( err );
		}

		if ( !( count = files.length ) ) {
			return callback( null, results );
		}

		files.forEach( function( file ) {
			var name = file;

			file = path.join( dir, file );

			if ( options.ignore && minimatch( file, options.ignore ) ) {
				return decreaseCounter();
			}

			fs.stat( file, function( err, stats ) {
				if ( err ) {
					return callback( err );
				}

				if ( stats.isDirectory() ) {
					gerard( file, options, function( err, files ) {
						if ( err ) {
							return callback( err );
						}

						results = results.concat( files );

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
