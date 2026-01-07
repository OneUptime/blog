# How to Implement the Repository Pattern in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Repository Pattern, Clean Architecture, Database, Design Patterns

Description: Implement the repository pattern in Go for clean, testable, and maintainable database access with proper abstraction layers.

---

## Introduction

The repository pattern is a design pattern that mediates between the domain and data mapping layers, acting as an in-memory collection of domain objects. In Go, this pattern provides a clean abstraction over data access logic, making your code more testable, maintainable, and flexible.

This guide covers the complete implementation of the repository pattern in Go, from basic concepts to advanced patterns like Unit of Work, multiple database implementations, and integration with the service layer.

## Why Use the Repository Pattern?

Before diving into implementation, let's understand the benefits:

1. **Abstraction**: Separates business logic from data access logic
2. **Testability**: Easy to mock repositories for unit testing
3. **Flexibility**: Switch databases without changing business logic
4. **Single Responsibility**: Each repository handles one entity type
5. **Consistency**: Provides a uniform API for data operations
6. **Maintainability**: Changes to data access are isolated to repositories

## Project Structure

A well-organized project structure is essential for clean architecture. Here is the recommended layout for a Go project using the repository pattern:

```
myapp/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── domain/
│   │   └── user.go
│   ├── repository/
│   │   ├── repository.go
│   │   ├── user_repository.go
│   │   ├── postgres/
│   │   │   └── user_repository.go
│   │   └── mongodb/
│   │       └── user_repository.go
│   ├── service/
│   │   └── user_service.go
│   └── unitofwork/
│       └── uow.go
├── pkg/
│   └── database/
│       ├── postgres.go
│       └── mongodb.go
└── go.mod
```

## Domain Models

Domain models represent the core business entities. They should be free from any database-specific concerns.

The User struct below represents a domain entity with validation logic. Notice how it contains only business-relevant fields and methods:

```go
// internal/domain/user.go
package domain

import (
    "errors"
    "regexp"
    "time"
)

// User represents a user in the system.
// This is a domain entity, independent of any database implementation.
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Password  string    `json:"-"` // Never expose password in JSON
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// Validate performs domain validation on the User entity.
// Returns an error if any validation rules are violated.
func (u *User) Validate() error {
    if u.Email == "" {
        return errors.New("email is required")
    }

    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    if !emailRegex.MatchString(u.Email) {
        return errors.New("invalid email format")
    }

    if u.Name == "" {
        return errors.New("name is required")
    }

    if len(u.Password) < 8 {
        return errors.New("password must be at least 8 characters")
    }

    return nil
}

// UpdateTimestamps sets the appropriate timestamps for create or update operations.
func (u *User) UpdateTimestamps(isNew bool) {
    now := time.Now().UTC()
    u.UpdatedAt = now
    if isNew {
        u.CreatedAt = now
    }
}
```

## Repository Interface

The repository interface defines the contract that all implementations must follow. This is the foundation of database abstraction.

Here we define a generic Repository interface and a specific UserRepository interface. The generic interface uses Go generics for type safety:

```go
// internal/repository/repository.go
package repository

import (
    "context"
    "errors"
)

// Common repository errors that implementations should use.
var (
    ErrNotFound      = errors.New("entity not found")
    ErrDuplicate     = errors.New("entity already exists")
    ErrInvalidEntity = errors.New("invalid entity")
)

// Repository is a generic interface for basic CRUD operations.
// Type parameter T represents the entity type, and ID represents the identifier type.
type Repository[T any, ID any] interface {
    // Create inserts a new entity into the repository.
    Create(ctx context.Context, entity *T) error

    // GetByID retrieves an entity by its unique identifier.
    GetByID(ctx context.Context, id ID) (*T, error)

    // Update modifies an existing entity in the repository.
    Update(ctx context.Context, entity *T) error

    // Delete removes an entity from the repository by its identifier.
    Delete(ctx context.Context, id ID) error

    // List retrieves all entities with optional pagination.
    List(ctx context.Context, offset, limit int) ([]*T, error)

    // Count returns the total number of entities in the repository.
    Count(ctx context.Context) (int64, error)
}
```

