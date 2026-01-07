# How to Write Integration Tests for Go APIs with Testcontainers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Testing, Testcontainers, Integration Tests, Docker, PostgreSQL, Redis

Description: Write reliable integration tests for Go APIs using Testcontainers with real PostgreSQL and Redis in isolated Docker containers.

---

Integration tests are essential for verifying that your Go API works correctly with external dependencies like databases and caches. Unlike unit tests that mock these dependencies, integration tests use real services to catch issues that mocks might miss, such as SQL syntax errors, connection handling problems, or cache serialization bugs.

Testcontainers-Go is a library that makes running Docker containers for integration tests simple and reliable. It automatically manages container lifecycle, handles port mapping, and ensures clean test isolation. In this guide, we will build a complete integration testing setup for a Go API that uses PostgreSQL for persistence and Redis for caching.

## Prerequisites

Before we begin, make sure you have:

- Go 1.21 or later installed
- Docker Desktop or Docker Engine running
- Basic familiarity with Go testing

## Project Structure

We will organize our project with the following structure:

```
myapi/
├── go.mod
├── go.sum
├── main.go
├── internal/
│   ├── database/
│   │   └── postgres.go
│   ├── cache/
│   │   └── redis.go
│   ├── handlers/
│   │   └── user.go
│   └── models/
│       └── user.go
└── tests/
    ├── integration/
    │   ├── setup_test.go
    │   ├── postgres_test.go
    │   ├── redis_test.go
    │   └── api_test.go
    └── testdata/
        └── fixtures.sql
```

## Installing Dependencies

First, let us set up our Go module and install the required dependencies:

```bash
# Initialize the Go module
go mod init myapi

# Install Testcontainers-Go and database drivers
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/testcontainers/testcontainers-go/modules/redis
go get github.com/lib/pq
go get github.com/redis/go-redis/v9
```

## Setting Up the Database Layer

Let us create a PostgreSQL database layer that our tests will verify:

```go
// internal/database/postgres.go
package database

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    _ "github.com/lib/pq"
)

// Config holds the PostgreSQL connection configuration
type Config struct {
    Host     string
    Port     int
    User     string
    Password string
    DBName   string
    SSLMode  string
}

// PostgresDB wraps the SQL database connection with custom methods
type PostgresDB struct {
    db *sql.DB
}

// NewPostgresDB creates a new PostgreSQL connection with the given configuration
func NewPostgresDB(cfg Config) (*PostgresDB, error) {
    // Build the connection string from configuration
    connStr := fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
    )

    // Open the database connection
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    // Configure connection pool settings for production use
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Verify the connection is working
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &PostgresDB{db: db}, nil
}

// Close closes the database connection
func (p *PostgresDB) Close() error {
    return p.db.Close()
}

// DB returns the underlying sql.DB for direct access when needed
func (p *PostgresDB) DB() *sql.DB {
    return p.db
}

// Migrate runs database migrations to set up the schema
func (p *PostgresDB) Migrate(ctx context.Context) error {
    // Create the users table if it does not exist
    query := `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `

    _, err := p.db.ExecContext(ctx, query)
    if err != nil {
        return fmt.Errorf("failed to run migrations: %w", err)
    }

    return nil
}
```

## Setting Up the Cache Layer

Now let us create a Redis cache layer:

```go
// internal/cache/redis.go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// Config holds the Redis connection configuration
type Config struct {
    Host     string
    Port     int
    Password string
    DB       int
}

// RedisCache wraps the Redis client with application-specific methods
type RedisCache struct {
    client *redis.Client
}

// NewRedisCache creates a new Redis cache connection
func NewRedisCache(cfg Config) (*RedisCache, error) {
    // Create the Redis client with the given configuration
    client := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
        Password: cfg.Password,
        DB:       cfg.DB,
    })

    // Verify the connection is working
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("failed to ping redis: %w", err)
    }

    return &RedisCache{client: client}, nil
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
    return r.client.Close()
}

// Client returns the underlying Redis client for direct access
func (r *RedisCache) Client() *redis.Client {
    return r.client
}

// Set stores a value in the cache with an expiration time
func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
    // Serialize the value to JSON for storage
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("failed to marshal value: %w", err)
    }

    // Store the serialized data in Redis
    if err := r.client.Set(ctx, key, data, expiration).Err(); err != nil {
        return fmt.Errorf("failed to set key: %w", err)
    }

    return nil
}

// Get retrieves a value from the cache and deserializes it
func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
    // Retrieve the data from Redis
    data, err := r.client.Get(ctx, key).Bytes()
    if err != nil {
        if err == redis.Nil {
            return fmt.Errorf("key not found: %s", key)
        }
        return fmt.Errorf("failed to get key: %w", err)
    }

    // Deserialize the JSON data into the destination
    if err := json.Unmarshal(data, dest); err != nil {
        return fmt.Errorf("failed to unmarshal value: %w", err)
    }

    return nil
}

// Delete removes a key from the cache
func (r *RedisCache) Delete(ctx context.Context, key string) error {
    if err := r.client.Del(ctx, key).Err(); err != nil {
        return fmt.Errorf("failed to delete key: %w", err)
    }
    return nil
}

// Exists checks if a key exists in the cache
func (r *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
    count, err := r.client.Exists(ctx, key).Result()
    if err != nil {
        return false, fmt.Errorf("failed to check key existence: %w", err)
    }
    return count > 0, nil
}
```

