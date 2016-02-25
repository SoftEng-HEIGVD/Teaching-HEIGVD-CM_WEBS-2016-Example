var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Shop = mongoose.model('Shop'),
  Publisher = mongoose.model('Publisher');

module.exports = function (app) {
  app.use('/api/shops', router);
};

// POST /api/shops
router.post('/', function(req, res, next) {

  var shop = new Shop(req.body);

  shop.save(function (err, createdShop) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(createdShop);
  });
});

// GET /api/shops
router.get('/', function(req, res, next) {

  var criteria = {};

  if (req.query.latitude && req.query.longitude && req.query.distance) {
    criteria.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [ parseFloat(req.query.longitude), parseFloat(req.query.latitude) ]
        },
        $maxDistance: parseInt(req.query.distance, 10)
      }
    };
  }

  // Find matching shops.
  var query = Shop.find(criteria);

  // Execute the query.
  query.exec(function(err, shops) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(shops);
  });
});

/**
 * Middleware that finds the shop corresponding to the :id URL parameter
 * and stores it in `req.shop`.
 */
function findShop(req, res, next) {
  Shop.findById(req.params.id)(function(err, shop) {
    if (err) {
      res.status(500).send(err);
      return;
    } else if (!shop) {
      res.status(404).send('Shop not found');
      return;
    }

    // Store the shop in the request.
    req.shop = shop;

    next();
  });
}

// GET /api/shops/:id
router.get('/:id', findShop, function(req, res, next) {
  res.send(req.shop);
});

// PUT /api/shops/:id
router.put('/:id', findShop, function(req, res, next) {

  req.shop.banner = req.body.banner;
  req.shop.city = req.body.city;
  req.shop.location = req.body.location;

  req.shop.save(function(err, updatedShop) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(updatedShop);
  });
});

// DELETE /api/shops/:id
router.delete('/:id', findShop, function(req, res, next) {
  req.shop.remove(function(err) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.sendStatus(204);
  });
});
