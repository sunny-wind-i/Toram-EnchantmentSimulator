const { merge } = require('webpack-merge');
const common = require('./webpack.base.js');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = merge(common, {
  mode: 'production',
  devtool: false, // 禁用 source map
  output: {
    publicPath: './',
    filename: 'static/js/EnchantmentSimulator.js', // 固定文件名
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, 
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'static/css/EnchantmentSimulator.css', // 固定文件名
    })
  ],
  optimization: {
    minimizer: [
      `...`,
      new CssMinimizerPlugin()
    ]
  }
});