const path = require('path');
//const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: './wp-bundle.js',
    path: path.resolve(__dirname, 'bundle'),
  },
  externals: [  ],
  target: 'web',
  node: { fs: 'empty', net: 'empty', tls: 'empty', child_process: 'empty' },
};
