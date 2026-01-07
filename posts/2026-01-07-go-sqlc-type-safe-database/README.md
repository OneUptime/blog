# How to Use sqlc for Type-Safe Database Access in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, sqlc, Database, PostgreSQL, SQL, Type Safety

Description: Generate type-safe Go code from SQL queries using sqlc for compile-time SQL validation and efficient database access.

---

Working with databases in Go typically involves choosing between ORMs that abstract away SQL or writing raw queries with manual type mapping. **sqlc** offers a compelling middle ground: you write plain SQL, and sqlc generates type-safe Go code that handles all the boilerplate. This approach gives you the full power of SQL while maintaining compile-time type safety.

In this guide, we will explore how to use sqlc to build robust, maintainable database access layers in Go applications.

## What is sqlc?

sqlc is a code generator that turns your SQL queries into type-safe Go code. Unlike ORMs, sqlc does not try to abstract away SQL. Instead, it embraces SQL as the query language and generates Go structs and functions that match your queries exactly.

Key benefits of sqlc include:

- **Compile-time SQL validation**: sqlc parses your SQL and catches errors before runtime
- **Type-safe queries**: Generated code uses proper Go types for all parameters and results
- **No runtime reflection**: Generated code is efficient with no reflection overhead
- **Full SQL power**: Use any SQL feature your database supports
- **Easy to understand**: The generated code is readable and debuggable

## Installing sqlc

There are multiple ways to install sqlc depending on your operating system and preferences.

### Using Homebrew (macOS/Linux)

The easiest way to install sqlc on macOS or Linux is through Homebrew:

```bash
# Install sqlc using Homebrew
brew install sqlc
```

### Using Go Install

If you have Go installed, you can install sqlc directly:

```bash
# Install sqlc using go install
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
```

### Using Docker

For CI/CD pipelines or if you prefer containerized tools:

```bash
# Run sqlc using Docker
docker run --rm -v $(pwd):/src -w /src sqlc/sqlc generate
```

### Verify Installation

Confirm sqlc is installed correctly by checking the version:

```bash
# Check sqlc version
sqlc version
```

## Project Setup

Let us create a new Go project and set up sqlc for database access.

### Initialize Go Module

Start by creating a new directory and initializing a Go module:

```bash
# Create project directory and initialize Go module
mkdir bookstore && cd bookstore
go mod init github.com/example/bookstore
```

### Create Project Structure

Set up a clean project structure that separates SQL files from generated code:

```bash
# Create directory structure for sqlc
mkdir -p db/migrations
mkdir -p db/queries
mkdir -p db/sqlc
```

The structure will look like this:

```
bookstore/
├── db/
│   ├── migrations/    # Database schema migrations
│   ├── queries/       # SQL query files
│   └── sqlc/          # Generated Go code
├── go.mod
└── sqlc.yaml
```

## Configuring sqlc.yaml

The sqlc.yaml file is the heart of sqlc configuration. It tells sqlc where to find your SQL files and where to put the generated code.

### Basic Configuration

Create a sqlc.yaml file in your project root with the following configuration:

```yaml
# sqlc.yaml - Configuration for sqlc code generation
version: "2"
sql:
  # Configuration for PostgreSQL database
  - engine: "postgresql"
    # Directory containing SQL query files with annotations
    queries: "db/queries"
    # Directory containing schema/migration files
    schema: "db/migrations"
    gen:
      go:
        # Package name for generated Go code
        package: "db"
        # Output directory for generated files
        out: "db/sqlc"
        # Use pgx/v5 as the database driver
        sql_package: "pgx/v5"
        # Emit JSON tags on generated structs
        emit_json_tags: true
        # Emit interface for Querier
        emit_interface: true
        # Emit methods with context parameter
        emit_methods_with_db_argument: false
```

### Configuration Options Explained

Let us break down the important configuration options:

```yaml
# sqlc.yaml - Detailed configuration with explanations
version: "2"
sql:
  - engine: "postgresql"          # Database engine: postgresql, mysql, sqlite
    queries: "db/queries"         # Path to query files
    schema: "db/migrations"       # Path to schema files
    gen:
      go:
        package: "db"             # Go package name
        out: "db/sqlc"            # Output directory
        sql_package: "pgx/v5"     # Driver: pgx/v5, database/sql
        emit_json_tags: true      # Add json tags to structs
        emit_interface: true      # Generate Querier interface
        emit_empty_slices: true   # Return [] instead of nil for empty results
        emit_exact_table_names: false  # Use singular table names for structs
        emit_prepared_queries: false   # Use prepared statements
        overrides:                # Custom type mappings
          - db_type: "uuid"
            go_type: "github.com/google/uuid.UUID"
          - db_type: "timestamptz"
            go_type: "time.Time"
```

