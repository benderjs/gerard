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

describe( 'Gerard', function() {
	var dir1 = path.normalize( 'test/dir1' ),
		testDir = path.normalize( 'test/' ),
		invalid = path.normalize( 'invalid/path' );

	// it( 'should pass an error if invalid path was given', function( done ) {
	// 	gerard( invalid, function( err, results ) {
	// 		expect( err ).to.exist;
	// 		expect( results ).to.not.exist;

	// 		done();
	// 	} );
	// } );

	// it( 'should list all the files in the directory', function( done ) {
	// 	gerard( dir1, function( err, results ) {
	// 		expect( err ).to.not.exist;
	// 		expect( results ).to.be.an( 'array' );
	// 		expect( results ).to.have.length( 10 );

	// 		done();
	// 	} );
	// } );

	// it( 'should handle "ignore" option', function( done ) {
	// 	gerard( dir1, {
	// 		ignore: '**/*.js'
	// 	}, function( err, results ) {
	// 		expect( err ).to.not.exist;
	// 		expect( results ).to.be.an( 'array' );
	// 		expect( results ).to.have.length( 2 );

	// 		done();
	// 	} );
	// } );

	// it( 'should handle "stats" option', function( done ) {
	// 	gerard( dir1, {
	// 		stats: true
	// 	}, function( err, results ) {
	// 		expect( err ).to.not.exist;
	// 		expect( results ).to.be.an( 'array' );
	// 		expect( results ).to.have.length( 10 );

	// 		results.forEach( function( result ) {
	// 			expect( result ).to.be.an( 'object' );
	// 			expect( result ).to.contain.keys( [ 'name', 'dir', 'path', 'stats' ] );
	// 		} );

	// 		done();
	// 	} );
	// } );

	it( 'test', function( done ) {
		gerard( 'test/dir2', function( err, results ) {
			if ( err ) {
				console.error( 'err', err );
			}

			console.log( 'results', results.length, results );

			done();
		} );
	} );

	it( 'should handle a pattern passed as a path ending with a globstar', function( done ) {
		gerard( 'test/dir2/**', function( err, results ) {
			if ( err ) {
				console.error( 'err', err );
			}

			console.log( 'results', results.length, results );

			done();
		} );
	} );

	// it( 'should handle a pattern passed as a path', function( done ) {
	// 	gerard( 'test/dir2/*/*.js', function( err, results ) {
	// 		if ( err ) {
	// 			console.error( 'err', err );
	// 		}

	// 		console.log( 'results', results );

	// 		done();
	// 	} );
	// } );
} );
