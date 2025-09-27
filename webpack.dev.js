const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    static: {
      directory: common.output.path,
    },
    compress: true,
    host: 'localhost',
    port: 9000,
    open: {
      target: ['EnchantmentSimulator.html']
    },
    historyApiFallback: true,
  },
});