## Writing Database Schema

Before writing queries, we need to define our database schema. Create migration files that define your tables.

### Create Schema Migration

Create the initial schema file for a bookstore database:

```sql
-- db/migrations/001_initial_schema.sql
-- Creates the core tables for the bookstore application

-- Authors table stores information about book authors
CREATE TABLE authors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Books table stores book information with author reference
CREATE TABLE books (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author_id BIGINT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    isbn VARCHAR(20) UNIQUE,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    published_date DATE,
    category VARCHAR(100),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews table stores customer reviews for books
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_reviews_book_id ON reviews(book_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

## Writing SQL Queries with Annotations

sqlc uses special annotations to understand how to generate Go code from your SQL queries. The annotations tell sqlc the function name and return type.

### Query Annotations

sqlc supports three main annotation types:

- `:one` - Returns a single row (returns an error if no rows found)
- `:many` - Returns multiple rows as a slice
- `:exec` - Executes a statement without returning rows
- `:execrows` - Executes and returns the number of affected rows
- `:execresult` - Executes and returns the full result object

### Author Queries

Create queries for managing authors:

```sql
-- db/queries/authors.sql
-- Queries for managing author records

-- name: CreateAuthor :one
-- Inserts a new author and returns the created record
INSERT INTO authors (name, email, bio)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetAuthor :one
-- Retrieves a single author by ID
SELECT * FROM authors
WHERE id = $1;

-- name: GetAuthorByEmail :one
-- Retrieves an author by their email address
SELECT * FROM authors
WHERE email = $1;

-- name: ListAuthors :many
-- Retrieves all authors ordered by name with pagination
SELECT * FROM authors
ORDER BY name
LIMIT $1 OFFSET $2;

-- name: UpdateAuthor :one
-- Updates an author's information and returns the updated record
UPDATE authors
SET name = $2, email = $3, bio = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteAuthor :exec
-- Removes an author from the database
DELETE FROM authors
WHERE id = $1;

-- name: CountAuthors :one
-- Returns the total number of authors
SELECT COUNT(*) FROM authors;
```

### Book Queries

Create queries for managing books:

```sql
-- db/queries/books.sql
-- Queries for managing book records

-- name: CreateBook :one
-- Inserts a new book and returns the created record
INSERT INTO books (title, author_id, isbn, price, published_date, category, stock_quantity)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetBook :one
-- Retrieves a single book by ID
SELECT * FROM books
WHERE id = $1;

-- name: GetBookByISBN :one
-- Retrieves a book by its ISBN
SELECT * FROM books
WHERE isbn = $1;

-- name: ListBooks :many
-- Retrieves all books with pagination
SELECT * FROM books
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListBooksByAuthor :many
-- Retrieves all books written by a specific author
SELECT * FROM books
WHERE author_id = $1
ORDER BY published_date DESC;

-- name: ListBooksByCategory :many
-- Retrieves all books in a specific category
SELECT * FROM books
WHERE category = $1
ORDER BY title
LIMIT $2 OFFSET $3;

-- name: UpdateBook :one
-- Updates book information and returns the updated record
UPDATE books
SET title = $2,
    isbn = $3,
    price = $4,
    published_date = $5,
    category = $6,
    stock_quantity = $7,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateBookStock :one
-- Updates only the stock quantity for a book
UPDATE books
SET stock_quantity = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteBook :exec
-- Removes a book from the database
DELETE FROM books
WHERE id = $1;

-- name: SearchBooks :many
-- Searches books by title using case-insensitive pattern matching
SELECT * FROM books
WHERE title ILIKE '%' || $1 || '%'
ORDER BY title
LIMIT $2 OFFSET $3;
```

### Review Queries

Create queries for managing reviews:

```sql
-- db/queries/reviews.sql
-- Queries for managing book reviews

-- name: CreateReview :one
-- Adds a new review for a book
INSERT INTO reviews (book_id, reviewer_name, rating, comment)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetReview :one
-- Retrieves a single review by ID
SELECT * FROM reviews
WHERE id = $1;

-- name: ListReviewsByBook :many
-- Retrieves all reviews for a specific book
SELECT * FROM reviews
WHERE book_id = $1
ORDER BY created_at DESC;

-- name: DeleteReview :exec
-- Removes a review from the database
DELETE FROM reviews
WHERE id = $1;