## Creating the User Model

Let us define the user model that we will use throughout our tests:

```go
// internal/models/user.go
package models

import (
    "time"
)

// User represents a user in our system
type User struct {
    ID        int       `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// UserRepository defines the interface for user data access
type UserRepository interface {
    Create(email, name string) (*User, error)
    GetByID(id int) (*User, error)
    GetByEmail(email string) (*User, error)
    Update(id int, name string) (*User, error)
    Delete(id int) error
    List(limit, offset int) ([]*User, error)
}
```

## Setting Up the Test Container Infrastructure

Now we get to the core of our integration testing setup. This file manages the lifecycle of our Docker containers:

```go
// tests/integration/setup_test.go
package integration

import (
    "context"
    "database/sql"
    "fmt"
    "os"
    "testing"
    "time"

    "github.com/redis/go-redis/v9"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
    tcRedis "github.com/testcontainers/testcontainers-go/modules/redis"
    "github.com/testcontainers/testcontainers-go/wait"

    _ "github.com/lib/pq"
)

// TestContainers holds references to our test containers
type TestContainers struct {
    PostgresContainer *postgres.PostgresContainer
    RedisContainer    *tcRedis.RedisContainer
    PostgresDB        *sql.DB
    RedisClient       *redis.Client
}

// Global test containers instance for sharing across tests
var testContainers *TestContainers

// TestMain is the entry point for all tests in this package
// It sets up containers before tests run and tears them down after
func TestMain(m *testing.M) {
    // Set up the test containers
    ctx := context.Background()
    var err error
    testContainers, err = SetupContainers(ctx)
    if err != nil {
        fmt.Printf("Failed to set up containers: %v\n", err)
        os.Exit(1)
    }

    // Run all the tests
    code := m.Run()

    // Clean up the containers after tests complete
    if err := testContainers.Cleanup(ctx); err != nil {
        fmt.Printf("Failed to clean up containers: %v\n", err)
    }

    os.Exit(code)
}

// SetupContainers creates and starts the PostgreSQL and Redis containers
func SetupContainers(ctx context.Context) (*TestContainers, error) {
    tc := &TestContainers{}

    // Start PostgreSQL container with custom configuration
    pgContainer, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("testuser"),
        postgres.WithPassword("testpass"),
        // Wait for PostgreSQL to be ready before proceeding
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(60*time.Second),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to start postgres container: %w", err)
    }
    tc.PostgresContainer = pgContainer

    // Get the PostgreSQL connection string for our tests
    pgConnStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        return nil, fmt.Errorf("failed to get postgres connection string: %w", err)
    }

    // Connect to PostgreSQL
    db, err := sql.Open("postgres", pgConnStr)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to postgres: %w", err)
    }

    // Verify the connection is working
    if err := db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping postgres: %w", err)
    }
    tc.PostgresDB = db

    // Start Redis container
    redisContainer, err := tcRedis.Run(ctx,
        "redis:7-alpine",
        // Wait for Redis to be ready
        testcontainers.WithWaitStrategy(
            wait.ForLog("Ready to accept connections").
                WithStartupTimeout(30*time.Second),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to start redis container: %w", err)
    }
    tc.RedisContainer = redisContainer

    // Get the Redis connection endpoint
    redisEndpoint, err := redisContainer.Endpoint(ctx, "")
    if err != nil {
        return nil, fmt.Errorf("failed to get redis endpoint: %w", err)
    }

    // Connect to Redis
    redisClient := redis.NewClient(&redis.Options{
        Addr: redisEndpoint,
    })

    // Verify the Redis connection is working
    if err := redisClient.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("failed to ping redis: %w", err)
    }
    tc.RedisClient = redisClient

    // Run database migrations to set up the schema
    if err := runMigrations(ctx, db); err != nil {
        return nil, fmt.Errorf("failed to run migrations: %w", err)
    }

    return tc, nil
}

// runMigrations creates the database schema for our tests
func runMigrations(ctx context.Context, db *sql.DB) error {
    // Create the users table and indexes
    query := `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `

    _, err := db.ExecContext(ctx, query)
    return err
}

