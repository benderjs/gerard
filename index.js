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
		var part = parts.shift(),
			opt;

		if ( !part ) {
			return callback( null, results.sort() );
		}

		if ( isPattern( part ) && part === '**' ) {
			if ( parts.length ) {
				if ( !paths.length ) {
					paths.push( '.' );
				}
				// TODO globstar in the middle, what now? (-_-;)
				opt = clone( options );
				opt.filter = dir;

				readAndFilterFiles( paths, opt, callback );
			} else {
				count = paths.length;

				paths.forEach( function( pth ) {
					readDir( pth, options, checkDone );
				} );
			}
		} else if ( isPattern( part ) ) {
			// wildcard in the middle of a path - update the paths list
			if ( parts.length ) {
				// add the CWD if the path starts with a wildcard
				if ( !paths.length ) {
					paths.push( '.' );
				}

				opt = clone( options );
				opt.filter = part;

				updatePaths( paths, opt, function( err, result ) {
					if ( err && options.stopOnErrors ) {
						return callback( err );
					}

					paths = result;
					readPart();
				} );
				// wildcard at the end of a path
			} else {
				opt = clone( options );
				opt.filter = part;

				readAndFilterPaths( paths, opt, function( err, result ) {
					if ( err && options.stopOnErrors ) {
						return callback( err );
					}

					results = result;
					readPart();
				} );
			}
		} else {
			// add current part to the paths
			if ( parts.length ) {
				if ( paths.length ) {
					opt = clone( options );
					opt.filter = part;

					updatePaths( paths, opt, function( err, result ) {
						if ( err && options.stopOnErrors ) {
							return callback( err );
						}

						paths = result;
						readPart();
					} );
				} else {
					paths.push( part );
					readPart();
				}
			} else {
				opt = clone( options );
				opt.filter = part;

				readAndFilterPaths( paths, opt, function( err, result ) {
					if ( err && options.stopOnErrors ) {
						return callback( err );
					}

					results = result;
					readPart();
				} );
			}
		}
	}

	readPart();
}

function updatePaths( paths, options, callback ) {
	var count = paths.length,
		results = [];

	paths.forEach( updatePath );

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, results );
		}
	}

	function updatePath( dir ) {
		var count = 0;

		function checkDone() {
			count--;

			if ( !count ) {
				decreaseCounter();
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

				if (
					( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
					( options.ignore instanceof RegExp && options.ignore.test( file ) ) ||
					( options.filter && !minimatch( name, options.filter ) )
				) {
					return checkDone();
				}

				fs.stat( file, function( err, stats ) {
					if ( err && options.stopOnErrors ) {
						return callback( err );
					}

					if ( !err && stats.isDirectory() ) {
						results.push( file );
					}

					checkDone();
				} );
			} );
		} );
	}
}

function readAndFilterPaths( paths, options, callback ) {
	var count = paths.length,
		results = [];

	paths.forEach( readAndFilterPath );

	function decreaseCounter() {
		count--;

		if ( !count ) {
			callback( null, results );
		}
	}

	function readAndFilterPath( dir ) {
		var count = 0;

		function checkDone() {
			count--;

			if ( !count ) {
				decreaseCounter();
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

				if (
					( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
					( options.ignore instanceof RegExp && options.ignore.test( file ) ) ||
					( options.filter && !minimatch( name, options.filter ) )
				) {
					return checkDone();
				}

				fs.stat( file, function( err, stats ) {
					if ( err && options.stopOnErrors ) {
						return callback( err );
					}

					if ( !err ) {
						results.push( file );
					}

					checkDone();
				} );
			} );
		} );
	}
}

function readAndFilterFiles( paths, options, callback ) {
	var count = paths.length,
		results = [],
		opt = clone( options );

	delete opt.filter;

	paths.forEach( readAndFilterDirectory );

	function decreaseCounter( err, result ) {
		if ( err && options.stopOnErrors ) {
			return callback( err );
		}

		if ( !err ) {
			results = results.concat( result );
		}

		count--;

		if ( !count ) {
			results = results.filter( function( file ) {
				return minimatch( file, options.filter );
			} );

			callback( null, results.sort() );
		}
	}

	function readAndFilterDirectory( dir ) {
		readDir( dir, opt, decreaseCounter );
	}
}

function readDir( dir, options, callback ) {
	var results = [],
		count = 0;

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
				( typeof options.ignore == 'string' && minimatch( file, options.ignore ) ) ||
				( options.ignore instanceof RegExp && options.ignore.test( file ) ) ||
				( options.filter && !minimatch( name, options.filter ) )
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

				if ( stats.isDirectory() ) {
					readDir( file, options, function( err, files ) {
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
