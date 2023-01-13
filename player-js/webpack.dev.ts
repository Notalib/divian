import * as CopyPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as webpack from 'webpack';
import { ProgressPlugin } from 'webpack';
import { getEnvVariables, outputPath, resolveApp } from './webpack.tools';
import * as path from 'path';

export default <webpack.Configuration>{
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: [
      outputPath,
      {
        directory: path.resolve(__dirname, '..', 'docs', 'books'),
        publicPath: '/divian/books',
      },
      {
        directory: path.resolve(__dirname, 'node_modules', 'readium-css', 'css'),
        publicPath: '/divian/player/readium-css',
      },
    ],
    port: 4200,
    open: true,
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'public'
        },
      ]
    }),
    new ProgressPlugin(),
    new HtmlWebpackPlugin({
      inject: true,
      template: resolveApp('src/index.html'),
      ...getEnvVariables()
    }),
  ],
};