// Cleanup terminates all test containers and closes connections
func (tc *TestContainers) Cleanup(ctx context.Context) error {
    // Close the database connection
    if tc.PostgresDB != nil {
        if err := tc.PostgresDB.Close(); err != nil {
            return fmt.Errorf("failed to close postgres connection: %w", err)
        }
    }

    // Close the Redis connection
    if tc.RedisClient != nil {
        if err := tc.RedisClient.Close(); err != nil {
            return fmt.Errorf("failed to close redis connection: %w", err)
        }
    }

    // Terminate the PostgreSQL container
    if tc.PostgresContainer != nil {
        if err := tc.PostgresContainer.Terminate(ctx); err != nil {
            return fmt.Errorf("failed to terminate postgres container: %w", err)
        }
    }

    // Terminate the Redis container
    if tc.RedisContainer != nil {
        if err := tc.RedisContainer.Terminate(ctx); err != nil {
            return fmt.Errorf("failed to terminate redis container: %w", err)
        }
    }

    return nil
}

// ResetDatabase cleans all data from the database between tests
func (tc *TestContainers) ResetDatabase(ctx context.Context) error {
    // Truncate all tables to ensure clean state between tests
    _, err := tc.PostgresDB.ExecContext(ctx, "TRUNCATE TABLE users RESTART IDENTITY CASCADE")
    return err
}

// ResetRedis flushes all data from Redis between tests
func (tc *TestContainers) ResetRedis(ctx context.Context) error {
    return tc.RedisClient.FlushAll(ctx).Err()
}

// ResetAll cleans both database and cache
func (tc *TestContainers) ResetAll(ctx context.Context) error {
    if err := tc.ResetDatabase(ctx); err != nil {
        return err
    }
    return tc.ResetRedis(ctx)
}
```

## Writing PostgreSQL Integration Tests

Now let us write tests that verify our PostgreSQL operations work correctly:

```go
// tests/integration/postgres_test.go
package integration

import (
    "context"
    "testing"
    "time"
)

// TestUserCreation verifies that we can create users in PostgreSQL
func TestUserCreation(t *testing.T) {
    ctx := context.Background()

    // Reset the database to ensure a clean state
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert a new user into the database
    query := `
        INSERT INTO users (email, name)
        VALUES ($1, $2)
        RETURNING id, created_at
    `
    var id int
    var createdAt time.Time
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, query, "test@example.com", "Test User",
    ).Scan(&id, &createdAt)

    if err != nil {
        t.Fatalf("Failed to insert user: %v", err)
    }

    // Verify the user was created with valid values
    if id <= 0 {
        t.Errorf("Expected positive ID, got %d", id)
    }
    if createdAt.IsZero() {
        t.Error("Expected non-zero created_at timestamp")
    }
}

// TestUserRetrieval verifies that we can read users from PostgreSQL
func TestUserRetrieval(t *testing.T) {
    ctx := context.Background()

    // Reset and seed the database with test data
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert a test user
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var insertedID int
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, insertQuery, "retrieve@example.com", "Retrieve User",
    ).Scan(&insertedID)
    if err != nil {
        t.Fatalf("Failed to insert test user: %v", err)
    }

    // Retrieve the user by ID
    selectQuery := `SELECT id, email, name FROM users WHERE id = $1`
    var id int
    var email, name string
    err = testContainers.PostgresDB.QueryRowContext(
        ctx, selectQuery, insertedID,
    ).Scan(&id, &email, &name)

    if err != nil {
        t.Fatalf("Failed to retrieve user: %v", err)
    }

    // Verify the retrieved data matches what we inserted
    if id != insertedID {
        t.Errorf("Expected ID %d, got %d", insertedID, id)
    }
    if email != "retrieve@example.com" {
        t.Errorf("Expected email 'retrieve@example.com', got '%s'", email)
    }
    if name != "Retrieve User" {
        t.Errorf("Expected name 'Retrieve User', got '%s'", name)
    }
}

// TestUserUpdate verifies that we can update users in PostgreSQL
func TestUserUpdate(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert a user to update
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var id int
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, insertQuery, "update@example.com", "Original Name",
    ).Scan(&id)
    if err != nil {
        t.Fatalf("Failed to insert test user: %v", err)
    }

    // Update the user's name
    updateQuery := `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`
    result, err := testContainers.PostgresDB.ExecContext(ctx, updateQuery, "Updated Name", id)
    if err != nil {
        t.Fatalf("Failed to update user: %v", err)
    }

    // Verify exactly one row was affected
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        t.Fatalf("Failed to get rows affected: %v", err)
    }
    if rowsAffected != 1 {
        t.Errorf("Expected 1 row affected, got %d", rowsAffected)
    }

    // Verify the update was persisted
    selectQuery := `SELECT name FROM users WHERE id = $1`
    var name string
    err = testContainers.PostgresDB.QueryRowContext(ctx, selectQuery, id).Scan(&name)
    if err != nil {
        t.Fatalf("Failed to retrieve updated user: %v", err)
    }
    if name != "Updated Name" {
        t.Errorf("Expected name 'Updated Name', got '%s'", name)
    }
}