-- name: GetAverageRating :one
-- Calculates the average rating for a book
SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) as average_rating
FROM reviews
WHERE book_id = $1;
```

## Generating Go Code

With your schema and queries in place, generate the Go code:

```bash
# Generate Go code from SQL files
sqlc generate
```

This command reads your sqlc.yaml configuration and generates Go files in the specified output directory.

### Generated Files Overview

After running sqlc generate, you will find these files in db/sqlc/:

```
db/sqlc/
├── db.go          # Database connection wrapper and Querier interface
├── models.go      # Go structs matching your database tables
├── authors.sql.go # Generated functions for author queries
├── books.sql.go   # Generated functions for book queries
├── reviews.sql.go # Generated functions for review queries
└── querier.go     # Interface containing all query methods
```

### Understanding Generated Models

sqlc generates Go structs that match your database tables exactly:

```go
// db/sqlc/models.go (generated)
// This file is auto-generated by sqlc. DO NOT EDIT.

package db

import (
    "time"
    "github.com/jackc/pgx/v5/pgtype"
)

// Author represents a row in the authors table
type Author struct {
    ID        int64              `json:"id"`
    Name      string             `json:"name"`
    Email     pgtype.Text        `json:"email"`
    Bio       pgtype.Text        `json:"bio"`
    CreatedAt time.Time          `json:"created_at"`
    UpdatedAt time.Time          `json:"updated_at"`
}

// Book represents a row in the books table
type Book struct {
    ID            int64              `json:"id"`
    Title         string             `json:"title"`
    AuthorID      int64              `json:"author_id"`
    Isbn          pgtype.Text        `json:"isbn"`
    Price         pgtype.Numeric     `json:"price"`
    PublishedDate pgtype.Date        `json:"published_date"`
    Category      pgtype.Text        `json:"category"`
    StockQuantity int32              `json:"stock_quantity"`
    CreatedAt     time.Time          `json:"created_at"`
    UpdatedAt     time.Time          `json:"updated_at"`
}

// Review represents a row in the reviews table
type Review struct {
    ID           int64     `json:"id"`
    BookID       int64     `json:"book_id"`
    ReviewerName string    `json:"reviewer_name"`
    Rating       int32     `json:"rating"`
    Comment      pgtype.Text `json:"comment"`
    CreatedAt    time.Time `json:"created_at"`
}
```

### Understanding Generated Query Functions

Each SQL query becomes a type-safe Go function:

```go
// db/sqlc/authors.sql.go (generated excerpt)
// This file is auto-generated by sqlc. DO NOT EDIT.

package db

import (
    "context"
)

const createAuthor = `-- name: CreateAuthor :one
INSERT INTO authors (name, email, bio)
VALUES ($1, $2, $3)
RETURNING id, name, email, bio, created_at, updated_at
`

// CreateAuthorParams contains the parameters for CreateAuthor
type CreateAuthorParams struct {
    Name  string      `json:"name"`
    Email pgtype.Text `json:"email"`
    Bio   pgtype.Text `json:"bio"`
}

// CreateAuthor inserts a new author and returns the created record
func (q *Queries) CreateAuthor(ctx context.Context, arg CreateAuthorParams) (Author, error) {
    row := q.db.QueryRow(ctx, createAuthor, arg.Name, arg.Email, arg.Bio)
    var i Author
    err := row.Scan(
        &i.ID,
        &i.Name,
        &i.Email,
        &i.Bio,
        &i.CreatedAt,
        &i.UpdatedAt,
    )
    return i, err
}
```

## Using Generated Code

Now let us see how to use the generated code in your application.

### Database Connection Setup

First, set up the database connection using pgx:

```go
// main.go
// Demonstrates how to connect to the database and use sqlc-generated code

package main

import (
    "context"
    "log"
    "os"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/example/bookstore/db/sqlc"
)

func main() {
    ctx := context.Background()

    // Get database URL from environment variable
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        dbURL = "postgres://postgres:password@localhost:5432/bookstore?sslmode=disable"
    }

    // Create connection pool for better performance
    pool, err := pgxpool.New(ctx, dbURL)
    if err != nil {
        log.Fatalf("Unable to connect to database: %v", err)
    }
    defer pool.Close()

    // Verify connection is working
    if err := pool.Ping(ctx); err != nil {
        log.Fatalf("Unable to ping database: %v", err)
    }

    log.Println("Successfully connected to database")

    // Create Queries instance with the connection pool
    queries := db.New(pool)

    // Now use queries to interact with the database
    runExamples(ctx, queries)
}
```

### CRUD Operations Examples

Here are practical examples of Create, Read, Update, and Delete operations:

```go
// examples.go
// Demonstrates CRUD operations using sqlc-generated code

package main

import (
    "context"
    "fmt"
    "log"

    "github.com/jackc/pgx/v5/pgtype"
    "github.com/example/bookstore/db/sqlc"
)

