[![Build Status](https://travis-ci.org/benderjs/gerard.svg?branch=master)](https://travis-ci.org/benderjs/gerard)

# Gerard - Graceful Recursive ReadDir

Recursive readdir for Node.js using [graceful-fs](https://github.com/isaacs/node-graceful-fs) to access the file system. Supports wildcards for selective listing.

## Installation

```
$ npm install gerard
```

## Usage

```javascript
var gerard = require( 'gerard' );

gerard( path, [options], callback );
```

## Arguments

### path

A string or an array of strings representing paths to be read. Supports wildcards (see examples).

### options

Optional object containing configuration options.

Available options:

- **ignore** *(String|Array.<String>)* - a pattern/an array of patterns used to exclude files/paths from reading, supports globstar matching.
- **stats** *(Boolean)* - return file objects containing file's statistics (see: [fs.Stats](http://nodejs.org/api/fs.html#fs_class_fs_stats))
- **stopOnErrors** *(Boolean)* - set to `false` if you don't want Gerard to stop on the first error. Defaults to `true`.

## callback

A Node-style callback function called when done reading or an error occurred.

Examples
--------

Get a list of all files in the given directory:

```javascript
gerard( 'path/to/directory/', function ( err, results ) {
    if ( err ) {
        return console.error( 'Error:', err );
    }

    console.log( results );
    // [ 'foo.js', 'bar.html', 'baz.css' ]
});
```

Ignore all JavaScript files:

```javascript
gerard( 'path/to/directory/', { ignore: '**/*.js' }, function ( err, results ) {
    if ( err ) {
        return console.error( 'Error:', err );
    }

    console.log( results );
    // [ 'bar.html', 'baz.css' ]
});
```

Get files and its' statistics:

```javascript
gerard( 'path/to/directory/', { stats: true }, function ( err, results ) {
    if ( err ) {
        return console.error( 'Error:', err );
    }

    console.log( results );
    // [ { name: 'foo.js', dir: 'path/to/directory/', path: 'path/to/directory/foo.js', stats: {...} },
    // { name: 'bar.html', dir: 'path/to/directory/', path: 'path/to/directory/bar.html', stats: {...} }
    // { name: 'baz.css', dir: 'path/to/directory/', path: 'path/to/directory/baz.css', stats: {...} } ]
});
```

Use wildcards for the path:

```javascript
gerard( '**/*.js', function ( err, results ) {
    if ( err ) {
        return console.error( 'Error:', err );
    }

    console.log( results );
    // [ 'foo.js' ]
});
```

Tests
-----

```
$ npm test
```

License
-------

MIT, for license details see: [LICENSE.md](https://github.com/benderjs/gerard/blob/master/LICENSE.md).
