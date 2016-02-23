var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'webs-2016-example'
    },
    port: 3000,
    db: 'mongodb://localhost/webs-2016-example-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'webs-2016-example'
    },
    port: 3000,
    db: 'mongodb://localhost/webs-2016-example-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'webs-2016-example'
    },
    port: process.env.PORT || 3000,
    db: process.env.MONGOLAB_URI || 'mongodb://localhost/webs-2016-example-production'
  }
};

module.exports = config[env];