// TestUserDeletion verifies that we can delete users from PostgreSQL
func TestUserDeletion(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert a user to delete
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var id int
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, insertQuery, "delete@example.com", "Delete User",
    ).Scan(&id)
    if err != nil {
        t.Fatalf("Failed to insert test user: %v", err)
    }

    // Delete the user
    deleteQuery := `DELETE FROM users WHERE id = $1`
    result, err := testContainers.PostgresDB.ExecContext(ctx, deleteQuery, id)
    if err != nil {
        t.Fatalf("Failed to delete user: %v", err)
    }

    // Verify exactly one row was deleted
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        t.Fatalf("Failed to get rows affected: %v", err)
    }
    if rowsAffected != 1 {
        t.Errorf("Expected 1 row affected, got %d", rowsAffected)
    }

    // Verify the user no longer exists
    selectQuery := `SELECT id FROM users WHERE id = $1`
    err = testContainers.PostgresDB.QueryRowContext(ctx, selectQuery, id).Scan(&id)
    if err == nil {
        t.Error("Expected error when retrieving deleted user, got nil")
    }
}

// TestUniqueEmailConstraint verifies the database enforces unique emails
func TestUniqueEmailConstraint(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert the first user
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2)`
    _, err := testContainers.PostgresDB.ExecContext(
        ctx, insertQuery, "unique@example.com", "First User",
    )
    if err != nil {
        t.Fatalf("Failed to insert first user: %v", err)
    }

    // Attempt to insert a second user with the same email
    _, err = testContainers.PostgresDB.ExecContext(
        ctx, insertQuery, "unique@example.com", "Second User",
    )

    // We expect this to fail with a unique constraint violation
    if err == nil {
        t.Error("Expected unique constraint violation, got nil error")
    }
}

// TestListUsersWithPagination verifies pagination works correctly
func TestListUsersWithPagination(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Insert multiple users for pagination testing
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2)`
    for i := 1; i <= 10; i++ {
        _, err := testContainers.PostgresDB.ExecContext(
            ctx, insertQuery,
            "user"+string(rune('0'+i))+"@example.com",
            "User "+string(rune('0'+i)),
        )
        if err != nil {
            t.Fatalf("Failed to insert user %d: %v", i, err)
        }
    }

    // Query with pagination: get 5 users, skip first 3
    selectQuery := `SELECT id FROM users ORDER BY id LIMIT $1 OFFSET $2`
    rows, err := testContainers.PostgresDB.QueryContext(ctx, selectQuery, 5, 3)
    if err != nil {
        t.Fatalf("Failed to query users: %v", err)
    }
    defer rows.Close()

    // Count the returned rows
    count := 0
    for rows.Next() {
        count++
        var id int
        if err := rows.Scan(&id); err != nil {
            t.Fatalf("Failed to scan row: %v", err)
        }
    }

    if count != 5 {
        t.Errorf("Expected 5 users, got %d", count)
    }
}
```

## Writing Redis Integration Tests

Now let us test our Redis caching functionality:

```go
// tests/integration/redis_test.go
package integration

import (
    "context"
    "encoding/json"
    "testing"
    "time"
)

// TestRedisSetAndGet verifies basic set and get operations
func TestRedisSetAndGet(t *testing.T) {
    ctx := context.Background()

    // Reset Redis to ensure a clean state
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    // Set a simple string value
    key := "test:simple"
    value := "hello world"

    err := testContainers.RedisClient.Set(ctx, key, value, time.Minute).Err()
    if err != nil {
        t.Fatalf("Failed to set value: %v", err)
    }

    // Retrieve the value
    result, err := testContainers.RedisClient.Get(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to get value: %v", err)
    }

    if result != value {
        t.Errorf("Expected '%s', got '%s'", value, result)
    }
}