func runExamples(ctx context.Context, queries *db.Queries) {
    // CREATE: Add a new author
    author, err := createAuthorExample(ctx, queries)
    if err != nil {
        log.Printf("Error creating author: %v", err)
        return
    }
    fmt.Printf("Created author: %+v\n", author)

    // READ: Get the author we just created
    fetchedAuthor, err := queries.GetAuthor(ctx, author.ID)
    if err != nil {
        log.Printf("Error fetching author: %v", err)
        return
    }
    fmt.Printf("Fetched author: %s\n", fetchedAuthor.Name)

    // UPDATE: Modify the author's bio
    updatedAuthor, err := updateAuthorExample(ctx, queries, author.ID)
    if err != nil {
        log.Printf("Error updating author: %v", err)
        return
    }
    fmt.Printf("Updated author bio: %s\n", updatedAuthor.Bio.String)

    // DELETE: Remove the author
    err = queries.DeleteAuthor(ctx, author.ID)
    if err != nil {
        log.Printf("Error deleting author: %v", err)
        return
    }
    fmt.Println("Author deleted successfully")
}

// createAuthorExample demonstrates creating a new author record
func createAuthorExample(ctx context.Context, queries *db.Queries) (db.Author, error) {
    // Prepare parameters with proper null handling for optional fields
    params := db.CreateAuthorParams{
        Name: "Jane Austen",
        Email: pgtype.Text{
            String: "jane@example.com",
            Valid:  true,
        },
        Bio: pgtype.Text{
            String: "English novelist known for her six major novels.",
            Valid:  true,
        },
    }

    return queries.CreateAuthor(ctx, params)
}

// updateAuthorExample demonstrates updating an existing author
func updateAuthorExample(ctx context.Context, queries *db.Queries, authorID int64) (db.Author, error) {
    params := db.UpdateAuthorParams{
        ID:   authorID,
        Name: "Jane Austen",
        Email: pgtype.Text{
            String: "jane.austen@literature.com",
            Valid:  true,
        },
        Bio: pgtype.Text{
            String: "English novelist best known for Pride and Prejudice and Sense and Sensibility.",
            Valid:  true,
        },
    }

    return queries.UpdateAuthor(ctx, params)
}
```

### Working with Nullable Fields

sqlc uses pgtype types for nullable database columns. Here is how to work with them:

```go
// nullable.go
// Demonstrates handling nullable fields in sqlc

package main

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5/pgtype"
    "github.com/example/bookstore/db/sqlc"
)

// Helper function to create a valid pgtype.Text from a string
func newText(s string) pgtype.Text {
    return pgtype.Text{String: s, Valid: true}
}

// Helper function to create a null pgtype.Text
func nullText() pgtype.Text {
    return pgtype.Text{Valid: false}
}

// Example of reading nullable fields safely
func printAuthorDetails(author db.Author) {
    fmt.Printf("Name: %s\n", author.Name)

    // Check if email is null before accessing
    if author.Email.Valid {
        fmt.Printf("Email: %s\n", author.Email.String)
    } else {
        fmt.Println("Email: (not provided)")
    }

    // Check if bio is null before accessing
    if author.Bio.Valid {
        fmt.Printf("Bio: %s\n", author.Bio.String)
    } else {
        fmt.Println("Bio: (not provided)")
    }
}

// Creating a book with some null fields
func createBookWithOptionalFields(ctx context.Context, queries *db.Queries, authorID int64) (db.Book, error) {
    // Price as numeric type
    price := pgtype.Numeric{}
    price.Scan("29.99")

    params := db.CreateBookParams{
        Title:         "Pride and Prejudice",
        AuthorID:      authorID,
        Isbn:          newText("978-0141439518"),
        Price:         price,
        PublishedDate: pgtype.Date{Valid: false}, // Null date
        Category:      newText("Fiction"),
        StockQuantity: 100,
    }

    return queries.CreateBook(ctx, params)
}
```

### Listing and Pagination

Handle list queries with pagination:

```go
// pagination.go
// Demonstrates pagination with sqlc

package main

import (
    "context"
    "fmt"
    "log"

    "github.com/example/bookstore/db/sqlc"
)

// listAuthorsWithPagination retrieves authors page by page
func listAuthorsWithPagination(ctx context.Context, queries *db.Queries) error {
    pageSize := int32(10)
    pageNumber := int32(0)

    for {
        // Calculate offset based on page number
        offset := pageNumber * pageSize

        // Fetch a page of authors
        authors, err := queries.ListAuthors(ctx, db.ListAuthorsParams{
            Limit:  pageSize,
            Offset: offset,
        })
        if err != nil {
            return fmt.Errorf("error listing authors: %w", err)
        }

        // Break if no more results
        if len(authors) == 0 {
            break
        }

        // Process authors on this page
        fmt.Printf("--- Page %d ---\n", pageNumber+1)
        for _, author := range authors {
            fmt.Printf("  %d: %s\n", author.ID, author.Name)
        }

        // If we got fewer results than page size, this is the last page
        if int32(len(authors)) < pageSize {
            break
        }

        pageNumber++
    }

    return nil
}