Now let's define the user-specific repository interface that extends the generic one with domain-specific methods:

```go
// internal/repository/user_repository.go
package repository

import (
    "context"

    "myapp/internal/domain"
)

// UserRepository defines the interface for user data access operations.
// It embeds the generic Repository interface and adds user-specific methods.
type UserRepository interface {
    Repository[domain.User, string]

    // GetByEmail retrieves a user by their email address.
    // Returns ErrNotFound if no user exists with the given email.
    GetByEmail(ctx context.Context, email string) (*domain.User, error)

    // ExistsByEmail checks if a user with the given email already exists.
    ExistsByEmail(ctx context.Context, email string) (bool, error)

    // UpdatePassword updates only the password field for a user.
    UpdatePassword(ctx context.Context, userID string, hashedPassword string) error

    // ListByCreatedAfter retrieves users created after the specified time.
    ListByCreatedAfter(ctx context.Context, after time.Time, limit int) ([]*domain.User, error)
}
```

## PostgreSQL Implementation

Now let's implement the UserRepository interface for PostgreSQL using the standard library's database/sql package:

```go
// internal/repository/postgres/user_repository.go
package postgres

import (
    "context"
    "database/sql"
    "errors"
    "time"

    "github.com/google/uuid"
    "github.com/lib/pq"

    "myapp/internal/domain"
    "myapp/internal/repository"
)

// UserRepository is the PostgreSQL implementation of repository.UserRepository.
type UserRepository struct {
    db *sql.DB
}

// NewUserRepository creates a new PostgreSQL user repository.
// It takes a database connection pool as a dependency.
func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

// Ensure UserRepository implements the UserRepository interface at compile time.
var _ repository.UserRepository = (*UserRepository)(nil)

// Create inserts a new user into the database.
// It generates a UUID if the user doesn't have an ID and sets timestamps.
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
    if user.ID == "" {
        user.ID = uuid.New().String()
    }
    user.UpdateTimestamps(true)

    query := `
        INSERT INTO users (id, email, name, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    `

    _, err := r.db.ExecContext(ctx, query,
        user.ID,
        user.Email,
        user.Name,
        user.Password,
        user.CreatedAt,
        user.UpdatedAt,
    )

    if err != nil {
        // Check for unique constraint violation (duplicate email)
        var pqErr *pq.Error
        if errors.As(err, &pqErr) && pqErr.Code == "23505" {
            return repository.ErrDuplicate
        }
        return err
    }

    return nil
}

// GetByID retrieves a user by their unique identifier.
// Returns repository.ErrNotFound if no user exists with the given ID.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    query := `
        SELECT id, email, name, password, created_at, updated_at
        FROM users
        WHERE id = $1
    `

    user := &domain.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Password,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if errors.Is(err, sql.ErrNoRows) {
        return nil, repository.ErrNotFound
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// GetByEmail retrieves a user by their email address.
// This is commonly used for authentication flows.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
    query := `
        SELECT id, email, name, password, created_at, updated_at
        FROM users
        WHERE email = $1
    `

    user := &domain.User{}
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Password,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if errors.Is(err, sql.ErrNoRows) {
        return nil, repository.ErrNotFound
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// Update modifies an existing user in the database.
// It updates the UpdatedAt timestamp automatically.
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
    user.UpdateTimestamps(false)

    query := `
        UPDATE users
        SET email = $1, name = $2, updated_at = $3
        WHERE id = $4
    `

    result, err := r.db.ExecContext(ctx, query,
        user.Email,
        user.Name,
        user.UpdatedAt,
        user.ID,
    )
    if err != nil {
        return err
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rowsAffected == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// Delete removes a user from the database by their ID.
func (r *UserRepository) Delete(ctx context.Context, id string) error {
    query := `DELETE FROM users WHERE id = $1`

    result, err := r.db.ExecContext(ctx, query, id)
    if err != nil {
        return err
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rowsAffected == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// List retrieves users with pagination support.
// Offset and limit control the pagination window.
func (r *UserRepository) List(ctx context.Context, offset, limit int) ([]*domain.User, error) {
    query := `
        SELECT id, email, name, password, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        OFFSET $1 LIMIT $2
    `

    rows, err := r.db.QueryContext(ctx, query, offset, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*domain.User
    for rows.Next() {
        user := &domain.User{}
        err := rows.Scan(
            &user.ID,
            &user.Email,
            &user.Name,
            &user.Password,
            &user.CreatedAt,
            &user.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }

    return users, rows.Err()
}

// Count returns the total number of users in the database.
func (r *UserRepository) Count(ctx context.Context) (int64, error) {
    var count int64
    query := `SELECT COUNT(*) FROM users`

    err := r.db.QueryRowContext(ctx, query).Scan(&count)
    return count, err
}

// ExistsByEmail checks if a user with the given email exists.
// This is useful for validation before creating new users.
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    var exists bool
    query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

    err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
    return exists, err
}

// UpdatePassword updates only the password field for a user.
// This is a targeted update for password change operations.
func (r *UserRepository) UpdatePassword(ctx context.Context, userID string, hashedPassword string) error {
    query := `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`

    result, err := r.db.ExecContext(ctx, query, hashedPassword, time.Now().UTC(), userID)
    if err != nil {
        return err
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rowsAffected == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// ListByCreatedAfter retrieves users created after a specific time.
// Useful for incremental synchronization or reporting.
func (r *UserRepository) ListByCreatedAfter(ctx context.Context, after time.Time, limit int) ([]*domain.User, error) {
    query := `
        SELECT id, email, name, password, created_at, updated_at
        FROM users
        WHERE created_at > $1
        ORDER BY created_at ASC
        LIMIT $2
    `

    rows, err := r.db.QueryContext(ctx, query, after, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*domain.User
    for rows.Next() {
        user := &domain.User{}
        err := rows.Scan(
            &user.ID,
            &user.Email,
            &user.Name,
            &user.Password,
            &user.CreatedAt,
            &user.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }

    return users, rows.Err()
}
```

## MongoDB Implementation

Here is the same repository interface implemented for MongoDB. This demonstrates how the abstraction allows different database backends:

```go
// internal/repository/mongodb/user_repository.go
package mongodb

import (
    "context"
    "errors"
    "time"

    "github.com/google/uuid"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"

    "myapp/internal/domain"
    "myapp/internal/repository"
)

// UserRepository is the MongoDB implementation of repository.UserRepository.
type UserRepository struct {
    collection *mongo.Collection
}

// NewUserRepository creates a new MongoDB user repository.
// It takes a MongoDB collection as a dependency.
func NewUserRepository(collection *mongo.Collection) *UserRepository {
    return &UserRepository{collection: collection}
}

// Ensure UserRepository implements the UserRepository interface at compile time.
var _ repository.UserRepository = (*UserRepository)(nil)

// userDocument represents the MongoDB document structure for users.
// This separates the storage format from the domain model.
type userDocument struct {
    ID        string    `bson:"_id"`
    Email     string    `bson:"email"`
    Name      string    `bson:"name"`
    Password  string    `bson:"password"`
    CreatedAt time.Time `bson:"created_at"`
    UpdatedAt time.Time `bson:"updated_at"`
}

// toDocument converts a domain User to a MongoDB document.
func toDocument(user *domain.User) *userDocument {
    return &userDocument{
        ID:        user.ID,
        Email:     user.Email,
        Name:      user.Name,
        Password:  user.Password,
        CreatedAt: user.CreatedAt,
        UpdatedAt: user.UpdatedAt,
    }
}

// toDomain converts a MongoDB document to a domain User.
func toDomain(doc *userDocument) *domain.User {
    return &domain.User{
        ID:        doc.ID,
        Email:     doc.Email,
        Name:      doc.Name,
        Password:  doc.Password,
        CreatedAt: doc.CreatedAt,
        UpdatedAt: doc.UpdatedAt,
    }
}

// Create inserts a new user document into MongoDB.
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
    if user.ID == "" {
        user.ID = uuid.New().String()
    }
    user.UpdateTimestamps(true)

    doc := toDocument(user)
    _, err := r.collection.InsertOne(ctx, doc)

    if mongo.IsDuplicateKeyError(err) {
        return repository.ErrDuplicate
    }

    return err
}

// GetByID retrieves a user document by its ID.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    filter := bson.M{"_id": id}

    var doc userDocument
    err := r.collection.FindOne(ctx, filter).Decode(&doc)

    if errors.Is(err, mongo.ErrNoDocuments) {
        return nil, repository.ErrNotFound
    }
    if err != nil {
        return nil, err
    }

    return toDomain(&doc), nil
}

// GetByEmail retrieves a user document by email address.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
    filter := bson.M{"email": email}

    var doc userDocument
    err := r.collection.FindOne(ctx, filter).Decode(&doc)

    if errors.Is(err, mongo.ErrNoDocuments) {
        return nil, repository.ErrNotFound
    }
    if err != nil {
        return nil, err
    }

    return toDomain(&doc), nil
}

// Update modifies an existing user document in MongoDB.
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
    user.UpdateTimestamps(false)

    filter := bson.M{"_id": user.ID}
    update := bson.M{
        "$set": bson.M{
            "email":      user.Email,
            "name":       user.Name,
            "updated_at": user.UpdatedAt,
        },
    }

    result, err := r.collection.UpdateOne(ctx, filter, update)
    if err != nil {
        return err
    }

    if result.MatchedCount == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// Delete removes a user document from MongoDB.
func (r *UserRepository) Delete(ctx context.Context, id string) error {
    filter := bson.M{"_id": id}

    result, err := r.collection.DeleteOne(ctx, filter)
    if err != nil {
        return err
    }

    if result.DeletedCount == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// List retrieves user documents with pagination.
func (r *UserRepository) List(ctx context.Context, offset, limit int) ([]*domain.User, error) {
    opts := options.Find().
        SetSkip(int64(offset)).
        SetLimit(int64(limit)).
        SetSort(bson.M{"created_at": -1})

    cursor, err := r.collection.Find(ctx, bson.M{}, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var users []*domain.User
    for cursor.Next(ctx) {
        var doc userDocument
        if err := cursor.Decode(&doc); err != nil {
            return nil, err
        }
        users = append(users, toDomain(&doc))
    }

    return users, cursor.Err()
}

// Count returns the total number of user documents.
func (r *UserRepository) Count(ctx context.Context) (int64, error) {
    return r.collection.CountDocuments(ctx, bson.M{})
}

// ExistsByEmail checks if a user with the given email exists.
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    filter := bson.M{"email": email}
    count, err := r.collection.CountDocuments(ctx, filter)
    return count > 0, err
}

// UpdatePassword updates only the password field for a user.
func (r *UserRepository) UpdatePassword(ctx context.Context, userID string, hashedPassword string) error {
    filter := bson.M{"_id": userID}
    update := bson.M{
        "$set": bson.M{
            "password":   hashedPassword,
            "updated_at": time.Now().UTC(),
        },
    }

    result, err := r.collection.UpdateOne(ctx, filter, update)
    if err != nil {
        return err
    }

    if result.MatchedCount == 0 {
        return repository.ErrNotFound
    }

    return nil
}

// ListByCreatedAfter retrieves users created after a specific time.
func (r *UserRepository) ListByCreatedAfter(ctx context.Context, after time.Time, limit int) ([]*domain.User, error) {
    filter := bson.M{"created_at": bson.M{"$gt": after}}
    opts := options.Find().
        SetLimit(int64(limit)).
        SetSort(bson.M{"created_at": 1})

    cursor, err := r.collection.Find(ctx, filter, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var users []*domain.User
    for cursor.Next(ctx) {
        var doc userDocument
        if err := cursor.Decode(&doc); err != nil {
            return nil, err
        }
        users = append(users, toDomain(&doc))
    }

    return users, cursor.Err()
}
```

## Unit of Work Pattern

The Unit of Work pattern coordinates writes across multiple repositories and manages transactions. This is essential for maintaining data consistency:

```go
// internal/unitofwork/uow.go
package unitofwork

import (
    "context"
    "database/sql"

    "myapp/internal/repository"
    "myapp/internal/repository/postgres"
)

// UnitOfWork coordinates transactions across multiple repositories.
// It ensures that all repository operations within a transaction
// either succeed together or fail together.
type UnitOfWork interface {
    // Users returns the user repository within this unit of work.
    Users() repository.UserRepository

    // Begin starts a new transaction.
    Begin(ctx context.Context) error

    // Commit commits the current transaction.
    Commit() error

    // Rollback aborts the current transaction.
    Rollback() error

    // WithTransaction executes a function within a transaction.
    // It automatically commits on success or rolls back on error.
    WithTransaction(ctx context.Context, fn func(UnitOfWork) error) error
}

// PostgresUnitOfWork is the PostgreSQL implementation of UnitOfWork.
type PostgresUnitOfWork struct {
    db        *sql.DB
    tx        *sql.Tx
    userRepo  repository.UserRepository
}

// NewPostgresUnitOfWork creates a new PostgreSQL unit of work.
func NewPostgresUnitOfWork(db *sql.DB) *PostgresUnitOfWork {
    return &PostgresUnitOfWork{
        db:       db,
        userRepo: postgres.NewUserRepository(db),
    }
}

// Users returns the user repository.
// When in a transaction, it returns a transactional repository.
func (uow *PostgresUnitOfWork) Users() repository.UserRepository {
    if uow.tx != nil {
        return postgres.NewUserRepositoryTx(uow.tx)
    }
    return uow.userRepo
}

// Begin starts a new database transaction.
func (uow *PostgresUnitOfWork) Begin(ctx context.Context) error {
    tx, err := uow.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    uow.tx = tx
    return nil
}

// Commit commits the current transaction.
func (uow *PostgresUnitOfWork) Commit() error {
    if uow.tx == nil {
        return nil
    }
    err := uow.tx.Commit()
    uow.tx = nil
    return err
}

// Rollback aborts the current transaction.
func (uow *PostgresUnitOfWork) Rollback() error {
    if uow.tx == nil {
        return nil
    }
    err := uow.tx.Rollback()
    uow.tx = nil
    return err
}

// WithTransaction executes a function within a transaction.
// This is the recommended way to use transactions as it handles
// commit and rollback automatically.
func (uow *PostgresUnitOfWork) WithTransaction(ctx context.Context, fn func(UnitOfWork) error) error {
    if err := uow.Begin(ctx); err != nil {
        return err
    }

    if err := fn(uow); err != nil {
        // Attempt rollback but don't mask the original error
        _ = uow.Rollback()
        return err
    }

    return uow.Commit()
}
```

## Service Layer Integration

The service layer contains business logic and uses repositories for data access. This separation keeps business rules independent of data storage:

```go
// internal/service/user_service.go
package service

import (
    "context"
    "errors"

    "golang.org/x/crypto/bcrypt"

    "myapp/internal/domain"
    "myapp/internal/repository"
    "myapp/internal/unitofwork"
)

// UserService handles user-related business logic.
// It depends on repository interfaces, not concrete implementations.
type UserService struct {
    uow unitofwork.UnitOfWork
}

// NewUserService creates a new user service with the given unit of work.
func NewUserService(uow unitofwork.UnitOfWork) *UserService {
    return &UserService{uow: uow}
}

// CreateUser registers a new user in the system.
// It validates the user, hashes the password, and persists the user.
func (s *UserService) CreateUser(ctx context.Context, user *domain.User) error {
    // Validate domain rules
    if err := user.Validate(); err != nil {
        return err
    }

    // Check for existing user with same email
    exists, err := s.uow.Users().ExistsByEmail(ctx, user.Email)
    if err != nil {
        return err
    }
    if exists {
        return errors.New("user with this email already exists")
    }

    // Hash password before storage
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    user.Password = string(hashedPassword)

    // Persist the user
    return s.uow.Users().Create(ctx, user)
}

// GetUserByID retrieves a user by their ID.
func (s *UserService) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
    return s.uow.Users().GetByID(ctx, id)
}

// Authenticate verifies user credentials and returns the user if valid.
func (s *UserService) Authenticate(ctx context.Context, email, password string) (*domain.User, error) {
    user, err := s.uow.Users().GetByEmail(ctx, email)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return nil, errors.New("invalid credentials")
        }
        return nil, err
    }

    // Compare password with stored hash
    err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
    if err != nil {
        return nil, errors.New("invalid credentials")
    }

    return user, nil
}

// ChangePassword updates a user's password.
// It uses the unit of work for transactional safety.
func (s *UserService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
    return s.uow.WithTransaction(ctx, func(uow unitofwork.UnitOfWork) error {
        // Verify user exists and old password is correct
        user, err := uow.Users().GetByID(ctx, userID)
        if err != nil {
            return err
        }

        err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword))
        if err != nil {
            return errors.New("current password is incorrect")
        }

        // Hash and update new password
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
        if err != nil {
            return err
        }

        return uow.Users().UpdatePassword(ctx, userID, string(hashedPassword))
    })
}

// ListUsers retrieves a paginated list of users.
func (s *UserService) ListUsers(ctx context.Context, page, pageSize int) ([]*domain.User, int64, error) {
    offset := (page - 1) * pageSize

    users, err := s.uow.Users().List(ctx, offset, pageSize)
    if err != nil {
        return nil, 0, err
    }

    total, err := s.uow.Users().Count(ctx)
    if err != nil {
        return nil, 0, err
    }

    return users, total, nil
}
```

## Mocking Repositories for Tests

One of the biggest benefits of the repository pattern is testability. Here is how to create mock repositories for unit testing:

```go
// internal/repository/mocks/user_repository_mock.go
package mocks

import (
    "context"
    "sync"
    "time"

    "myapp/internal/domain"
    "myapp/internal/repository"
)

// MockUserRepository is an in-memory mock implementation for testing.
// It stores users in a map and simulates database behavior.
type MockUserRepository struct {
    mu    sync.RWMutex
    users map[string]*domain.User
}

// NewMockUserRepository creates a new mock user repository.
func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{
        users: make(map[string]*domain.User),
    }
}

// Create adds a user to the in-memory store.
func (m *MockUserRepository) Create(ctx context.Context, user *domain.User) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    // Check for duplicate email
    for _, u := range m.users {
        if u.Email == user.Email {
            return repository.ErrDuplicate
        }
    }

    // Clone to avoid external mutations
    clone := *user
    m.users[user.ID] = &clone
    return nil
}

// GetByID retrieves a user by ID from the in-memory store.
func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    user, exists := m.users[id]
    if !exists {
        return nil, repository.ErrNotFound
    }

    clone := *user
    return &clone, nil
}

// GetByEmail retrieves a user by email from the in-memory store.
func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    for _, user := range m.users {
        if user.Email == email {
            clone := *user
            return &clone, nil
        }
    }
    return nil, repository.ErrNotFound
}

// Update modifies a user in the in-memory store.
func (m *MockUserRepository) Update(ctx context.Context, user *domain.User) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    if _, exists := m.users[user.ID]; !exists {
        return repository.ErrNotFound
    }

    clone := *user
    m.users[user.ID] = &clone
    return nil
}

// Delete removes a user from the in-memory store.
func (m *MockUserRepository) Delete(ctx context.Context, id string) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    if _, exists := m.users[id]; !exists {
        return repository.ErrNotFound
    }

    delete(m.users, id)
    return nil
}

// List returns all users with pagination.
func (m *MockUserRepository) List(ctx context.Context, offset, limit int) ([]*domain.User, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    var users []*domain.User
    for _, user := range m.users {
        clone := *user
        users = append(users, &clone)
    }

    // Apply pagination
    if offset >= len(users) {
        return []*domain.User{}, nil
    }

    end := offset + limit
    if end > len(users) {
        end = len(users)
    }

    return users[offset:end], nil
}

// Count returns the total number of users.
func (m *MockUserRepository) Count(ctx context.Context) (int64, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return int64(len(m.users)), nil
}

// ExistsByEmail checks if a user with the given email exists.
func (m *MockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    for _, user := range m.users {
        if user.Email == email {
            return true, nil
        }
    }
    return false, nil
}

// UpdatePassword updates only the password field for a user.
func (m *MockUserRepository) UpdatePassword(ctx context.Context, userID string, hashedPassword string) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    user, exists := m.users[userID]
    if !exists {
        return repository.ErrNotFound
    }

    user.Password = hashedPassword
    user.UpdatedAt = time.Now().UTC()
    return nil
}

// ListByCreatedAfter retrieves users created after the specified time.
func (m *MockUserRepository) ListByCreatedAfter(ctx context.Context, after time.Time, limit int) ([]*domain.User, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    var users []*domain.User
    for _, user := range m.users {
        if user.CreatedAt.After(after) {
            clone := *user
            users = append(users, &clone)
        }
    }

    if len(users) > limit {
        users = users[:limit]
    }

    return users, nil
}
```

Now let's write unit tests using the mock repository:

```go
// internal/service/user_service_test.go
package service_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    "myapp/internal/domain"
    "myapp/internal/repository/mocks"
    "myapp/internal/service"
)

// MockUnitOfWork is a test implementation of UnitOfWork.
type MockUnitOfWork struct {
    userRepo *mocks.MockUserRepository
}

func NewMockUnitOfWork() *MockUnitOfWork {
    return &MockUnitOfWork{
        userRepo: mocks.NewMockUserRepository(),
    }
}

func (m *MockUnitOfWork) Users() repository.UserRepository {
    return m.userRepo
}

func (m *MockUnitOfWork) Begin(ctx context.Context) error { return nil }
func (m *MockUnitOfWork) Commit() error                   { return nil }
func (m *MockUnitOfWork) Rollback() error                 { return nil }

func (m *MockUnitOfWork) WithTransaction(ctx context.Context, fn func(unitofwork.UnitOfWork) error) error {
    return fn(m)
}

// TestCreateUser tests user creation with valid data.
func TestCreateUser(t *testing.T) {
    uow := NewMockUnitOfWork()
    svc := service.NewUserService(uow)

    user := &domain.User{
        ID:       "user-123",
        Email:    "test@example.com",
        Name:     "Test User",
        Password: "securepassword123",
    }

    err := svc.CreateUser(context.Background(), user)
    require.NoError(t, err)

    // Verify user was stored
    stored, err := uow.Users().GetByID(context.Background(), "user-123")
    require.NoError(t, err)
    assert.Equal(t, "test@example.com", stored.Email)
    assert.NotEqual(t, "securepassword123", stored.Password) // Should be hashed
}

// TestCreateUser_DuplicateEmail tests that duplicate emails are rejected.
func TestCreateUser_DuplicateEmail(t *testing.T) {
    uow := NewMockUnitOfWork()
    svc := service.NewUserService(uow)

    user1 := &domain.User{
        ID:       "user-1",
        Email:    "duplicate@example.com",
        Name:     "User One",
        Password: "password123",
    }

    err := svc.CreateUser(context.Background(), user1)
    require.NoError(t, err)

    user2 := &domain.User{
        ID:       "user-2",
        Email:    "duplicate@example.com",
        Name:     "User Two",
        Password: "password456",
    }

    err = svc.CreateUser(context.Background(), user2)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "already exists")
}

// TestAuthenticate tests successful authentication.
func TestAuthenticate(t *testing.T) {
    uow := NewMockUnitOfWork()
    svc := service.NewUserService(uow)

    // Create a user first
    user := &domain.User{
        ID:       "user-123",
        Email:    "auth@example.com",
        Name:     "Auth User",
        Password: "correctpassword",
    }

    err := svc.CreateUser(context.Background(), user)
    require.NoError(t, err)

    // Test authentication
    authenticated, err := svc.Authenticate(context.Background(), "auth@example.com", "correctpassword")
    require.NoError(t, err)
    assert.Equal(t, "user-123", authenticated.ID)
}

// TestAuthenticate_InvalidPassword tests authentication with wrong password.
func TestAuthenticate_InvalidPassword(t *testing.T) {
    uow := NewMockUnitOfWork()
    svc := service.NewUserService(uow)

    user := &domain.User{
        ID:       "user-123",
        Email:    "auth@example.com",
        Name:     "Auth User",
        Password: "correctpassword",
    }

    err := svc.CreateUser(context.Background(), user)
    require.NoError(t, err)

    _, err = svc.Authenticate(context.Background(), "auth@example.com", "wrongpassword")
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "invalid credentials")
}
```

## Dependency Injection and Wiring

Finally, let's see how to wire everything together in the main application using dependency injection:

```go
// cmd/api/main.go
package main

import (
    "database/sql"
    "log"
    "net/http"
    "os"

    _ "github.com/lib/pq"

    "myapp/internal/repository/postgres"
    "myapp/internal/service"
    "myapp/internal/unitofwork"
)

func main() {
    // Initialize database connection
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer db.Close()

    // Verify connection
    if err := db.Ping(); err != nil {
        log.Fatalf("Failed to ping database: %v", err)
    }

    // Create unit of work with PostgreSQL implementation
    uow := unitofwork.NewPostgresUnitOfWork(db)

    // Create services with injected dependencies
    userService := service.NewUserService(uow)

    // Create HTTP handlers with injected services
    handler := NewHandler(userService)

    // Start server
    log.Println("Server starting on :8080")
    if err := http.ListenAndServe(":8080", handler); err != nil {
        log.Fatalf("Server failed: %v", err)
    }
}

// Handler wraps HTTP handlers with service dependencies.
type Handler struct {
    userService *service.UserService
}

// NewHandler creates a new HTTP handler with injected services.
func NewHandler(userService *service.UserService) *Handler {
    return &Handler{userService: userService}
}

// ServeHTTP implements the http.Handler interface.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Router implementation here
    // Routes would call h.userService methods
}
```

## Best Practices Summary

Here are key best practices when implementing the repository pattern in Go:

1. **Define interfaces in the consumer package**: Place repository interfaces where they are used, not where they are implemented.

2. **Return domain objects, not database models**: Repositories should translate between storage format and domain entities.

3. **Use context for cancellation and timeouts**: All repository methods should accept a context as the first parameter.

4. **Handle errors consistently**: Define common errors like ErrNotFound and use errors.Is for comparison.

5. **Keep repositories focused**: Each repository should handle one entity type only.

6. **Use transactions sparingly**: The Unit of Work pattern should coordinate transactions across repositories.

7. **Write table-driven tests**: Use the mock repository to write comprehensive unit tests.

8. **Inject dependencies**: Never create repositories inside services; inject them instead.

## Conclusion

The repository pattern provides a clean abstraction over data access in Go applications. By defining interfaces for repositories, you gain flexibility to switch database implementations, improved testability through mocking, and better separation of concerns.

The key components covered in this guide work together to create a maintainable architecture:

- **Domain models** represent your business entities
- **Repository interfaces** define the contract for data access
- **Concrete implementations** handle database-specific logic
- **Unit of Work** coordinates transactions across repositories
- **Service layer** implements business logic using repositories
- **Mocks** enable fast, isolated unit tests

This pattern scales well from simple applications to complex systems with multiple database backends and sophisticated transaction requirements.