// TestRedisJSONStorage verifies we can store and retrieve JSON objects
func TestRedisJSONStorage(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    // Define a struct to store
    type CachedUser struct {
        ID    int    `json:"id"`
        Email string `json:"email"`
        Name  string `json:"name"`
    }

    user := CachedUser{
        ID:    42,
        Email: "cached@example.com",
        Name:  "Cached User",
    }

    // Serialize and store the user
    data, err := json.Marshal(user)
    if err != nil {
        t.Fatalf("Failed to marshal user: %v", err)
    }

    key := "user:42"
    err = testContainers.RedisClient.Set(ctx, key, data, time.Minute).Err()
    if err != nil {
        t.Fatalf("Failed to set user: %v", err)
    }

    // Retrieve and deserialize the user
    result, err := testContainers.RedisClient.Get(ctx, key).Bytes()
    if err != nil {
        t.Fatalf("Failed to get user: %v", err)
    }

    var retrieved CachedUser
    if err := json.Unmarshal(result, &retrieved); err != nil {
        t.Fatalf("Failed to unmarshal user: %v", err)
    }

    // Verify all fields match
    if retrieved.ID != user.ID {
        t.Errorf("Expected ID %d, got %d", user.ID, retrieved.ID)
    }
    if retrieved.Email != user.Email {
        t.Errorf("Expected email '%s', got '%s'", user.Email, retrieved.Email)
    }
    if retrieved.Name != user.Name {
        t.Errorf("Expected name '%s', got '%s'", user.Name, retrieved.Name)
    }
}

// TestRedisExpiration verifies that keys expire correctly
func TestRedisExpiration(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    // Set a key with a very short expiration
    key := "test:expiring"
    value := "temporary"

    err := testContainers.RedisClient.Set(ctx, key, value, 100*time.Millisecond).Err()
    if err != nil {
        t.Fatalf("Failed to set value: %v", err)
    }

    // Verify the key exists immediately
    exists, err := testContainers.RedisClient.Exists(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to check existence: %v", err)
    }
    if exists != 1 {
        t.Error("Expected key to exist immediately after setting")
    }

    // Wait for the key to expire
    time.Sleep(200 * time.Millisecond)

    // Verify the key no longer exists
    exists, err = testContainers.RedisClient.Exists(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to check existence after expiration: %v", err)
    }
    if exists != 0 {
        t.Error("Expected key to have expired")
    }
}

// TestRedisDelete verifies we can delete keys
func TestRedisDelete(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    // Set a key
    key := "test:delete"
    err := testContainers.RedisClient.Set(ctx, key, "to be deleted", time.Minute).Err()
    if err != nil {
        t.Fatalf("Failed to set value: %v", err)
    }

    // Verify it exists
    exists, _ := testContainers.RedisClient.Exists(ctx, key).Result()
    if exists != 1 {
        t.Fatal("Key should exist before deletion")
    }

    // Delete the key
    deleted, err := testContainers.RedisClient.Del(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to delete key: %v", err)
    }
    if deleted != 1 {
        t.Errorf("Expected 1 key deleted, got %d", deleted)
    }

    // Verify it no longer exists
    exists, _ = testContainers.RedisClient.Exists(ctx, key).Result()
    if exists != 0 {
        t.Error("Key should not exist after deletion")
    }
}

// TestRedisIncrement verifies atomic increment operations
func TestRedisIncrement(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    key := "counter:views"

    // Increment the counter multiple times
    for i := 0; i < 5; i++ {
        _, err := testContainers.RedisClient.Incr(ctx, key).Result()
        if err != nil {
            t.Fatalf("Failed to increment counter: %v", err)
        }
    }

    // Verify the final count
    count, err := testContainers.RedisClient.Get(ctx, key).Int64()
    if err != nil {
        t.Fatalf("Failed to get counter: %v", err)
    }
    if count != 5 {
        t.Errorf("Expected count 5, got %d", count)
    }
}

// TestRedisHash verifies hash operations for structured data
func TestRedisHash(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    key := "user:session:abc123"

    // Set multiple hash fields at once
    err := testContainers.RedisClient.HSet(ctx, key, map[string]interface{}{
        "user_id":    42,
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0",
        "created_at": time.Now().Unix(),
    }).Err()
    if err != nil {
        t.Fatalf("Failed to set hash: %v", err)
    }

    // Retrieve a specific field
    userID, err := testContainers.RedisClient.HGet(ctx, key, "user_id").Int()
    if err != nil {
        t.Fatalf("Failed to get hash field: %v", err)
    }
    if userID != 42 {
        t.Errorf("Expected user_id 42, got %d", userID)
    }

    // Retrieve all fields
    allFields, err := testContainers.RedisClient.HGetAll(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to get all hash fields: %v", err)
    }
    if len(allFields) != 4 {
        t.Errorf("Expected 4 fields, got %d", len(allFields))
    }
}

// TestRedisList verifies list operations for queues
func TestRedisList(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    key := "queue:tasks"

    // Push items to the list
    err := testContainers.RedisClient.RPush(ctx, key, "task1", "task2", "task3").Err()
    if err != nil {
        t.Fatalf("Failed to push to list: %v", err)
    }

    // Get the list length
    length, err := testContainers.RedisClient.LLen(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to get list length: %v", err)
    }
    if length != 3 {
        t.Errorf("Expected length 3, got %d", length)
    }

    // Pop an item from the front (FIFO queue behavior)
    item, err := testContainers.RedisClient.LPop(ctx, key).Result()
    if err != nil {
        t.Fatalf("Failed to pop from list: %v", err)
    }
    if item != "task1" {
        t.Errorf("Expected 'task1', got '%s'", item)
    }

    // Verify the new length
    length, _ = testContainers.RedisClient.LLen(ctx, key).Result()
    if length != 2 {
        t.Errorf("Expected length 2 after pop, got %d", length)
    }
}
```

## Writing Full API Integration Tests

Now let us create tests that verify the complete API flow with both PostgreSQL and Redis working together:

```go
// tests/integration/api_test.go
package integration

