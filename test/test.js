'use strict';

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

var expect = require( 'chai' ).expect,
	path = require( 'path' ),
	gerard = require( '../' );

describe( 'Gerard', function() {
	var dir1 = path.normalize( 'test/dir1' ),
		invalid = path.normalize( 'invalid/path' );

	it( 'should pass an error if invalid path was given', function( done ) {
		gerard( invalid, function( err, results ) {
			expect( err ).to.exist;
			expect( results ).to.not.exist;

			done();
		} );
	} );

	it( 'should list all the files in the directory', function( done ) {
		gerard( dir1, function( err, results ) {
			expect( err ).to.not.exist;
			expect( results ).to.be.an( 'array' );
			expect( results ).to.have.length( 4 );

			done();
		} );
	} );

	it( 'should handle "ignore" option', function( done ) {
		gerard( dir1, {
			ignore: '**/*.js'
		}, function( err, results ) {
			expect( err ).to.not.exist;
			expect( results ).to.be.an( 'array' );
			expect( results ).to.have.length( 0 );

			done();
		} );
	} );

	it( 'should handle "stats" option', function( done ) {
		gerard( dir1, {
			stats: true
		}, function( err, results ) {
			expect( err ).to.not.exist;
			expect( results ).to.be.an( 'array' );
			expect( results ).to.have.length( 4 );

			results.forEach( function( result ) {
				expect( result ).to.be.an( 'object' );
				expect( result ).to.contain.keys( [ 'name', 'dir', 'path', 'stats' ] );
			} );

			done();
		} );
	} );
} );
