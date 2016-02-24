var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Book = mongoose.model('Book'),
  Publisher = mongoose.model('Publisher');

module.exports = function (app) {
  app.use('/api/books', router);
};

/**
 * Middleware that checks that there is a publisher in the database that corresponds to the "publisherId" JSON property in the request body.
 * If it doesn't exist, 400 Bad Request is returned. If it does, it's stored in `req.bookPublisher`.
 */
function findBookPublisher(req, res, next) {
  if (!req.body.publisherId) {
    res.status(400).send('Publisher ID is required');
    return;
  } else if (!mongoose.Types.ObjectId.isValid(req.body.publisherId)) {
    res.status(400).send('No publisher with ID ' + req.body.publisherId);
    return;
  }

  Publisher.findOne({ _id: req.body.publisherId }, function(err, publisher) {
    if (err) {
      res.status(500).send(err);
      return;
    } else if (!publisher) {
      res.status(400).send('No publisher with ID ' + req.body.publisherId);
      return;
    }

    req.bookPublisher = publisher;

    next();
  });
}

// POST /api/books
router.post('/', findBookPublisher, function(req, res, next) {

  var book = new Book(req.body);

  book.save(function (err, createdBook) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(createdBook);
  });
});

// GET /api/books
router.get('/', function(req, res, next) {

  var criteria = {};

  // Filter by publisher.
  if (req.query.publisherId) {
    criteria.publisherId = req.query.publisherId;
  }

  // Filter by format.
  if (typeof(req.query.format) == "object" && req.query.format.length) {
    // If format is an array, match all books which format is included in the array.
    criteria.format = { $in: req.query.format };
  } else if (req.query.format) {
    // If format is a string, match only books that have that specific format.
    criteria.format = req.query.format;
  }

  // Find matching books.
  Book.find(criteria, function(err, books) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(books);
  });
});

/**
 * Middleware that finds the book corresponding to the :id URL parameter
 * and stores it in `req.book`.
 */
function findBook(req, res, next) {
  Book.findById(req.params.id, function(err, book) {
    if (err) {
      res.status(500).send(err);
      return;
    } else if (!book) {
      res.status(404).send('Book not found');
      return;
    }

    // Store the book in the request.
    req.book = book;

    next();
  });
}

// GET /api/books/:id
router.get('/:id', findBook, function(req, res, next) {
  res.send(req.book);
});

// PUT /api/books/:id
router.put('/:id', findBook, findBookPublisher, function(req, res, next) {

  req.book.title = req.body.title;
  req.book.format = req.body.format;
  req.book.publisherId = req.body.publisherId;

  req.book.save(function(err, updatedBook) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(updatedBook);
  });
});

// DELETE /api/books/:id
router.delete('/:id', findBook, function(req, res, next) {
  req.book.remove(function(err) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.sendStatus(204);
  });
});
