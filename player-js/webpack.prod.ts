import * as TerserPlugin from 'terser-webpack-plugin';
import * as webpack from 'webpack';
import * as path from 'path';

export default <webpack.Configuration>{
  mode: 'production',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, '..', 'docs', 'player'),
    library: '[name]',
    libraryTarget: 'var',
  },
  optimization: {
    minimizer: [new TerserPlugin()],

    splitChunks: {
      cacheGroups: {
        vendors: {
          priority: -10,
          test: /[\\/]node_modules[\\/]/
        }
      },

      chunks: 'async',
      minChunks: 1,
      minSize: 30000,
      name: false
    }
  }
};
