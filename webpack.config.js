const path = require('path');

module.exports = {
  entry: {
    background: './background.js',
    popup: './popup.js',
    content: './content.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'production'
};
