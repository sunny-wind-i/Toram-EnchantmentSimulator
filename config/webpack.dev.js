const { merge } = require('webpack-merge');
const common = require('./webpack.base.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devServer: {
    static: [
      {
        directory: common.output.path,
      },
      {
        directory: require('path').resolve(__dirname, '../src'),
        publicPath: '/src',
      }
    ],
    compress: true,
    host: 'localhost',
    port: 9000,
    open: {
      target: ['EnchantmentSimulator.html']
    },
    historyApiFallback: true,
    hot: true,
    liveReload: true,
    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
});