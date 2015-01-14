/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

var Minimatch = require( 'minimatch' ).Minimatch,
	fs = require( 'graceful-fs' ),
	path = require( 'path' );

/**
 * Reads directory recursively
 * @param  {String}        path                    Path to a directory to be read or a pattern
 * @param  {Object}        [options]               Configuration options
 * @param  {String|RegExp} [options.ignore]        Ignore file pattern, supports globstar matching
 * @param  {Boolean}       [options.stats]         Return file objects containing file statistics
 * @param  {Boolean}       [options.stopOnErrors]  Stop reading the directory on first error
 * @param  {Function}      callback                Function called when done or error occured
 */
function gerard( path, options, callback ) {
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
	options.recursive = ( options.recursive === undefined ) ? true : options.recursive;

	// invalid argument type
	if ( typeof path != 'string' || typeof callback != 'function' ) {
		return callback( new Error( 'Invalid type of a path for Gerard specified.' ) );
	}

	// the given path is a pattern
	if ( isPattern( path ) ) {
		readPattern( path, options, callback );
	} else {
		readDir( path, options, callback );
	}
}

module.exports = gerard;

//
// private stuff
//
function readPattern( dir, options, callback ) {
	var parts = path.normalize( dir ).split( path.sep ),
		results = [],
		paths = [],
		count = 0;

	function checkDone( err, files ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( files );
		}

		count--;

		if ( !count ) {
			callback( null, results.sort() );
		}
	}

	function readPart() {
		var part = parts.shift();

		if ( !part ) {
			return callback( null, results.sort() );
		}

		// cloned options for further modifications
		var opt = clone( options );
		opt.filter = part;

		// add the CWD if the path starts with a pattern
		if ( isPattern( part ) && !paths.length ) {
			paths.push( '.' );
		}

		// globstar
		if ( part === '**' ) {
			opt.filter = dir;

			readAndFilterFiles( paths, opt, callback );
			// pattern in the middle of the path
		} else if ( parts.length && ( isPattern( part ) || paths.length ) ) {
			opt.dirOnly = true;
			readAndFilterPaths( paths, opt, function( err, result ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				paths = result;
				readPart();
			} );
			// in the middle of the path
		} else if ( parts.length ) {
			paths.push( part );
			readPart();
			// at the end of the path
		} else {
			readAndFilterPaths( paths, opt, function( err, result ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				results = result;
				readPart();
			} );
		}
	}

	readPart();
}

// read given paths and apply filters on the fly
function readAndFilterPaths( paths, options, callback ) {
	var count = paths.length,
		results = [],
		opt = clone( options );

	opt.recursive = false;

	paths.forEach( function( pth ) {
		readDir( pth, opt, decreaseCounter );
	} );

	function decreaseCounter( err, result ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( result );
		}

		count--;

		if ( !count ) {
			callback( null, results.sort() );
		}
	}
}

// recursively read given paths and apply filtering on the final file list
function readAndFilterFiles( paths, options, callback ) {
	var count = paths.length,
		results = [],
		opt = clone( options ),
		filter = typeof options.filter == 'string' ?
		new Minimatch( options.filter ) :
		options.filter;

	delete opt.filter;

	paths.forEach( function( dir ) {
		readDir( dir, opt, decreaseCounter );
	} );

	function decreaseCounter( err, result ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( result );
		}

		count--;

		if ( !count ) {
			if ( filter ) {
				results = results.filter( function( file ) {
					return filter instanceof Minimatch ? filter.match( file ) :
						filter instanceof RegExp ? filter.test( file ) : true;
				} );
			}

			callback( null, results.sort() );
		}
	}
}

// recursively read a given directory
function readDir( dir, options, callback ) {
	var results = [],
		count = 0,
		ignore = typeof options.ignore == 'string' ?
		new Minimatch( options.ignore ) :
		options.ignore,
		filter = typeof options.filter == 'string' ?
		new Minimatch( options.filter ) :
		options.filter;

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, results.sort() );
		}
	}

	fs.readdir( dir, function( err, files ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !files || !( count = files.length ) ) {
			return callback( null, results.sort() );
		}

		files.forEach( function( file ) {
			var name = file;

			file = path.join( dir, file );

			if (
				( ignore instanceof Minimatch && ignore.match( file ) ) ||
				( ignore instanceof RegExp && ignore.test( file ) ) ||
				( filter instanceof Minimatch && !filter.match( name ) ) ||
				( filter instanceof RegExp && !filter.test( name ) )
			) {
				return decreaseCounter();
			}

			fs.stat( file, function( err, stats ) {
				if ( err && options.stopOnErrors ) {
					return callback( err );
				}

				if ( err ) {
					return decreaseCounter();
				}

				if ( stats.isDirectory() && options.recursive ) {
					readDir( file, options, function( err, files ) {
						if ( err && options.stopOnErrors ) {
							return callback( err );
						}

						if ( !err ) {
							results = results.concat( files );
						}

						decreaseCounter();
					} );
				} else if ( !options.dirOnly || stats.isDirectory() ) {
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
				} else {
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

// returns a copy of the given argument
function clone( obj ) {
	var copy;

	if ( Array.isArray( obj ) ) {
		copy = obj.map( function( value ) {
			return clone( value );
		} );
	} else if ( typeof obj == 'object' && obj !== null ) {
		copy = {};

		Object.getOwnPropertyNames( obj ).forEach( function( name ) {
			copy[ name ] = clone( obj[ name ] );
		} );
	} else {
		copy = obj;
	}

	return copy;
}
