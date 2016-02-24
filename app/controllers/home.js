var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Article = mongoose.model('Article');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {

  // Serve the RAML documentation as the index page.
  res.sendFile('api.html', {
    root: 'public'
  });

  // To redirect to the APIDOC documentation instead, comment the 3 lines above and uncomment this one.
  //res.redirect('/apidoc');
});
