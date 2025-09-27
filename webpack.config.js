const path = require('path');

module.exports = {
    // 入口文件
    entry: './src/js/EnchantmentSimulator.js',
    // 输出文件
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'static/js/EnchantmentSimulator.js',
        clean: true, // 每次打包前清理 /dist 文件夹
    },
    // 加载器
    module: {
        rules: [
            // 处理 CSS 文件
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            // babel
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                // options: {
                //     presets: ['@babel/preset-env'],
                // },
            },
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