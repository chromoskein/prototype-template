require('esbuild').build({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outfile: 'dist/out.js',
    loader: {
      '.wgsl': 'text',
      '.png': 'file',
      '.xyz': 'file'
    },
    preserveSymlinks: true,
  }).catch(() => process.exit(1))