import (
    "context"
    "encoding/json"
    "testing"
    "time"
)

// CachedUser represents a user stored in the cache
type CachedUser struct {
    ID        int       `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    CachedAt  time.Time `json:"cached_at"`
}

// TestCacheAsidePattern tests the common cache-aside pattern:
// 1. Check cache first
// 2. On cache miss, query database
// 3. Store result in cache
// 4. Return result
func TestCacheAsidePattern(t *testing.T) {
    ctx := context.Background()

    // Reset both database and cache
    if err := testContainers.ResetAll(ctx); err != nil {
        t.Fatalf("Failed to reset: %v", err)
    }

    // Insert a user into the database
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var userID int
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, insertQuery, "cachetest@example.com", "Cache Test User",
    ).Scan(&userID)
    if err != nil {
        t.Fatalf("Failed to insert user: %v", err)
    }

    cacheKey := "user:" + string(rune('0'+userID))

    // Step 1: Verify cache miss
    exists, _ := testContainers.RedisClient.Exists(ctx, cacheKey).Result()
    if exists != 0 {
        t.Fatal("Cache should be empty initially")
    }

    // Step 2: Query database (simulating cache miss scenario)
    selectQuery := `SELECT id, email, name FROM users WHERE id = $1`
    var id int
    var email, name string
    err = testContainers.PostgresDB.QueryRowContext(ctx, selectQuery, userID).Scan(&id, &email, &name)
    if err != nil {
        t.Fatalf("Failed to query user: %v", err)
    }

    // Step 3: Store result in cache
    cachedUser := CachedUser{
        ID:       id,
        Email:    email,
        Name:     name,
        CachedAt: time.Now(),
    }
    data, _ := json.Marshal(cachedUser)
    err = testContainers.RedisClient.Set(ctx, cacheKey, data, 5*time.Minute).Err()
    if err != nil {
        t.Fatalf("Failed to cache user: %v", err)
    }

    // Step 4: Verify cache hit on subsequent request
    cachedData, err := testContainers.RedisClient.Get(ctx, cacheKey).Bytes()
    if err != nil {
        t.Fatalf("Failed to get from cache: %v", err)
    }

    var retrieved CachedUser
    if err := json.Unmarshal(cachedData, &retrieved); err != nil {
        t.Fatalf("Failed to unmarshal cached user: %v", err)
    }

    if retrieved.ID != userID {
        t.Errorf("Cached user ID mismatch: expected %d, got %d", userID, retrieved.ID)
    }
}

// TestCacheInvalidationOnUpdate verifies cache is invalidated when data changes
func TestCacheInvalidationOnUpdate(t *testing.T) {
    ctx := context.Background()

    // Reset both database and cache
    if err := testContainers.ResetAll(ctx); err != nil {
        t.Fatalf("Failed to reset: %v", err)
    }

    // Insert and cache a user
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var userID int
    err := testContainers.PostgresDB.QueryRowContext(
        ctx, insertQuery, "invalidate@example.com", "Original Name",
    ).Scan(&userID)
    if err != nil {
        t.Fatalf("Failed to insert user: %v", err)
    }

    cacheKey := "user:invalidation:" + string(rune('0'+userID))

    // Cache the user
    cachedUser := CachedUser{ID: userID, Email: "invalidate@example.com", Name: "Original Name"}
    data, _ := json.Marshal(cachedUser)
    testContainers.RedisClient.Set(ctx, cacheKey, data, 5*time.Minute)

    // Update the user in the database
    updateQuery := `UPDATE users SET name = $1 WHERE id = $2`
    _, err = testContainers.PostgresDB.ExecContext(ctx, updateQuery, "Updated Name", userID)
    if err != nil {
        t.Fatalf("Failed to update user: %v", err)
    }

    // Invalidate the cache entry
    err = testContainers.RedisClient.Del(ctx, cacheKey).Err()
    if err != nil {
        t.Fatalf("Failed to invalidate cache: %v", err)
    }

    // Verify cache was invalidated
    exists, _ := testContainers.RedisClient.Exists(ctx, cacheKey).Result()
    if exists != 0 {
        t.Error("Cache should be invalidated after update")
    }

    // Simulate fetching fresh data and re-caching
    selectQuery := `SELECT name FROM users WHERE id = $1`
    var name string
    err = testContainers.PostgresDB.QueryRowContext(ctx, selectQuery, userID).Scan(&name)
    if err != nil {
        t.Fatalf("Failed to query updated user: %v", err)
    }

    if name != "Updated Name" {
        t.Errorf("Expected 'Updated Name', got '%s'", name)
    }
}

// TestConcurrentDatabaseAccess verifies database handles concurrent operations
func TestConcurrentDatabaseAccess(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Run concurrent inserts
    done := make(chan error, 10)

    for i := 0; i < 10; i++ {
        go func(index int) {
            email := "concurrent" + string(rune('0'+index)) + "@example.com"
            name := "Concurrent User " + string(rune('0'+index))

            insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2)`
            _, err := testContainers.PostgresDB.ExecContext(ctx, insertQuery, email, name)
            done <- err
        }(i)
    }

    // Wait for all goroutines and check for errors
    for i := 0; i < 10; i++ {
        if err := <-done; err != nil {
            t.Errorf("Concurrent insert failed: %v", err)
        }
    }

    // Verify all users were created
    countQuery := `SELECT COUNT(*) FROM users`
    var count int
    err := testContainers.PostgresDB.QueryRowContext(ctx, countQuery).Scan(&count)
    if err != nil {
        t.Fatalf("Failed to count users: %v", err)
    }

    if count != 10 {
        t.Errorf("Expected 10 users, got %d", count)
    }
}

