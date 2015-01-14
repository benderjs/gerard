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
 * @param  {String|Array.<String>}  path                    Path to a directory to be read or a pattern
 * @param  {Object}                 [options]               Configuration options
 * @param  {String|RegExp}          [options.ignore]        Ignore file pattern, supports globstar matching
 * @param  {Boolean}                [options.stats]         Return file objects containing file statistics
 * @param  {Boolean}                [options.stopOnErrors]  Stop reading the directory on first error
 * @param  {Function}               callback                Function called when done or error occured
 */
function gerard( path, options, callback ) {
	// invalid argument count
	if ( arguments.length < 2 ) {
		return callback( new Error( 'Invalid number of arguments specified.' ) );
	}

	// only callback function was given
	if ( typeof options == 'function' ) {
		callback = options;
		options = {};
	}

	// invalid argument type
	if ( typeof callback != 'function' ) {
		return callback( new Error( 'Invalid argument specified.' ) );
	}

	// set the stopOnErrors option to default if no value specified
	options.stopOnErrors = ( options.stopOnErrors === undefined ) ? true : options.stopOnErrors;
	// set the recursive read flag to default (used internally)
	options.recursive = ( options.recursive === undefined ) ? true : options.recursive;
	// convert the ignore option to an array
	options.ignore = Array.isArray( options.ignore ) ?
		options.ignore :
		options.ignore ? [ options.ignore ] : [];

	// convert minimatch patterns to instances
	options.ignore = options.ignore.map( function( ignore, i ) {
		return typeof ignore == 'string' ? new Minimatch( ignore ) : ignore;
	} );

	path = Array.isArray( path ) ? path : [ path ];

	var count = path.length,
		results = [];

	function decreaseCounter( err, result ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( result );
		}

		count--;

		if ( !count ) {
			callback( null, sort( uniq( results, options.stats ), options.stats ) );
		}
	}

	path.forEach( function( pth ) {
		// the given path is a pattern
		if ( isPattern( pth ) ) {
			readPattern( pth, options, decreaseCounter );
		} else {
			readDir( pth, options, decreaseCounter );
		}
	} );
}

module.exports = gerard;

//
// private stuff
//
function readPattern( dir, options, callback ) {
	var parts = path.normalize( dir ).split( path.sep ),
		results = [],
		paths = [];

	function readPart() {
		var part = parts.shift();

		if ( !part ) {
			return callback( null, sort( results, options.stats ) );
		}

		// cloned options for further modifications
		var opt = clone( options );
		opt.filter = part;

		// add the CWD if the path starts with a pattern
		if ( isPattern( part ) && parts.length && !paths.length ) {
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
			callback( null, sort( results, options.stats ) );
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

	if ( !paths.length ) {
		callback( null, [] );
	}

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
					file = typeof file == 'string' ? file : file.path;

					return filter instanceof Minimatch ? filter.match( file ) :
						filter instanceof RegExp ? filter.test( file ) : true;
				} );
			}

			callback( null, sort( results, options.stats ) );
		}
	}
}

// recursively read a given directory
function readDir( dir, options, callback ) {
	var results = [],
		count = 0,
		filter = typeof options.filter == 'string' ?
		new Minimatch( options.filter ) :
		options.filter;

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, sort( results, options.stats ) );
		}
	}

	function isIgnored( file ) {
		return options.ignore.some( function( ignore ) {
			return ( ignore instanceof Minimatch && ignore.match( file ) ) ||
				( ignore instanceof RegExp && ignore.test( file ) ) ||
				( typeof ignore == 'function' && ignore( file ) );
		} );
	}

	dir = typeof dir == 'object' ? dir.path : dir;

	fs.readdir( dir, function( err, files ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !files || !( count = files.length ) ) {
			return callback( null, sort( results, options.stats ) );
		}

		files.forEach( function( file ) {
			var name = file;

			file = path.join( dir, file );

			if ( isIgnored( file ) ||
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
		// don't clone instances of Minimatch - just use a reference
	} else if ( typeof obj == 'object' && !( obj instanceof Minimatch ) && obj !== null ) {
		copy = {};

		Object.getOwnPropertyNames( obj ).forEach( function( name ) {
			copy[ name ] = clone( obj[ name ] );
		} );
	} else {
		copy = obj;
	}

	return copy;
}

// sort method for the results array, supports sorting the results that include stats
function sort( array, stats ) {
	return stats ?
		array.sort( function( a, b ) {
			return a.path > b.path;
		} ) :
		array.sort();
}

// return a new array of unique items of a given array, supports items that include stats
function uniq( array, stats ) {
	if ( stats ) {
		var unique = {},
			results = [];

		array.forEach( function( item ) {
			if ( unique[ item.path ] ) {
				return;
			}

			unique[ item.path ] = 1;
			results.push( item );
		} );

		return results;
	} else {
		return array.filter( function( item, index ) {
			return array.indexOf( item ) === index;
		} );
	}
}