// searchBooksExample demonstrates search with pagination
func searchBooksExample(ctx context.Context, queries *db.Queries, searchTerm string) error {
    books, err := queries.SearchBooks(ctx, db.SearchBooksParams{
        Column1: searchTerm,
        Limit:   20,
        Offset:  0,
    })
    if err != nil {
        return fmt.Errorf("error searching books: %w", err)
    }

    fmt.Printf("Found %d books matching '%s':\n", len(books), searchTerm)
    for _, book := range books {
        fmt.Printf("  - %s (ID: %d)\n", book.Title, book.ID)
    }

    return nil
}
```

## Transactions with sqlc

Transactions are essential for maintaining data integrity. sqlc makes it easy to use transactions with the generated code.

### Basic Transaction Pattern

Here is how to run queries within a transaction:

```go
// transactions.go
// Demonstrates transaction handling with sqlc

package main

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/jackc/pgx/v5/pgtype"
    "github.com/example/bookstore/db/sqlc"
)

// CreateAuthorWithBooks creates an author and their books in a single transaction
func CreateAuthorWithBooks(ctx context.Context, pool *pgxpool.Pool, authorName string, bookTitles []string) error {
    // Begin a new transaction
    tx, err := pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }

    // Defer rollback - this is a no-op if commit succeeds
    defer tx.Rollback(ctx)

    // Create a Queries instance that uses the transaction
    queries := db.New(tx)

    // Create the author
    author, err := queries.CreateAuthor(ctx, db.CreateAuthorParams{
        Name:  authorName,
        Email: pgtype.Text{Valid: false},
        Bio:   pgtype.Text{Valid: false},
    })
    if err != nil {
        return fmt.Errorf("failed to create author: %w", err)
    }

    // Create books for the author
    for _, title := range bookTitles {
        price := pgtype.Numeric{}
        price.Scan("19.99")

        _, err := queries.CreateBook(ctx, db.CreateBookParams{
            Title:         title,
            AuthorID:      author.ID,
            Isbn:          pgtype.Text{Valid: false},
            Price:         price,
            PublishedDate: pgtype.Date{Valid: false},
            Category:      pgtype.Text{String: "Fiction", Valid: true},
            StockQuantity: 50,
        })
        if err != nil {
            return fmt.Errorf("failed to create book '%s': %w", title, err)
        }
    }

    // Commit the transaction
    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    fmt.Printf("Successfully created author '%s' with %d books\n", authorName, len(bookTitles))
    return nil
}
```

### Transaction Helper Function

Create a reusable helper for transaction management:

```go
// tx_helper.go
// Provides a reusable transaction helper pattern

package main

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/example/bookstore/db/sqlc"
)

// TxFunc is a function that runs within a transaction
type TxFunc func(queries *db.Queries) error

// WithTransaction executes a function within a database transaction
// It handles begin, commit, and rollback automatically
func WithTransaction(ctx context.Context, pool *pgxpool.Pool, fn TxFunc) error {
    // Begin transaction
    tx, err := pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }

    // Create queries instance for this transaction
    queries := db.New(tx)

    // Execute the function
    if err := fn(queries); err != nil {
        // Rollback on error
        if rbErr := tx.Rollback(ctx); rbErr != nil {
            return fmt.Errorf("rollback failed: %v (original error: %w)", rbErr, err)
        }
        return err
    }

    // Commit on success
    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("commit transaction: %w", err)
    }

    return nil
}

// Example usage of the transaction helper
func transferBookStock(ctx context.Context, pool *pgxpool.Pool, fromBookID, toBookID int64, quantity int32) error {
    return WithTransaction(ctx, pool, func(queries *db.Queries) error {
        // Get source book
        fromBook, err := queries.GetBook(ctx, fromBookID)
        if err != nil {
            return fmt.Errorf("get source book: %w", err)
        }

        // Check sufficient stock
        if fromBook.StockQuantity < quantity {
            return fmt.Errorf("insufficient stock: have %d, need %d", fromBook.StockQuantity, quantity)
        }

        // Get destination book
        toBook, err := queries.GetBook(ctx, toBookID)
        if err != nil {
            return fmt.Errorf("get destination book: %w", err)
        }

        // Decrease source stock
        _, err = queries.UpdateBookStock(ctx, db.UpdateBookStockParams{
            ID:            fromBookID,
            StockQuantity: fromBook.StockQuantity - quantity,
        })
        if err != nil {
            return fmt.Errorf("decrease source stock: %w", err)
        }

        // Increase destination stock
        _, err = queries.UpdateBookStock(ctx, db.UpdateBookStockParams{
            ID:            toBookID,
            StockQuantity: toBook.StockQuantity + quantity,
        })
        if err != nil {
            return fmt.Errorf("increase destination stock: %w", err)
        }

        return nil
    })
}
```

## Complex Queries

sqlc handles complex queries including joins, aggregations, and subqueries with ease.

### Join Queries

Create queries that join multiple tables:

```sql
-- db/queries/complex.sql
-- Complex queries with joins and aggregations