// TestTransactionRollback verifies database transactions work correctly
func TestTransactionRollback(t *testing.T) {
    ctx := context.Background()

    // Reset the database
    if err := testContainers.ResetDatabase(ctx); err != nil {
        t.Fatalf("Failed to reset database: %v", err)
    }

    // Start a transaction
    tx, err := testContainers.PostgresDB.BeginTx(ctx, nil)
    if err != nil {
        t.Fatalf("Failed to begin transaction: %v", err)
    }

    // Insert a user within the transaction
    insertQuery := `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`
    var userID int
    err = tx.QueryRowContext(ctx, insertQuery, "rollback@example.com", "Rollback User").Scan(&userID)
    if err != nil {
        t.Fatalf("Failed to insert in transaction: %v", err)
    }

    // Verify user exists within transaction
    selectQuery := `SELECT id FROM users WHERE id = $1`
    var foundID int
    err = tx.QueryRowContext(ctx, selectQuery, userID).Scan(&foundID)
    if err != nil {
        t.Fatalf("User should exist within transaction: %v", err)
    }

    // Rollback the transaction
    if err := tx.Rollback(); err != nil {
        t.Fatalf("Failed to rollback: %v", err)
    }

    // Verify user does not exist after rollback
    err = testContainers.PostgresDB.QueryRowContext(ctx, selectQuery, userID).Scan(&foundID)
    if err == nil {
        t.Error("User should not exist after rollback")
    }
}

// TestSessionStorageInRedis tests using Redis for session management
func TestSessionStorageInRedis(t *testing.T) {
    ctx := context.Background()

    // Reset Redis
    if err := testContainers.ResetRedis(ctx); err != nil {
        t.Fatalf("Failed to reset redis: %v", err)
    }

    // Create a session
    sessionID := "sess_abc123xyz"
    sessionKey := "session:" + sessionID

    session := map[string]interface{}{
        "user_id":    42,
        "email":      "session@example.com",
        "created_at": time.Now().Unix(),
        "last_access": time.Now().Unix(),
    }

    // Store session as a hash
    err := testContainers.RedisClient.HSet(ctx, sessionKey, session).Err()
    if err != nil {
        t.Fatalf("Failed to create session: %v", err)
    }

    // Set session expiration (30 minutes)
    testContainers.RedisClient.Expire(ctx, sessionKey, 30*time.Minute)

    // Retrieve session data
    userID, err := testContainers.RedisClient.HGet(ctx, sessionKey, "user_id").Int()
    if err != nil {
        t.Fatalf("Failed to get user_id from session: %v", err)
    }
    if userID != 42 {
        t.Errorf("Expected user_id 42, got %d", userID)
    }

    // Update last access time
    testContainers.RedisClient.HSet(ctx, sessionKey, "last_access", time.Now().Unix())

    // Verify TTL is set
    ttl, err := testContainers.RedisClient.TTL(ctx, sessionKey).Result()
    if err != nil {
        t.Fatalf("Failed to get TTL: %v", err)
    }
    if ttl <= 0 {
        t.Error("Session should have a positive TTL")
    }

    // Delete session (logout)
    testContainers.RedisClient.Del(ctx, sessionKey)

    // Verify session is gone
    exists, _ := testContainers.RedisClient.Exists(ctx, sessionKey).Result()
    if exists != 0 {
        t.Error("Session should be deleted after logout")
    }
}
```

## Test Fixtures and Data Setup

For more complex scenarios, you can use SQL fixtures. Create a fixtures file:

```sql
-- tests/testdata/fixtures.sql
-- This file contains test data that can be loaded before running tests

