var async = require('async'),
  express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Book = mongoose.model('Book'),
  Publisher = mongoose.model('Publisher');

module.exports = function (app) {
  app.use('/api/books', router);
};

/**
 * Middleware that checks that there is a publisher in the database that corresponds to the "publisher" JSON property in the request body.
 * If it doesn't exist, 400 Bad Request is returned. If it does, it's stored in `req.bookPublisher`.
 */
function findBookPublisher(req, res, next) {
  if (!req.body.publisher) {
    // If no publisher ID is given, return an error.
    res.status(400).send('Publisher ID is required');
    return;
  } else if (!mongoose.Types.ObjectId.isValid(req.body.publisher)) {
    // If the publisher ID is not a valid MongoDB ID, no need to execute a query, return an error directly.
    res.status(400).send('No publisher with ID ' + req.body.publisher);
    return;
  }

  // Find the publisher.
  Publisher.findById(req.body.publisher, function(err, publisher) {
    if (err) {
      res.status(500).send(err);
      return;
    } else if (!publisher) {
      // Return an error if the publisher doesn't exist.
      res.status(400).send('No publisher with ID ' + req.body.publisher);
      return;
    }

    // Store the publisher in the request.
    req.bookPublisher = publisher;

    // Forward the request to the next middleware.
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
  if (req.query.publisher) {
    criteria.publisher = req.query.publisher;
  }

  // Filter by format.
  if (typeof(req.query.format) == "object" && req.query.format.length) {
    // If format is an array, match all books which format is included in the array.
    criteria.format = { $in: req.query.format };
  } else if (req.query.format) {
    // If format is a string, match only books that have that specific format.
    criteria.format = req.query.format;
  }

  // Get page and page size for pagination.
  var page = req.query.page ? parseInt(req.query.page, 10) : 1,
      pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 30;

  // Convert page and page size to offset and limit.
  var offset = (page - 1) * pageSize,
      limit = pageSize;

  // Count all books (without filters).
  function countAllBooks(callback) {
    Book.count(function(err, totalCount) {
      if (err) {
        callback(err);
      } else {
        callback(undefined, totalCount);
      }
    });
  }

  // Count books matching the filters.
  function countFilteredBooks(callback) {
    Book.count(criteria, function(err, filteredCount) {
      if (err) {
        callback(err);
      } else {
        callback(undefined, filteredCount);
      }
    });
  }

  // Find books matching the filters.
  function findMatchingBooks(callback) {

    var query = Book
      .find(criteria)
      // Do not forget to sort, as pagination makes more sense with sorting.
      .sort('title')
      .skip(offset)
      .limit(limit);

    // Embed publisher object if specified in the query.
    if (req.query.embed == 'publisher') {
      query = query.populate('publisher');
    }

    // Execute the query.
    query.exec(function(err, books) {
      if (err) {
        callback(err);
      } else {
        callback(undefined, books);
      }
    });
  }

  // Set the pagination headers and send the matching books in the body.
  function sendResponse(err, results) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    var totalCount = results[0],
        filteredCount = results[1],
        books = results[2];

    // Return the pagination data in headers.
    res.set('X-Pagination-Page', page);
    res.set('X-Pagination-Page-Size', pageSize);
    res.set('X-Pagination-Total', totalCount);
    res.set('X-Pagination-Filtered-Total', filteredCount);

    res.send(books);
  }

  async.parallel([
    countAllBooks,
    countFilteredBooks,
    findMatchingBooks
  ], sendResponse);
});

/**
 * Middleware that finds the book corresponding to the :id URL parameter
 * and stores it in `req.book`.
 */
function findBook(req, res, next) {

  var query = Book
    .findById(req.params.id);

  if (req.query.embed == 'publisher') {
    query = query.populate('publisher');
  }

  query.exec(function(err, book) {
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
  req.book.publisher = req.body.publisher;

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