-- name: GetBookWithAuthor :one
-- Retrieves a book along with its author information
SELECT
    b.id as book_id,
    b.title,
    b.isbn,
    b.price,
    b.published_date,
    b.category,
    b.stock_quantity,
    a.id as author_id,
    a.name as author_name,
    a.email as author_email
FROM books b
INNER JOIN authors a ON b.author_id = a.id
WHERE b.id = $1;

-- name: ListBooksWithAuthors :many
-- Retrieves all books with their author names
SELECT
    b.id,
    b.title,
    b.price,
    b.category,
    b.stock_quantity,
    a.name as author_name
FROM books b
INNER JOIN authors a ON b.author_id = a.id
ORDER BY b.title
LIMIT $1 OFFSET $2;

-- name: GetBookWithReviewStats :one
-- Retrieves a book with aggregated review statistics
SELECT
    b.id,
    b.title,
    b.price,
    a.name as author_name,
    COUNT(r.id) as review_count,
    COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) as average_rating
FROM books b
INNER JOIN authors a ON b.author_id = a.id
LEFT JOIN reviews r ON b.id = r.book_id
WHERE b.id = $1
GROUP BY b.id, b.title, b.price, a.name;
```

### Aggregation Queries

Work with aggregated data:

```sql
-- db/queries/aggregations.sql
-- Aggregation and reporting queries

-- name: GetCategoryStats :many
-- Gets statistics for each book category
SELECT
    category,
    COUNT(*) as book_count,
    SUM(stock_quantity) as total_stock,
    AVG(price)::DECIMAL(10,2) as average_price
FROM books
WHERE category IS NOT NULL
GROUP BY category
ORDER BY book_count DESC;

-- name: GetAuthorStats :many
-- Gets publishing statistics for each author
SELECT
    a.id,
    a.name,
    COUNT(b.id) as book_count,
    COALESCE(SUM(b.stock_quantity), 0) as total_books_in_stock,
    COALESCE(AVG(b.price), 0)::DECIMAL(10,2) as average_book_price
FROM authors a
LEFT JOIN books b ON a.id = b.author_id
GROUP BY a.id, a.name
ORDER BY book_count DESC;

-- name: GetTopRatedBooks :many
-- Gets the top rated books with minimum review count
SELECT
    b.id,
    b.title,
    a.name as author_name,
    COUNT(r.id) as review_count,
    AVG(r.rating)::DECIMAL(3,2) as average_rating
FROM books b
INNER JOIN authors a ON b.author_id = a.id
INNER JOIN reviews r ON b.id = r.book_id
GROUP BY b.id, b.title, a.name
HAVING COUNT(r.id) >= $1
ORDER BY average_rating DESC, review_count DESC
LIMIT $2;

-- name: GetRecentReviews :many
-- Gets recent reviews with book and rating info
SELECT
    r.id,
    r.reviewer_name,
    r.rating,
    r.comment,
    r.created_at,
    b.title as book_title
FROM reviews r
INNER JOIN books b ON r.book_id = b.id
ORDER BY r.created_at DESC
LIMIT $1;
```

### Using Complex Query Results

Here is how to use the generated code for complex queries:

```go
// complex_usage.go
// Demonstrates using complex queries with joins and aggregations

package main

import (
    "context"
    "fmt"
    "log"

    "github.com/example/bookstore/db/sqlc"
)

// displayBookWithAuthor fetches and displays a book with its author
func displayBookWithAuthor(ctx context.Context, queries *db.Queries, bookID int64) {
    // sqlc generates a custom struct for this join query
    result, err := queries.GetBookWithAuthor(ctx, bookID)
    if err != nil {
        log.Printf("Error fetching book with author: %v", err)
        return
    }

    fmt.Printf("Book: %s\n", result.Title)
    fmt.Printf("Author: %s\n", result.AuthorName)
    if result.AuthorEmail.Valid {
        fmt.Printf("Author Email: %s\n", result.AuthorEmail.String)
    }
    fmt.Printf("Price: %s\n", result.Price.Int.String())
}

