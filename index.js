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
 * @param  {String}        dir                     Directory to be read
 * @param  {Object}        [options]               Configuration options
 * @param  {String|RegExp} [options.ignore]        Ignore file pattern, supports globstar matching
 * @param  {Boolean}       [options.stats]         Return file objects containing file statistics
 * @param  {Boolean}       [options.stopOnErrors]  Stop reading the directory on first error
 * @param  {Function}      callback                Function called when done or error occured
 */
function gerard( dir, options, callback ) {
	// invalid argument count
	if ( arguments.length < 2 ) {
		return callback( new Error( 'Invalid number arguments for Gerard specified.' ) );
	}

	// only callback function was given
	if ( typeof options == 'function' ) {
		callback = options;
		options = {};
	}

	// set the stopOnErrors option to default if no value specified
	options.stopOnErrors = ( options.stopOnErrors === undefined ) ? true : options.stopOnErrors;

	// invalid argument type
	if ( typeof dir != 'string' || typeof callback != 'function' ) {
		return callback( new Error( 'Invalid type of a path for Gerard specified.' ) );
	}

	// the given directory path contains patterns
	if ( isPattern( dir ) ) {
		readPattern( dir, options, callback );
	} else {
		readDir( dir, options, callback );
	}
}

module.exports = gerard;

function readPattern( dir, options, callback ) {
	var parts = path.normalize( dir ).split( path.sep ),
		results = [],
		paths = [],
		count = 0;

	function checkDone( err, files ) {
		count--;

		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( files );
		}

		if ( !count ) {
			callback( null, results );
		}
	}

	function readPart() {
		var part = parts.shift();

		if ( !part ) {
			return callback( null, results );
		}

		console.log( 'read part', part );

		if ( isPattern( part ) ) {
			if ( part === '**' ) {
				if ( parts.length ) {
					// TODO globstar in the middle, what now? (-_-;)
				} else {
					count = paths.length;

					console.log( paths );

					paths.forEach( function( pth ) {
						readDir( pth, checkDone );
					} );
				}
			} else {
				// wildcard in the middle of a path - update the paths list
				if ( parts.length ) {
					updatePaths( paths, part, function( result ) {
						paths = result;
						readPart();
					} );
					// wildcard at the end of a path
				} else {
					readAndFilterPaths( paths, part, function( result ) {
						results = result;
						readPart();
					} );
				}
			}
		} else {
			// add current part to the paths
			if ( parts.length ) {
				if ( paths.length ) {
					paths.forEach( function( pth, i ) {
						paths[ i ] = path.join( pth, part );
					} );
				} else {
					paths.push( part );
				}
			} else {

			}

			readPart();
		}
	}

	readPart();

	function updatePaths( paths, pattern, done ) {
		var count = 0,
			result = [];

		function checkDone() {
			count--;

			if ( !count ) {
				done( result );
			}
		}

		paths.forEach( function( pth ) {
			fs.readdir( pth, function( err, files ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				if ( err ) {
					return;
				}

				count = files.length;

				files.forEach( function( file ) {
					var name = file;

					file = path.join( pth, file );

					if (
						options.ignore &&
						( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
						( options.ignore instanceof RegExp && options.ignore.test( file ) )
					) {
						return checkDone();
					}

					fs.stat( file, function( err, stats ) {
						if ( err && options.stopOnErrors ) {
							return callback( err );
						}

						if ( err ) {
							return;
						}

						if ( stats.isDirectory() && minimatch( name, pattern ) ) {
							result.push( file );
						}

						checkDone();
					} );
				} );
			} );
		} );
	}

	function readAndFilterPaths( paths, pattern, done ) {
		var count = 0,
			result = [];


		function checkDone() {
			count--;

			if ( !count ) {
				done( result );
			}
		}

		paths.forEach( function( pth ) {
			fs.readdir( pth, function( err, files ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				if ( err ) {
					return;
				}

				count = files.length;

				files.forEach( function( file ) {
					var name = file;

					file = path.join( pth, file );

					if (
						options.ignore &&
						( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
						( options.ignore instanceof RegExp && options.ignore.test( file ) )
					) {
						return checkDone();
					}

					fs.stat( file, function( err, stats ) {
						if ( err && options.stopOnErrors ) {
							return callback( err );
						}

						if ( err ) {
							return;
						}

						if ( minimatch( name, pattern ) ) {
							result.push( file );
						}

						checkDone();
					} );
				} );
			} );
		} );
	}
}

function readDir( dir, options, callback ) {
	console.log( 'read dir', dir );
	var results = [],
		count = 0;

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

			// apply ignore filter
			if (
				options.ignore &&
				( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
				( options.ignore instanceof RegExp && options.ignore.test( file ) )
			) {
				console.log( 'ignore', file );
				return decreaseCounter();
			}

			fs.stat( file, function( err, stats ) {
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

// check if the given string is a pattern
function isPattern( str ) {
	return str.indexOf( '*' ) > -1;
}
