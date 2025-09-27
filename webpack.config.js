const path = require('path');

module.exports = {
    // 入口文件
    entry: './src/js/EnchantmentSimulator.js',
    // 输出文件
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'EnchantmentSimulator.js'
    },
    // 加载器
    module: {
        rules: [
            {
                // test: /\.css$/,
                // use: [
                //     'style-loader',
                //     'css-loader'
                // ]
            }
        ]
    },
    // 插件
    plugins: [
        // new webpack.ProvidePlugin({
        //     $: 'jquery',
        //     jQuery: 'jquery'
        // })
    ],
    // 模式
    mode: 'development'
};