-- Clear existing data
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Insert test users
INSERT INTO users (email, name, created_at) VALUES
    ('admin@example.com', 'Admin User', '2024-01-01 00:00:00+00'),
    ('user1@example.com', 'Regular User 1', '2024-01-02 00:00:00+00'),
    ('user2@example.com', 'Regular User 2', '2024-01-03 00:00:00+00'),
    ('inactive@example.com', 'Inactive User', '2023-01-01 00:00:00+00');
```

Add a helper function to load fixtures:

```go
// LoadFixtures loads SQL fixtures from a file into the database
func LoadFixtures(ctx context.Context, db *sql.DB, fixturePath string) error {
    // Read the fixture file
    content, err := os.ReadFile(fixturePath)
    if err != nil {
        return fmt.Errorf("failed to read fixture file: %w", err)
    }

    // Execute the SQL statements
    _, err = db.ExecContext(ctx, string(content))
    if err != nil {
        return fmt.Errorf("failed to execute fixtures: %w", err)
    }

    return nil
}
```

## Running the Tests

Execute your integration tests with the following commands:

```bash
# Run all integration tests with verbose output
go test -v ./tests/integration/...

# Run tests with a longer timeout for container startup
go test -v -timeout 5m ./tests/integration/...

# Run a specific test
go test -v -run TestUserCreation ./tests/integration/...

# Run tests with coverage
go test -v -coverprofile=coverage.out ./tests/integration/...
go tool cover -html=coverage.out
```

## Best Practices for Testcontainers Integration Tests

### 1. Container Reuse Across Tests

Starting containers for each test is slow. As shown in our setup, we start containers once in `TestMain` and reuse them across all tests, resetting state between tests instead.

### 2. Parallel Test Execution

For tests that do not share state, you can run them in parallel:

```go
func TestParallelExample(t *testing.T) {
    t.Parallel() // Mark test as safe for parallel execution

    // Use unique keys/IDs to avoid conflicts
    uniqueKey := "test:" + t.Name()
    // ... test logic
}
```

### 3. Container Health Checks

Always use wait strategies to ensure containers are ready:

```go
// Wait for specific log messages indicating readiness
testcontainers.WithWaitStrategy(
    wait.ForLog("database system is ready").
        WithStartupTimeout(60*time.Second),
)

// Or wait for a specific port to be available
testcontainers.WithWaitStrategy(
    wait.ForListeningPort("5432/tcp").
        WithStartupTimeout(60*time.Second),
)
```

### 4. Clean State Between Tests

Always reset state between tests to ensure isolation:

```go
func TestSomething(t *testing.T) {
    ctx := context.Background()

    // Reset state at the start of each test
    if err := testContainers.ResetAll(ctx); err != nil {
        t.Fatalf("Failed to reset: %v", err)
    }

    // ... test logic
}
```

### 5. Meaningful Assertions

Write assertions that give clear feedback when they fail:

```go
// Bad: unclear failure message
if result != expected {
    t.Fail()
}

// Good: descriptive failure message
if result != expected {
    t.Errorf("Expected user count to be %d after deletion, got %d", expected, result)
}
```

## Troubleshooting Common Issues

### Docker Not Running

If you see errors about connecting to Docker, ensure Docker Desktop or Docker Engine is running:

```bash
docker info
```

### Container Startup Timeout

Increase the timeout if containers take too long to start:

```go
testcontainers.WithWaitStrategy(
    wait.ForLog("ready").
        WithStartupTimeout(120*time.Second), // Increase from default
)
```

### Port Conflicts

Testcontainers automatically assigns random ports to avoid conflicts. Always retrieve the actual port:

```go
// Get the mapped port for PostgreSQL
port, err := container.MappedPort(ctx, "5432/tcp")
```

### Memory Issues

If you run many tests, containers might consume significant memory. Consider running tests in batches or increasing Docker memory limits.

## Conclusion

Testcontainers-Go provides a powerful way to write integration tests that use real databases and caches. By running PostgreSQL and Redis in isolated Docker containers, you can catch bugs that unit tests with mocks would miss, while still maintaining fast, repeatable tests.

The key takeaways from this guide:

1. Use `TestMain` to manage container lifecycle across all tests in a package
2. Reset state between tests to ensure isolation
3. Use wait strategies to ensure containers are ready before running tests
4. Leverage container modules for popular services like PostgreSQL and Redis
5. Write tests that verify real database behavior, including constraints and transactions

With this foundation, you can extend your integration test suite to cover more complex scenarios like message queues, external APIs, and multi-service interactions. The investment in integration tests pays dividends in catching real-world bugs before they reach production.