// displayCategoryStatistics shows statistics for each category
func displayCategoryStatistics(ctx context.Context, queries *db.Queries) {
    stats, err := queries.GetCategoryStats(ctx)
    if err != nil {
        log.Printf("Error fetching category stats: %v", err)
        return
    }

    fmt.Println("Category Statistics:")
    fmt.Println("--------------------")
    for _, stat := range stats {
        if stat.Category.Valid {
            fmt.Printf("Category: %s\n", stat.Category.String)
            fmt.Printf("  Books: %d\n", stat.BookCount)
            fmt.Printf("  Total Stock: %d\n", stat.TotalStock)
            fmt.Printf("  Average Price: %s\n", stat.AveragePrice.Int.String())
            fmt.Println()
        }
    }
}

// displayTopRatedBooks shows the highest-rated books
func displayTopRatedBooks(ctx context.Context, queries *db.Queries) {
    // Get books with at least 3 reviews, limit to top 10
    books, err := queries.GetTopRatedBooks(ctx, db.GetTopRatedBooksParams{
        Column1: 3,  // Minimum review count
        Limit:   10, // Maximum results
    })
    if err != nil {
        log.Printf("Error fetching top rated books: %v", err)
        return
    }

    fmt.Println("Top Rated Books:")
    fmt.Println("----------------")
    for i, book := range books {
        fmt.Printf("%d. %s by %s\n", i+1, book.Title, book.AuthorName)
        fmt.Printf("   Rating: %s (%d reviews)\n",
            book.AverageRating.Int.String(), book.ReviewCount)
    }
}
```

## Batch Operations

sqlc supports batch operations for efficient bulk inserts:

```sql
-- db/queries/batch.sql
-- Batch operation queries

-- name: CreateBooks :copyfrom
-- Bulk inserts multiple books at once using COPY protocol
INSERT INTO books (title, author_id, isbn, price, published_date, category, stock_quantity)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

Using batch inserts in Go:

```go
// batch_operations.go
// Demonstrates batch insert operations

package main

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/jackc/pgx/v5/pgtype"
    "github.com/example/bookstore/db/sqlc"
)

// bulkInsertBooks efficiently inserts multiple books
func bulkInsertBooks(ctx context.Context, pool *pgxpool.Pool, authorID int64, titles []string) error {
    queries := db.New(pool)

    // Prepare batch insert parameters
    params := make([]db.CreateBooksParams, len(titles))
    for i, title := range titles {
        price := pgtype.Numeric{}
        price.Scan("24.99")

        params[i] = db.CreateBooksParams{
            Title:         title,
            AuthorID:      authorID,
            Isbn:          pgtype.Text{Valid: false},
            Price:         price,
            PublishedDate: pgtype.Date{Valid: false},
            Category:      pgtype.Text{String: "Fiction", Valid: true},
            StockQuantity: 100,
        }
    }

    // Execute batch insert using COPY protocol
    count, err := queries.CreateBooks(ctx, params)
    if err != nil {
        return fmt.Errorf("batch insert failed: %w", err)
    }

    fmt.Printf("Successfully inserted %d books\n", count)
    return nil
}
```

## Custom Type Overrides

Configure sqlc to use custom Go types for database columns:

```yaml
# sqlc.yaml with custom type overrides
version: "2"
sql:
  - engine: "postgresql"
    queries: "db/queries"
    schema: "db/migrations"
    gen:
      go:
        package: "db"
        out: "db/sqlc"
        sql_package: "pgx/v5"
        emit_json_tags: true
        overrides:
          # Use uuid.UUID instead of pgtype.UUID
          - db_type: "uuid"
            go_type:
              import: "github.com/google/uuid"
              type: "UUID"
          # Use decimal.Decimal for money types
          - db_type: "numeric"
            go_type:
              import: "github.com/shopspring/decimal"
              type: "Decimal"
          # Use custom type for specific columns
          - column: "books.category"
            go_type:
              import: "github.com/example/bookstore/types"
              type: "Category"
          # Use time.Time for timestamps
          - db_type: "timestamptz"
            go_type: "time.Time"
```

## Testing with sqlc

Write tests for your database layer using testcontainers or an in-memory database:

