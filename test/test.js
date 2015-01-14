/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

var expect = require( 'chai' ).expect,
	path = require( 'path' ),
	gerard = require( '../' );

function normalize( arg ) {
	if ( Array.isArray( arg ) ) {
		return arg.map( normalize ).sort();
	} else if ( typeof arg == 'string' ) {
		return path.normalize( arg );
	} else {
		return arg;
	}
}

describe( 'Gerard', function() {
	var dir1 = path.normalize( 'test/dir1' ),
		testDir = path.normalize( 'test/' ),
		invalid = path.normalize( 'invalid/path' );

	describe( 'with a directory', function() {
		it( 'should pass an error if invalid path was given', function( done ) {
			gerard( invalid, function( err, results ) {
				expect( err ).to.exist;
				expect( err.code ).to.equal( 'ENOENT' );
				expect( results ).to.not.exist;

				done();
			} );
		} );

		it( 'should list all the files in the directory', function( done ) {
			var expected = [
				'test/dir1/a.js',
				'test/dir1/b.js',
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir1/dir3/dir2/dir4/h.js',
				'test/dir1/dir3/dir2/e.js',
				'test/dir1/dir3/dir2/f.js',
				'test/dir1/dir3/dir2/g.js',
				'test/dir1/dir3/test.txt',
				'test/dir1/test.txt'
			];

			gerard( dir1, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle "ignore" option', function( done ) {
			var expected = [
				'test/dir1/dir3/test.txt',
				'test/dir1/test.txt',
				'test/dir2/dir3/test.txt',
				'test/dir2/test.txt',
				'test/dir3/test.txt'
			];

			gerard( testDir, {
				ignore: '**/*.js'
			}, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle array of ignore patterns"', function( done ) {
			var expected = [
				'test/dir1/dir3/test.txt',
				'test/dir1/test.txt',
				'test/dir3/test.txt'
			];

			gerard( testDir, {
				ignore: [
					'**/*.js',
					'**/dir2/**'
				]
			}, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle "stats" option', function( done ) {
			gerard( dir1, {
				stats: true
			}, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 10 );

				results.forEach( function( result ) {
					expect( result ).to.be.an( 'object' );
					expect( result ).to.contain.keys( [ 'name', 'dir', 'path', 'stats' ] );
				} );

				done();
			} );
		} );

		it( 'should produce unique results only', function( done ) {
			var expected = [
				'test/dir1/a.js',
				'test/dir1/b.js',
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir1/dir3/dir2/dir4/h.js',
				'test/dir1/dir3/dir2/e.js',
				'test/dir1/dir3/dir2/f.js',
				'test/dir1/dir3/dir2/g.js',
				'test/dir1/dir3/test.txt',
				'test/dir1/test.txt',
				'test/dir2/a.js',
				'test/dir2/b.js',
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js',
				'test/dir2/dir3/dir2/dir4/h.js',
				'test/dir2/dir3/dir2/e.js',
				'test/dir2/dir3/dir2/f.js',
				'test/dir2/dir3/dir2/g.js',
				'test/dir2/dir3/test.txt',
				'test/dir2/test.txt',
				'test/dir3/c.js',
				'test/dir3/d.js',
				'test/dir3/dir2/dir4/h.js',
				'test/dir3/dir2/e.js',
				'test/dir3/dir2/f.js',
				'test/dir3/dir2/g.js',
				'test/dir3/test.txt',
				'test/test.js'
			];

			gerard( [ dir1, testDir ], function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );
	} );

	describe( 'with a pattern', function() {
		it( 'should handle test/dir1/**', function( done ) {
			var expected = [
				'test/dir1/a.js',
				'test/dir1/b.js',
				'test/dir1/test.txt',
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir1/dir3/test.txt',
				'test/dir1/dir3/dir2/f.js',
				'test/dir1/dir3/dir2/e.js',
				'test/dir1/dir3/dir2/g.js',
				'test/dir1/dir3/dir2/dir4/h.js'
			];

			gerard( 'test/dir1/**', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle test/**/test.txt', function( done ) {
			var expected = [
				'test/dir1/test.txt',
				'test/dir1/dir3/test.txt',
				'test/dir2/test.txt',
				'test/dir2/dir3/test.txt',
				'test/dir3/test.txt'
			];

			gerard( 'test/**/test.txt', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle test/**/*.js', function( done ) {
			var expected = [
				'test/dir1/a.js',
				'test/dir1/b.js',
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir1/dir3/dir2/dir4/h.js',
				'test/dir1/dir3/dir2/e.js',
				'test/dir1/dir3/dir2/f.js',
				'test/dir1/dir3/dir2/g.js',
				'test/dir2/a.js',
				'test/dir2/b.js',
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js',
				'test/dir2/dir3/dir2/dir4/h.js',
				'test/dir2/dir3/dir2/e.js',
				'test/dir2/dir3/dir2/f.js',
				'test/dir2/dir3/dir2/g.js',
				'test/dir3/c.js',
				'test/dir3/d.js',
				'test/dir3/dir2/dir4/h.js',
				'test/dir3/dir2/e.js',
				'test/dir3/dir2/f.js',
				'test/dir3/dir2/g.js',
				'test/test.js'
			];

			gerard( 'test/**/*.js', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle test/dir2/*/*.js', function( done ) {
			var expected = [
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js'
			];

			gerard( 'test/dir2/*/*.js', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle test/*/dir3/*.js', function( done ) {
			var expected = [
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js'
			];

			gerard( 'test/*/dir3/*.js', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle test/*/dir3/test.txt', function( done ) {
			var expected = [
				'test/dir1/dir3/test.txt',
				'test/dir2/dir3/test.txt'
			];

			gerard( 'test/*/dir3/test.txt', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle */*.js', function( done ) {
			var expected = [ 'test/test.js' ];

			gerard( '*/*.js', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle the stats option', function( done ) {
			gerard( 'test/**/*.txt', {
				stats: true
			}, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 5 );

				results.forEach( function( result ) {
					expect( result ).to.be.an( 'object' );
					expect( result ).to.contain.keys( [ 'name', 'dir', 'path', 'stats' ] );
				} );

				done();
			} );
		} );

		it( 'should handle the ignore option', function( done ) {
			var expected = [ 'test/dir1/dir3/test.txt',
				'test/dir1/test.txt',
				'test/dir2/dir3/test.txt',
				'test/dir2/test.txt',
				'test/dir3/test.txt'
			];

			gerard( 'test/**', {
				ignore: '**/*.js',
				stats: false
			}, function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should handle multiple patterns', function( done ) {
			var expected = [
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js'
			];

			gerard( [
				'test/dir1/*/*.js',
				'test/dir2/*/*.js'
			], function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should produce unique results only', function( done ) {
			var expected = [
				'test/dir1/a.js',
				'test/dir1/b.js',
				'test/dir1/dir3/c.js',
				'test/dir1/dir3/d.js',
				'test/dir1/dir3/dir2/dir4/h.js',
				'test/dir1/dir3/dir2/e.js',
				'test/dir1/dir3/dir2/f.js',
				'test/dir1/dir3/dir2/g.js',
				'test/dir2/dir3/c.js',
				'test/dir2/dir3/d.js',
				'test/dir3/c.js',
				'test/dir3/d.js'
			];

			gerard( [
				'test/dir1/**/*.js',
				'test/**/dir3/*.js'
			], function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( normalize( results ) ).to.deep.equal( normalize( expected ) );

				done();
			} );
		} );

		it( 'should return empty array if no matches', function( done ) {
			gerard( 'test/**/foo/**', function( err, results ) {
				expect( err ).to.not.exist;
				expect( results ).to.be.an( 'array' );
				expect( results ).to.be.empty;

				done();
			} );
		} );
	} );
} );
