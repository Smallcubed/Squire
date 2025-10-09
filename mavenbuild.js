#!/usr/bin/env node

import esbuild from 'esbuild';

Promise.all([
    esbuild.build({
        entryPoints: ['source/MavenEditor.ts'],
        bundle: true,
        sourcemap: 'linked',
        target: 'es6',
        format: 'iife',
        outfile: 'dist/maven-editor.js',
    }),
    esbuild.build({
        entryPoints: ['source/MavenEditor.ts'],
        bundle: true,
        minify: true,
        sourcemap: 'linked',
        target: 'es6',
        format: 'iife',
        outfile: 'dist/maven-editor-mini.js',
    }),
    //  This builds directly to the SCEditingWebKit folder
    esbuild.build({
        entryPoints: ['source/MavenEditor.ts'],
        bundle: true,
        sourcemap: 'linked',
        target: 'es6',
        format: 'iife',
        outfile: '/Users/scott/Developer/SmallCubed/MavenOverrides/SCEditingWebKit/Sources/SCEditingWebKit/Resources/Webview/maven-editor.js',
    }),
]).catch(() => process.exit(1));