```go
// db_test.go
// Database integration tests

package main

import (
    "context"
    "testing"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/jackc/pgx/v5/pgtype"
    "github.com/example/bookstore/db/sqlc"
)

func setupTestDB(t *testing.T) (*pgxpool.Pool, func()) {
    ctx := context.Background()

    // Connect to test database
    pool, err := pgxpool.New(ctx, "postgres://postgres:password@localhost:5432/bookstore_test")
    if err != nil {
        t.Fatalf("Failed to connect to test database: %v", err)
    }

    // Return pool and cleanup function
    return pool, func() {
        pool.Close()
    }
}

func TestCreateAndGetAuthor(t *testing.T) {
    pool, cleanup := setupTestDB(t)
    defer cleanup()

    ctx := context.Background()
    queries := db.New(pool)

    // Create an author
    created, err := queries.CreateAuthor(ctx, db.CreateAuthorParams{
        Name:  "Test Author",
        Email: pgtype.Text{String: "test@example.com", Valid: true},
        Bio:   pgtype.Text{String: "Test bio", Valid: true},
    })
    if err != nil {
        t.Fatalf("Failed to create author: %v", err)
    }

    // Fetch the author
    fetched, err := queries.GetAuthor(ctx, created.ID)
    if err != nil {
        t.Fatalf("Failed to fetch author: %v", err)
    }

    // Verify fields match
    if fetched.Name != created.Name {
        t.Errorf("Expected name %s, got %s", created.Name, fetched.Name)
    }

    // Cleanup
    err = queries.DeleteAuthor(ctx, created.ID)
    if err != nil {
        t.Errorf("Failed to delete author: %v", err)
    }
}

func TestListAuthorsWithPagination(t *testing.T) {
    pool, cleanup := setupTestDB(t)
    defer cleanup()

    ctx := context.Background()
    queries := db.New(pool)

    // Create multiple authors
    for i := 0; i < 5; i++ {
        _, err := queries.CreateAuthor(ctx, db.CreateAuthorParams{
            Name:  fmt.Sprintf("Author %d", i),
            Email: pgtype.Text{Valid: false},
            Bio:   pgtype.Text{Valid: false},
        })
        if err != nil {
            t.Fatalf("Failed to create author %d: %v", i, err)
        }
    }

    // Test pagination
    page1, err := queries.ListAuthors(ctx, db.ListAuthorsParams{
        Limit:  2,
        Offset: 0,
    })
    if err != nil {
        t.Fatalf("Failed to list authors page 1: %v", err)
    }

    if len(page1) != 2 {
        t.Errorf("Expected 2 authors on page 1, got %d", len(page1))
    }

    page2, err := queries.ListAuthors(ctx, db.ListAuthorsParams{
        Limit:  2,
        Offset: 2,
    })
    if err != nil {
        t.Fatalf("Failed to list authors page 2: %v", err)
    }

    if len(page2) != 2 {
        t.Errorf("Expected 2 authors on page 2, got %d", len(page2))
    }
}
```

## Best Practices

Follow these best practices when using sqlc in production:

### Organize Queries by Domain

Keep related queries together in separate files:

```
db/queries/
├── authors.sql      # Author-related queries
├── books.sql        # Book-related queries
├── reviews.sql      # Review-related queries
├── reports.sql      # Reporting/analytics queries
└── admin.sql        # Administrative queries
```

### Use Meaningful Query Names

Choose descriptive names that indicate what the query does:

```sql
-- Good: Clear and descriptive
-- name: GetActiveSubscribersByPlan :many
-- name: CreateOrderWithItems :one
-- name: UpdateUserLastLoginTime :exec

-- Avoid: Vague or unclear
-- name: GetData :many
-- name: DoUpdate :exec
```

### Handle Errors Appropriately

Always handle the pgx.ErrNoRows case for :one queries:

```go
// Proper error handling for single-row queries
author, err := queries.GetAuthor(ctx, authorID)
if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, fmt.Errorf("author with ID %d not found", authorID)
    }
    return nil, fmt.Errorf("database error: %w", err)
}
```

### Run sqlc in CI/CD

Add sqlc verification to your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  sqlc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install sqlc
        run: |
          curl -L https://github.com/sqlc-dev/sqlc/releases/download/v1.25.0/sqlc_1.25.0_linux_amd64.tar.gz | tar xz
          sudo mv sqlc /usr/local/bin/

      - name: Verify sqlc generation
        run: |
          sqlc generate
          git diff --exit-code
```

## Conclusion

sqlc provides an excellent balance between the type safety of ORMs and the flexibility of raw SQL. By generating Go code from your SQL queries, sqlc eliminates runtime type errors while giving you full control over your database interactions.

Key takeaways from this guide:

1. **Installation is straightforward** - Use Homebrew, Go install, or Docker
2. **Configuration is flexible** - Customize output with sqlc.yaml options
3. **SQL annotations are simple** - Use :one, :many, :exec to control return types
4. **Generated code is readable** - Inspect and debug easily
5. **Transactions work naturally** - Pass transaction to db.New()
6. **Complex queries are supported** - Joins and aggregations work seamlessly
7. **Testing is clean** - Use the same generated code in tests

Start using sqlc in your next Go project to experience the productivity boost of compile-time SQL validation combined with the full power of SQL.

## Additional Resources

- [sqlc Official Documentation](https://docs.sqlc.dev/)
- [sqlc GitHub Repository](https://github.com/sqlc-dev/sqlc)
- [pgx Driver Documentation](https://github.com/jackc/pgx)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
