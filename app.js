const express = require('express');
const morgan = require('morgan'); // Task 4.3: Import morgan
const app = express();

// 4.1: JSON parsing middleware
app.use(express.json());

// 4.3: Morgan request logging middleware ("dev" format)
app.use(morgan("dev"));

let movies = [
  { id: 1, title: "Inception", director: "Christopher Nolan", year: 2010, genre: "Sci-Fi" },
  { id: 2, title: "The Matrix", director: "The Wachowskis", year: 1999, genre: "Action" },
  { id: 3, title: "Parasite", director: "Bong Joon-ho", year: 2019, genre: "Thriller" }
];

// Validation helper
function validateMovie(body, partial = false) {
  const errors = [];
  const maximumYear = new Date().getFullYear() + 5;

  if (!partial && body.title === undefined) {
    errors.push("title is required");
  }

  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim().length === 0)
  ) {
    errors.push("title must be a non-empty string");
  }

  if (!partial && body.year === undefined) {
    errors.push("year is required");
  }

  if (
    body.year !== undefined &&
    (
      !Number.isInteger(body.year) ||
      body.year < 1888 ||
      body.year > maximumYear
    )
  ) {
    errors.push("year must be a valid integer");
  }

  if (!partial && body.genre === undefined) {
    errors.push("genre is required");
  }

  if (
    body.genre !== undefined &&
    (typeof body.genre !== "string" || body.genre.trim().length === 0)
  ) {
    errors.push("genre must be a non-empty string");
  }

  return errors;
}

// --- VALID ROUTES ---

// GET all movies (with optional filtering and sorting)
app.get('/movies', (req, res) => {
    let result = [...movies];
    const { genre, minYear, sort } = req.query;

    if (genre) {
        result = result.filter(m => m.genre && m.genre.toLowerCase() === genre.toLowerCase());
    }

    if (minYear !== undefined) {
        const parsedMinYear = parseInt(minYear, 10);
        if (isNaN(parsedMinYear)) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid query parameter",
                    details: ["minYear must be a valid integer"]
                }
            });
        }
        result = result.filter(m => m.year >= parsedMinYear);
    }

    if (sort) {
        if (sort === 'year') {
            result.sort((a, b) => a.year - b.year);
        } else if (sort === 'title') {
            result.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid sort parameter",
                    details: ["Supported sort options are 'year' and 'title'"]
                }
            });
        }
    }

    res.json(result);
});

// GET single movie by ID
app.get('/movies/:id', (req, res) => {
    const movieId = parseInt(req.params.id);
    const movie = movies.find(m => m.id === movieId);
    if (!movie) {
        return res.status(404).json({ 
            error: {
                code: "MOVIE_NOT_FOUND",
                message: "Movie not found"
            } 
        });
    }
    res.json(movie);
});

// POST new movie
app.post('/movies', (req, res) => {
    const errors = validateMovie(req.body, false);
    if (errors.length > 0) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Movie data is invalid",
                details: errors
            }
        });
    }

    const { title, director, year, genre } = req.body;
    const newId = movies.length > 0 ? movies[movies.length - 1].id + 1 : 1;
    const newMovie = { id: newId, title, director, year, genre };
    movies.push(newMovie);
    res.status(201).json(newMovie);
});

// PUT replace movie
app.put('/movies/:id', (req, res) => {
    const movieId = parseInt(req.params.id);
    const movieIndex = movies.findIndex(m => m.id === movieId);

    if (movieIndex === -1) {
        return res.status(404).json({
           error : {
              code: "MOVIE_NOT_FOUND",
              message: "Movie not found"
           }
        });
    }

    const errors = validateMovie(req.body, false);
    if (errors.length > 0) {
       return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Movie data is invalid",
            details: errors
          }
       });
    }

    const { title, year, genre, director } = req.body;
    movies[movieIndex] = {
        id: movieId,
        title,
        director: director || movies[movieIndex].director,
        year,
        genre
    };

    res.json(movies[movieIndex]);
});

// PATCH partial update movie
app.patch('/movies/:id', (req, res) => {
    const movieId = parseInt(req.params.id);
    const movie = movies.find(m => m.id === movieId);

    if (!movie) {
        return res.status(404).json({ error:{
          code: "MOVIE_NOT_FOUND",
          message: "Movie not found" 
        }
      });
    }

    const errors = validateMovie(req.body, true);
    if (errors.length > 0) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Movie data is invalid",
            details: errors
          }
        });
    }

    const { title, director, year, genre } = req.body;

    if (title !== undefined) movie.title = title;
    if (director !== undefined) movie.director = director;
    if (year !== undefined) movie.year = year;
    if (genre !== undefined) movie.genre = genre;

    res.json(movie);
});

// DELETE movie
app.delete('/movies/:id', (req, res) => {
    const movieId = parseInt(req.params.id);
    const movieIndex = movies.findIndex(m => m.id === movieId);

    if (movieIndex === -1) {
        return res.status(404).json({ error: {
            code: "MOVIE_NOT_FOUND",
            message: "Movie not found"
        } });
    }

    movies.splice(movieIndex, 1);
    res.status(204).send();
});

//Unkown route handling middleware (must come after all other routes)
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested route does not exist"
    }
  });
});

//Error handling middleware (must come after all other middleware and routes)
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred"
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});