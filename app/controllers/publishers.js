var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Book = mongoose.model('Book'),
  Publisher = mongoose.model('Publisher');

module.exports = function (app) {
  app.use('/api/publishers', router);
};

// POST /api/publishers
router.post('/', function (req, res, next) {

  var publisher = new Publisher(req.body);

  publisher.save(function (err, createdPublisher) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(createdPublisher);
  });
});

function getPublisher(id, publishers) {
  for (var i = 0; i < publishers.length; i++) {
    if (publishers[i]._id.toString() == id) {
      return publishers[i];
    }
  }

  return null;
}

/**
 * Looks in `bookCounts` for the number of books for the specified publisher,
 * and adds it to the publisher as the `numberOfBooks` property.
 */
function addNumberOfBooksToPublisher(publisher, bookCounts) {
  for (var i = 0; i < bookCounts.length; i++) {
    if (bookCounts[i]._id == publisher._id.toString()) {
      publisher.numberOfBooks = bookCounts[i].total;
      break;
    }
  }

  if (!publisher.numberOfBooks) {
    publisher.numberOfBooks = 0;
  }
}

/**
 * Counts the number of books for each publisher.
 * If the format argument is a string or an array, only the books matching those formats are counted.
 */
function countBooks(format, ascending, offset, limit, callback) {

  var aggregations = [];

  if (typeof(format) == 'object' && format.length) {
    // If format is an array, match only the books which format is one of the formats in the array.
    aggregations.push({
      $match: {
        format: { $in: format }
      }
    });
  } else if (format) {
    // If format is a string, match only the books with that format.
    aggregations.push({
      $match: {
        format: format
      }
    });
  }

  // Count the number of books by publisher ID.
  aggregations.push({
    $group: {
      _id: '$publisherId',
      total: { $sum: 1 }
    }
  });

  // Sort by total.
  aggregations.push({
    $sort: {
      total: ascending ? 1 : -1
    }
  });

  // Skip results.
  aggregations.push({
    $skip: offset
  });

  // Limit number of results.
  aggregations.push({
    $limit: limit
  });

  // Run the aggregations.
  Book.aggregate(aggregations, function(err, bookCounts) {
    if (err) {
      callback(err);
      return;
    }

    callback(undefined, bookCounts);
  });
}

// GET /api/publishers
router.get('/', function(req, res, next) {

  var offset = req.query.offset ? parseInt(req.query.offset, 10) : 0,
      limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;

  // Count the number of books by publisher, with an optional book format filter.
  countBooks(req.query.bookFormat, false, offset, limit, function(err, bookCounts) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    // Extract the IDs of the publishers into an array.
    var publisherIds = [];
    for (var i = 0; i < bookCounts.length; i++) {
      publisherIds.push(bookCounts[i]._id);
    }

    // Find the corresponding publishers.
    var criteria = {
      _id: { $in: publisherIds }
    };

    Publisher.find(criteria, function(err, publishers) {
      if (err) {
        res.status(500).send(err);
        return;
      }

      var responseBody = [];
      for (var i = 0; i < bookCounts.length; i++) {

        // Serialize each publisher.
        var result = getPublisher(bookCounts[i]._id, publishers).toJSON();

        // Add the number of books.
        result.numberOfBooks = bookCounts[i].total;

        // Add the object to the response array.
        responseBody.push(result);
      }

      // Send the response
      res.send(responseBody);
    });
  });
});

/**
 * Middleware that finds the publisher corresponding to the :id URL parameter
 * and stores it in `req.publisher`.
 */
function findPublisher(req, res, next) {
  Publisher.findById(req.params.id, function(err, publisher) {
    if (err) {
      res.status(500).send(err);
      return;
    } else if (!publisher) {
      res.status(404).send('Publisher not found');
      return;
    }

    // Store the publisher in the request.
    req.publisher = publisher;

    next();
  });
}

// GET /api/publishers/:id
router.get('/:id', findPublisher, function(req, res, next) {
  res.send(req.publisher);
});

// PUT /api/publishers/:id
router.put('/:id', findPublisher, function(req, res, next) {

  // Update the publisher.
  req.publisher.name = req.body.name;
  req.publisher.age = req.body.age;

  // Save the publisher.
  req.publisher.save(function(err, updatedPublisher) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(updatedPublisher);
  });
});

// DELETE /api/publishers/:id
router.delete('/:id', findPublisher, function(req, res, next) {

  var publisherId = req.publisher._id;

  // Delete the publisher.
  req.publisher.remove(function(err) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    // Cascade delete all associated books.
    Book.remove({ publisherId: publisherId }, function(err) {
      if (err) {
        res.status(500).send(err);
        return;
      }

      res.sendStatus(204);
    });
  });
});

// POST /api/publishers/:id/addresses
router.post('/:id/addresses', findPublisher, function(req, res) {

  // Add the address to the publisher's addresses array.
  req.publisher.addresses.push(req.body);

  // Save the publisher.
  req.publisher.save(function(err, updatedPublisher) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(updatedPublisher.addresses[updatedPublisher.addresses.length - 1]);
  });
});

// GET /api/publishers/:id/addresses
router.get('/:id/addresses', findPublisher, function(req, res) {
  res.send(req.publisher.addresses);
});

/*
 * Middleware that finds the publisher address corresponding to the :addressId URL parameter
 * and stores it in `req.address` and its index in the publisher's addresses array in `req.addressIndex`.
 * The `findPublisher` middleware MUST be called before this one.
 */
function findAddress(req, res, next) {

  var address = null,
      addressIndex = null;

  // Find the address with the same _id as the :addressId in the request.
  for (var i = 0; i < req.publisher.addresses.length; i++) {
    if (req.publisher.addresses[i]._id.toString() == req.params.addressId) {
      addressIndex = i;
      address = req.publisher.addresses[i];
      break;
    }
  }

  // Return 404 Not Found if there is no matching address.
  if (!address) {
    res.status(404).send('Address not found');
    return;
  }

  // Store the address object and its index in the request.
  req.address = address;
  req.addressIndex = addressIndex;

  next();
}

// GET /api/publishers/:id/addresses/:addressId
router.get('/:id/addresses/:addressId', findPublisher, findAddress, function(req, res) {
  res.send(req.address);
});

// PUT /api/publishers/:id/addresses/:addressId
router.put('/:id/addresses/:addressId', findPublisher, findAddress, function(req, res) {

  // Update the address.
  req.address.city = req.body.city;
  req.address.street = req.body.street;

  // Save the publisher.
  req.publisher.save(function(err, updatedPublisher) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(updatedPublisher.addresses[req.addressIndex]);
  });
});

// DELETE /api/publishers/:id/addresses/:addressId
router.delete('/:id/addresses/:addressId', findPublisher, function(req, res) {

  // Remove the address from the publisher's addresses array.
  req.publisher.addresses.splice(req.addressIndex, 1);

  // Save the publisher.
  req.publisher.save(function(err) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.sendStatus(204);
  });
});
