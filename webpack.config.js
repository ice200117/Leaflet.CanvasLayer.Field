// webpack.config.js
const webpack = require('webpack');
const path = require('path');
const WebpackShellPlugin = require('webpack-shell-plugin');

const config = {
    context: path.resolve(__dirname, 'src'),
    entry: './_main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'leaflet.canvaslayer.field.js'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                include: path.resolve(__dirname, 'src'),
                exclude: '/node_modules/',
                loader: 'eslint-loader'
            },
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'src'),
                exclude: '/node_modules/',
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    'es2015',
                                    {
                                        modules: false
                                    }
                                ]
                            ]
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new WebpackShellPlugin({
            onBuildStart: ['echo "Webpack Start"'],
            onBuildEnd: ['node copy-to-examples.js']
        })
        // ,
        // new webpack.optimize.UglifyJsPlugin({  //压缩
        //     compress: {     //压缩代码
        //         dead_code: true,    //移除没被引用的代码
        //         warnings: false,     //当删除没有用处的代码时，显示警告
        //         loops: true //当do、while 、 for循环的判断条件可以确定是，对其进行优化
        //     },
        //     except: ['$super', '$', 'exports', 'require']    //混淆,并排除关键字
        // })
    ]
};

module.exports = config;
