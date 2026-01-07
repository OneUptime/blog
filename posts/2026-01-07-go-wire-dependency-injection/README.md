# How to Implement Dependency Injection in Go with Wire

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Dependency Injection, Wire, Testing, Clean Architecture

Description: Implement compile-time dependency injection in Go using Google's Wire for testable, maintainable code with automatic provider wiring.

---

Dependency Injection (DI) is a fundamental design pattern that promotes loose coupling between components in your application. While Go's simplicity often leads developers to manually wire dependencies, this approach quickly becomes unwieldy as applications grow. Google's Wire is a compile-time dependency injection tool that generates code to wire up your dependencies, providing the benefits of DI without runtime reflection or performance overhead.

In this comprehensive guide, we'll explore how to implement dependency injection in Go using Wire, from basic concepts to advanced patterns that will help you build testable, maintainable applications.

## Understanding Dependency Injection in Go

Dependency Injection is a technique where objects receive their dependencies from external sources rather than creating them internally. This pattern offers several benefits:

- **Testability**: Dependencies can be easily mocked or stubbed for unit testing
- **Flexibility**: Components can be reconfigured without code changes
- **Maintainability**: Clear separation of concerns makes code easier to understand
- **Reusability**: Components become more modular and reusable

### The Problem with Manual Dependency Wiring

Consider a typical Go application with multiple layers. The following example shows how manual wiring becomes complex very quickly:

```go
// Manual dependency wiring becomes tedious and error-prone
// as your application grows with more services and dependencies
func main() {
    // Create database connection
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }

    // Create repositories
    userRepo := repository.NewUserRepository(db)
    orderRepo := repository.NewOrderRepository(db)
    productRepo := repository.NewProductRepository(db)

    // Create services with their dependencies
    emailService := service.NewEmailService(os.Getenv("SMTP_HOST"))
    userService := service.NewUserService(userRepo, emailService)
    productService := service.NewProductService(productRepo)
    orderService := service.NewOrderService(orderRepo, userService, productService)

    // Create handlers
    userHandler := handler.NewUserHandler(userService)
    orderHandler := handler.NewOrderHandler(orderService)
    productHandler := handler.NewProductHandler(productService)

    // Create router and register handlers
    router := mux.NewRouter()
    router.HandleFunc("/users", userHandler.List).Methods("GET")
    router.HandleFunc("/orders", orderHandler.Create).Methods("POST")
    // ... many more routes

    http.ListenAndServe(":8080", router)
}
```

This manual approach has several drawbacks:
- Boilerplate code that's easy to get wrong
- Difficult to track dependency changes
- No compile-time verification of the dependency graph
- Challenging to maintain as the application grows

## What is Wire?

Wire is a code generation tool developed by Google that solves dependency injection at compile time. Unlike runtime DI containers in other languages, Wire:

- **Generates readable Go code**: No magic or reflection at runtime
- **Catches errors at compile time**: Invalid dependency graphs fail during code generation
- **Has zero runtime overhead**: All wiring is done before your application runs
- **Produces traceable code**: You can inspect the generated code to understand the wiring

## Installing Wire

To get started with Wire, you need to install the Wire command-line tool:

```bash
# Install the Wire code generator tool
# This provides the 'wire' command for generating dependency injection code
go install github.com/google/wire/cmd/wire@latest

# Add the Wire library to your project
# This provides the wire.Build, wire.Bind, and other functions
go get github.com/google/wire@latest
```

Verify the installation:

```bash
# Verify wire is installed and accessible in your PATH
wire help
```

## Core Concepts: Providers and Injectors

Wire uses two fundamental concepts: **providers** and **injectors**.

### Providers

A provider is a function that produces a value. It can have dependencies that Wire will automatically resolve. Here's an example:

```go
// providers.go
package main

import (
    "database/sql"
    "os"

    _ "github.com/lib/pq"
)

// Config holds application configuration
// Providers can return simple structs without dependencies
type Config struct {
    DatabaseURL string
    ServerPort  string
    Environment string
}

// NewConfig is a provider that creates the application configuration
// It has no dependencies and serves as a root of the dependency graph
func NewConfig() *Config {
    return &Config{
        DatabaseURL: os.Getenv("DATABASE_URL"),
        ServerPort:  os.Getenv("SERVER_PORT"),
        Environment: os.Getenv("ENVIRONMENT"),
    }
}

// NewDatabase is a provider that creates a database connection
// It depends on Config, which Wire will automatically inject
func NewDatabase(cfg *Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        return nil, err
    }

    // Verify connection is working
    if err := db.Ping(); err != nil {
        return nil, err
    }

    return db, nil
}
```

### Injectors

An injector is a function that Wire uses as a template to generate the actual wiring code. You write the signature, and Wire fills in the implementation:

```go
// wire.go
//go:build wireinject
// +build wireinject

package main

import "github.com/google/wire"

// InitializeApp is an injector that Wire will implement
// The build constraint ensures this file is only used by Wire
func InitializeApp() (*App, error) {
    // wire.Build declares which providers to use
    // Wire analyzes these and generates the proper initialization order
    wire.Build(
        NewConfig,
        NewDatabase,
        NewUserRepository,
        NewUserService,
        NewApp,
    )
    return nil, nil // Wire replaces this with actual implementation
}
```

Running `wire` in your project directory generates `wire_gen.go`:

```go
// wire_gen.go (generated by Wire)
// Code generated by Wire. DO NOT EDIT.

//go:generate go run github.com/google/wire/cmd/wire
//go:build !wireinject
// +build !wireinject

package main

// InitializeApp creates a fully wired App instance
// This code is automatically generated based on your providers
func InitializeApp() (*App, error) {
    config := NewConfig()
    db, err := NewDatabase(config)
    if err != nil {
        return nil, err
    }
    userRepository := NewUserRepository(db)
    userService := NewUserService(userRepository)
    app := NewApp(userService)
    return app, nil
}
```

## Building a Complete Example

Let's build a complete application to demonstrate Wire's capabilities. We'll create a simple user management service with proper layering:

```go
// domain/user.go
package domain

import "time"

// User represents a user in our system
// Domain models should be independent of infrastructure concerns
type User struct {
    ID        int64
    Email     string
    Name      string
    CreatedAt time.Time
    UpdatedAt time.Time
}

// UserRepository defines the contract for user data access
// Using interfaces enables easy testing and flexibility
type UserRepository interface {
    FindByID(id int64) (*User, error)
    FindByEmail(email string) (*User, error)
    Create(user *User) error
    Update(user *User) error
    Delete(id int64) error
    List(offset, limit int) ([]*User, error)
}

// EmailSender defines the contract for sending emails
// This abstraction allows swapping email providers easily
type EmailSender interface {
    Send(to, subject, body string) error
}
```

Now let's create the repository implementation:

```go
// repository/user_repository.go
package repository

import (
    "database/sql"
    "time"

    "myapp/domain"
)

// PostgresUserRepository implements UserRepository using PostgreSQL
// It encapsulates all database-specific logic for users
type PostgresUserRepository struct {
    db *sql.DB
}

// NewPostgresUserRepository is a provider for the user repository
// Wire will inject the database connection automatically
func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db: db}
}

// FindByID retrieves a user by their unique identifier
func (r *PostgresUserRepository) FindByID(id int64) (*domain.User, error) {
    user := &domain.User{}
    err := r.db.QueryRow(
        "SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1",
        id,
    ).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return user, nil
}

// FindByEmail retrieves a user by their email address
func (r *PostgresUserRepository) FindByEmail(email string) (*domain.User, error) {
    user := &domain.User{}
    err := r.db.QueryRow(
        "SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1",
        email,
    ).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return user, nil
}

// Create inserts a new user into the database
func (r *PostgresUserRepository) Create(user *domain.User) error {
    now := time.Now()
    user.CreatedAt = now
    user.UpdatedAt = now

    return r.db.QueryRow(
        `INSERT INTO users (email, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        user.Email, user.Name, user.CreatedAt, user.UpdatedAt,
    ).Scan(&user.ID)
}

// Update modifies an existing user in the database
func (r *PostgresUserRepository) Update(user *domain.User) error {
    user.UpdatedAt = time.Now()
    _, err := r.db.Exec(
        `UPDATE users SET email = $1, name = $2, updated_at = $3 WHERE id = $4`,
        user.Email, user.Name, user.UpdatedAt, user.ID,
    )
    return err
}

// Delete removes a user from the database
func (r *PostgresUserRepository) Delete(id int64) error {
    _, err := r.db.Exec("DELETE FROM users WHERE id = $1", id)
    return err
}

// List retrieves a paginated list of users
func (r *PostgresUserRepository) List(offset, limit int) ([]*domain.User, error) {
    rows, err := r.db.Query(
        `SELECT id, email, name, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        limit, offset,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*domain.User
    for rows.Next() {
        user := &domain.User{}
        if err := rows.Scan(&user.ID, &user.Email, &user.Name,
            &user.CreatedAt, &user.UpdatedAt); err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    return users, rows.Err()
}
```

Now let's implement the email service:

```go
// service/email_service.go
package service

import (
    "fmt"
    "net/smtp"
)

// SMTPConfig holds SMTP server configuration
// Separating config allows for environment-specific settings
type SMTPConfig struct {
    Host     string
    Port     int
    Username string
    Password string
    From     string
}

// SMTPEmailSender implements EmailSender using SMTP
// It handles the low-level details of sending emails
type SMTPEmailSender struct {
    config SMTPConfig
}

// NewSMTPEmailSender is a provider for the email sender
// Wire will inject the SMTP configuration automatically
func NewSMTPEmailSender(cfg SMTPConfig) *SMTPEmailSender {
    return &SMTPEmailSender{config: cfg}
}

// Send delivers an email to the specified recipient
func (s *SMTPEmailSender) Send(to, subject, body string) error {
    auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

    msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
        s.config.From, to, subject, body)

    addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
    return smtp.SendMail(addr, auth, s.config.From, []string{to}, []byte(msg))
}
```

Now the user service that ties everything together:

```go
// service/user_service.go
package service

import (
    "errors"
    "fmt"

    "myapp/domain"
)

// Common errors returned by the user service
// Using sentinel errors makes error handling more reliable
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrEmailExists      = errors.New("email already exists")
    ErrInvalidUserData  = errors.New("invalid user data")
)

// UserService handles business logic for user operations
// It orchestrates between repositories and other services
type UserService struct {
    repo   domain.UserRepository
    email  domain.EmailSender
}

// NewUserService is a provider for the user service
// Wire will inject the repository and email sender
func NewUserService(repo domain.UserRepository, email domain.EmailSender) *UserService {
    return &UserService{
        repo:  repo,
        email: email,
    }
}

// GetUser retrieves a user by ID with proper error handling
func (s *UserService) GetUser(id int64) (*domain.User, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    if user == nil {
        return nil, ErrUserNotFound
    }
    return user, nil
}

// CreateUser creates a new user and sends a welcome email
func (s *UserService) CreateUser(email, name string) (*domain.User, error) {
    // Validate input
    if email == "" || name == "" {
        return nil, ErrInvalidUserData
    }

    // Check for existing user
    existing, err := s.repo.FindByEmail(email)
    if err != nil {
        return nil, fmt.Errorf("failed to check existing user: %w", err)
    }
    if existing != nil {
        return nil, ErrEmailExists
    }

    // Create the user
    user := &domain.User{
        Email: email,
        Name:  name,
    }
    if err := s.repo.Create(user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    // Send welcome email asynchronously
    go func() {
        subject := "Welcome to Our Service!"
        body := fmt.Sprintf("Hello %s,\n\nWelcome to our platform!", name)
        _ = s.email.Send(email, subject, body)
    }()

    return user, nil
}

// UpdateUser modifies an existing user's information
func (s *UserService) UpdateUser(id int64, name string) (*domain.User, error) {
    user, err := s.GetUser(id)
    if err != nil {
        return nil, err
    }

    user.Name = name
    if err := s.repo.Update(user); err != nil {
        return nil, fmt.Errorf("failed to update user: %w", err)
    }

    return user, nil
}

// DeleteUser removes a user from the system
func (s *UserService) DeleteUser(id int64) error {
    // Verify user exists
    if _, err := s.GetUser(id); err != nil {
        return err
    }

    if err := s.repo.Delete(id); err != nil {
        return fmt.Errorf("failed to delete user: %w", err)
    }
    return nil
}

// ListUsers retrieves a paginated list of users
func (s *UserService) ListUsers(page, pageSize int) ([]*domain.User, error) {
    if page < 1 {
        page = 1
    }
    if pageSize < 1 || pageSize > 100 {
        pageSize = 20
    }

    offset := (page - 1) * pageSize
    return s.repo.List(offset, pageSize)
}
```

## Provider Sets for Grouping

As your application grows, organizing providers into sets makes the codebase more manageable. Provider sets group related providers together:

```go
// wire/sets.go
package wire

import (
    "github.com/google/wire"

    "myapp/repository"
    "myapp/service"
)

// RepositorySet groups all repository providers together
// This makes it easy to include all repositories in an injector
var RepositorySet = wire.NewSet(
    repository.NewPostgresUserRepository,
    repository.NewPostgresOrderRepository,
    repository.NewPostgresProductRepository,
)

// ServiceSet groups all service providers together
// Provider sets can include bindings and other sets
var ServiceSet = wire.NewSet(
    service.NewUserService,
    service.NewOrderService,
    service.NewProductService,
    service.NewSMTPEmailSender,
)

// HandlerSet groups all HTTP handler providers
var HandlerSet = wire.NewSet(
    handler.NewUserHandler,
    handler.NewOrderHandler,
    handler.NewProductHandler,
)

// InfrastructureSet provides database and external service connections
var InfrastructureSet = wire.NewSet(
    NewConfig,
    NewDatabase,
    NewRedisClient,
    NewSMTPConfig,
)

// ApplicationSet combines all sets for the full application
// This is the top-level set used by the main injector
var ApplicationSet = wire.NewSet(
    InfrastructureSet,
    RepositorySet,
    ServiceSet,
    HandlerSet,
)
```

Now the injector becomes much cleaner:

```go
// wire.go
//go:build wireinject
// +build wireinject

package main

import (
    "github.com/google/wire"

    mywire "myapp/wire"
)

// InitializeApp uses the ApplicationSet to wire everything
// Provider sets hide the complexity of individual providers
func InitializeApp() (*App, error) {
    wire.Build(mywire.ApplicationSet, NewApp)
    return nil, nil
}
```

## Interface Bindings

When your providers return concrete types but your services depend on interfaces, use `wire.Bind` to tell Wire how to satisfy interface dependencies:

```go
// wire/bindings.go
package wire

import (
    "github.com/google/wire"

    "myapp/domain"
    "myapp/repository"
    "myapp/service"
)

// RepositoryBindings maps concrete implementations to interfaces
// This enables loose coupling between layers
var RepositoryBindings = wire.NewSet(
    repository.NewPostgresUserRepository,
    // Bind tells Wire to use PostgresUserRepository for UserRepository
    wire.Bind(new(domain.UserRepository), new(*repository.PostgresUserRepository)),

    repository.NewPostgresOrderRepository,
    wire.Bind(new(domain.OrderRepository), new(*repository.PostgresOrderRepository)),
)

// ServiceBindings maps service implementations to their interfaces
var ServiceBindings = wire.NewSet(
    service.NewSMTPEmailSender,
    // SMTPEmailSender satisfies the EmailSender interface
    wire.Bind(new(domain.EmailSender), new(*service.SMTPEmailSender)),
)

// AllBindings combines all interface bindings for the application
var AllBindings = wire.NewSet(
    RepositoryBindings,
    ServiceBindings,
)
```

Now services can depend on interfaces rather than concrete types:

```go
// service/user_service.go
package service

// UserService depends on interfaces, not concrete implementations
// This makes it testable and flexible
type UserService struct {
    repo   domain.UserRepository  // Interface
    email  domain.EmailSender     // Interface
}

// NewUserService accepts interfaces as parameters
// Wire will provide concrete implementations via bindings
func NewUserService(repo domain.UserRepository, email domain.EmailSender) *UserService {
    return &UserService{
        repo:  repo,
        email: email,
    }
}
```

## Cleanup Functions

Many resources like database connections need cleanup when the application shuts down. Wire supports cleanup functions that are called in reverse order:

```go
// infrastructure/database.go
package infrastructure

import (
    "database/sql"
    "fmt"

    _ "github.com/lib/pq"
)

// NewDatabase creates a database connection with a cleanup function
// The cleanup function closes the connection when the app shuts down
func NewDatabase(cfg *Config) (*sql.DB, func(), error) {
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to open database: %w", err)
    }

    // Configure connection pool
    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

    // Verify connection
    if err := db.Ping(); err != nil {
        db.Close()
        return nil, nil, fmt.Errorf("failed to ping database: %w", err)
    }

    // Return cleanup function as the second return value
    cleanup := func() {
        fmt.Println("Closing database connection...")
        db.Close()
    }

    return db, cleanup, nil
}

// NewRedisClient creates a Redis client with cleanup
func NewRedisClient(cfg *Config) (*redis.Client, func(), error) {
    client := redis.NewClient(&redis.Options{
        Addr:     cfg.RedisAddr,
        Password: cfg.RedisPassword,
        DB:       cfg.RedisDB,
    })

    // Verify connection
    if err := client.Ping(context.Background()).Err(); err != nil {
        return nil, nil, fmt.Errorf("failed to connect to Redis: %w", err)
    }

    cleanup := func() {
        fmt.Println("Closing Redis connection...")
        client.Close()
    }

    return client, cleanup, nil
}
```

The injector now returns a cleanup function:

```go
// wire.go
//go:build wireinject
// +build wireinject

package main

import "github.com/google/wire"

// InitializeApp returns both the app and a cleanup function
// The cleanup function handles all resource cleanup in the right order
func InitializeApp() (*App, func(), error) {
    wire.Build(
        NewConfig,
        NewDatabase,      // Returns cleanup function
        NewRedisClient,   // Returns cleanup function
        RepositorySet,
        ServiceSet,
        NewApp,
    )
    return nil, nil, nil
}
```

Wire generates code that composes all cleanup functions:

```go
// wire_gen.go (generated)
func InitializeApp() (*App, func(), error) {
    config := NewConfig()

    db, dbCleanup, err := NewDatabase(config)
    if err != nil {
        return nil, nil, err
    }

    redisClient, redisCleanup, err := NewRedisClient(config)
    if err != nil {
        dbCleanup() // Clean up database if Redis fails
        return nil, nil, err
    }

    // ... more initialization

    app := NewApp(/* dependencies */)

    // Composite cleanup function
    cleanup := func() {
        redisCleanup()  // Redis closed first (LIFO order)
        dbCleanup()     // Database closed last
    }

    return app, cleanup, nil
}
```

Use the cleanup function in your main:

```go
// main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
)

func main() {
    // Initialize the application with all dependencies
    app, cleanup, err := InitializeApp()
    if err != nil {
        log.Fatalf("Failed to initialize application: %v", err)
    }

    // Ensure cleanup runs on exit
    defer cleanup()

    // Handle graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Listen for termination signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Received shutdown signal, cleaning up...")
        cancel()
    }()

    // Run the application
    if err := app.Run(ctx); err != nil {
        log.Printf("Application error: %v", err)
    }

    log.Println("Application shutdown complete")
}
```

## Testing with Wire

Wire's design makes testing straightforward. You can create test-specific injectors with mock implementations.

### Creating Mock Implementations

First, create mock implementations of your interfaces:

```go
// mocks/user_repository_mock.go
package mocks

import (
    "myapp/domain"
)

// MockUserRepository is a test double for UserRepository
// It allows controlling behavior and verifying interactions
type MockUserRepository struct {
    Users      map[int64]*domain.User
    FindByIDFn func(id int64) (*domain.User, error)
    CreateFn   func(user *domain.User) error
    UpdateFn   func(user *domain.User) error
    DeleteFn   func(id int64) error
}

// NewMockUserRepository creates a mock repository with sensible defaults
func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{
        Users: make(map[int64]*domain.User),
    }
}

// FindByID calls the mock function or uses default behavior
func (m *MockUserRepository) FindByID(id int64) (*domain.User, error) {
    if m.FindByIDFn != nil {
        return m.FindByIDFn(id)
    }
    return m.Users[id], nil
}

// Create stores the user in the mock's internal map
func (m *MockUserRepository) Create(user *domain.User) error {
    if m.CreateFn != nil {
        return m.CreateFn(user)
    }
    user.ID = int64(len(m.Users) + 1)
    m.Users[user.ID] = user
    return nil
}

// Update modifies a user in the mock's internal map
func (m *MockUserRepository) Update(user *domain.User) error {
    if m.UpdateFn != nil {
        return m.UpdateFn(user)
    }
    m.Users[user.ID] = user
    return nil
}

// Delete removes a user from the mock's internal map
func (m *MockUserRepository) Delete(id int64) error {
    if m.DeleteFn != nil {
        return m.DeleteFn(id)
    }
    delete(m.Users, id)
    return nil
}

// FindByEmail searches for a user by email
func (m *MockUserRepository) FindByEmail(email string) (*domain.User, error) {
    for _, user := range m.Users {
        if user.Email == email {
            return user, nil
        }
    }
    return nil, nil
}

// List returns a paginated slice of users
func (m *MockUserRepository) List(offset, limit int) ([]*domain.User, error) {
    var users []*domain.User
    for _, user := range m.Users {
        users = append(users, user)
    }

    if offset >= len(users) {
        return []*domain.User{}, nil
    }

    end := offset + limit
    if end > len(users) {
        end = len(users)
    }

    return users[offset:end], nil
}
```

```go
// mocks/email_sender_mock.go
package mocks

// MockEmailSender is a test double for EmailSender
// It records sent emails for verification in tests
type MockEmailSender struct {
    SentEmails []SentEmail
    SendFn     func(to, subject, body string) error
}

// SentEmail records the details of an email that was "sent"
type SentEmail struct {
    To      string
    Subject string
    Body    string
}

// NewMockEmailSender creates a mock email sender
func NewMockEmailSender() *MockEmailSender {
    return &MockEmailSender{
        SentEmails: []SentEmail{},
    }
}

// Send records the email for later verification
func (m *MockEmailSender) Send(to, subject, body string) error {
    if m.SendFn != nil {
        return m.SendFn(to, subject, body)
    }
    m.SentEmails = append(m.SentEmails, SentEmail{
        To:      to,
        Subject: subject,
        Body:    body,
    })
    return nil
}
```

### Creating Test Injectors

Create a separate Wire file for test injectors:

```go
// wire_test.go
//go:build wireinject
// +build wireinject

package service_test

import (
    "github.com/google/wire"

    "myapp/domain"
    "myapp/mocks"
    "myapp/service"
)

// TestSet provides mock implementations for testing
var TestSet = wire.NewSet(
    mocks.NewMockUserRepository,
    wire.Bind(new(domain.UserRepository), new(*mocks.MockUserRepository)),

    mocks.NewMockEmailSender,
    wire.Bind(new(domain.EmailSender), new(*mocks.MockEmailSender)),
)

// InitializeTestUserService creates a UserService with mock dependencies
// This injector is specifically for testing the user service
func InitializeTestUserService() (*service.UserService, *mocks.MockUserRepository, *mocks.MockEmailSender) {
    wire.Build(
        TestSet,
        service.NewUserService,
    )
    return nil, nil, nil
}
```

### Writing Tests

Now write tests using the test injector:

```go
// service/user_service_test.go
package service_test

import (
    "errors"
    "testing"
    "time"

    "myapp/domain"
    "myapp/service"
)

func TestUserService_GetUser(t *testing.T) {
    // Initialize service with mocks using Wire-generated injector
    userService, mockRepo, _ := InitializeTestUserService()

    // Set up test data
    expectedUser := &domain.User{
        ID:        1,
        Email:     "test@example.com",
        Name:      "Test User",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    mockRepo.Users[1] = expectedUser

    // Execute the test
    user, err := userService.GetUser(1)

    // Verify results
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.ID != expectedUser.ID {
        t.Errorf("expected user ID %d, got %d", expectedUser.ID, user.ID)
    }
    if user.Email != expectedUser.Email {
        t.Errorf("expected email %s, got %s", expectedUser.Email, user.Email)
    }
}

func TestUserService_GetUser_NotFound(t *testing.T) {
    userService, _, _ := InitializeTestUserService()

    // Try to get a non-existent user
    user, err := userService.GetUser(999)

    // Verify the correct error is returned
    if !errors.Is(err, service.ErrUserNotFound) {
        t.Errorf("expected ErrUserNotFound, got %v", err)
    }
    if user != nil {
        t.Error("expected nil user for not found case")
    }
}

func TestUserService_CreateUser(t *testing.T) {
    userService, mockRepo, mockEmail := InitializeTestUserService()

    // Create a new user
    user, err := userService.CreateUser("new@example.com", "New User")

    // Verify creation succeeded
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.ID == 0 {
        t.Error("expected user ID to be set")
    }
    if user.Email != "new@example.com" {
        t.Errorf("expected email new@example.com, got %s", user.Email)
    }

    // Verify user was stored in repository
    if _, exists := mockRepo.Users[user.ID]; !exists {
        t.Error("user was not stored in repository")
    }

    // Give async email sending time to complete
    time.Sleep(100 * time.Millisecond)

    // Verify welcome email was sent
    if len(mockEmail.SentEmails) != 1 {
        t.Errorf("expected 1 email sent, got %d", len(mockEmail.SentEmails))
    }
}

func TestUserService_CreateUser_DuplicateEmail(t *testing.T) {
    userService, mockRepo, _ := InitializeTestUserService()

    // Add existing user
    mockRepo.Users[1] = &domain.User{
        ID:    1,
        Email: "existing@example.com",
        Name:  "Existing User",
    }

    // Try to create user with same email
    user, err := userService.CreateUser("existing@example.com", "New User")

    // Verify duplicate email error
    if !errors.Is(err, service.ErrEmailExists) {
        t.Errorf("expected ErrEmailExists, got %v", err)
    }
    if user != nil {
        t.Error("expected nil user for duplicate email case")
    }
}

func TestUserService_CreateUser_RepositoryError(t *testing.T) {
    userService, mockRepo, _ := InitializeTestUserService()

    // Configure mock to return an error
    expectedErr := errors.New("database connection failed")
    mockRepo.CreateFn = func(user *domain.User) error {
        return expectedErr
    }

    // Try to create user
    user, err := userService.CreateUser("test@example.com", "Test User")

    // Verify error is propagated
    if err == nil {
        t.Error("expected error, got nil")
    }
    if user != nil {
        t.Error("expected nil user on error")
    }
}
```

## Advanced Patterns

### Struct Providers

Sometimes you want to provide a struct directly rather than through a constructor. Wire supports this with `wire.Struct`:

```go
// wire/providers.go
package wire

import "github.com/google/wire"

// Config can be provided as a struct with specific fields filled
// This is useful when you want Wire to populate struct fields
type Config struct {
    Database DatabaseConfig
    Redis    RedisConfig
    SMTP     SMTPConfig
    Server   ServerConfig
}

// ConfigSet uses wire.Struct to build Config from its components
// Wire will inject each field that has a matching provider
var ConfigSet = wire.NewSet(
    NewDatabaseConfig,
    NewRedisConfig,
    NewSMTPConfig,
    NewServerConfig,
    // Build Config struct, injecting all fields
    wire.Struct(new(Config), "*"),
)
```

### Value Providers

For simple values that don't need construction logic, use `wire.Value`:

```go
// wire/values.go
package wire

import "github.com/google/wire"

// EnvironmentName represents the deployment environment
type EnvironmentName string

// DefaultValues provides static values that don't change
var DefaultValues = wire.NewSet(
    // Provide a constant value directly
    wire.Value(EnvironmentName("production")),

    // Provide a pre-constructed struct
    wire.Value(LoggerConfig{
        Level:  "info",
        Format: "json",
    }),
)
```

### Field Providers

Extract and provide specific fields from a struct:

```go
// wire/fields.go
package wire

import "github.com/google/wire"

// AppConfig contains nested configuration sections
type AppConfig struct {
    Database DatabaseConfig
    Cache    CacheConfig
    Auth     AuthConfig
}

// ConfigFields extracts individual config sections as providers
// This allows services to depend on specific config sections
var ConfigFields = wire.NewSet(
    NewAppConfig,
    // Extract Database field from AppConfig
    wire.FieldsOf(new(AppConfig), "Database"),
    // Extract Cache field from AppConfig
    wire.FieldsOf(new(AppConfig), "Cache"),
    // Extract Auth field from AppConfig
    wire.FieldsOf(new(AppConfig), "Auth"),
)
```

## Best Practices

When using Wire in production applications, follow these best practices:

### 1. Organize Providers by Layer

Keep providers organized by architectural layer (infrastructure, repository, service, handler). This makes dependencies clear and helps with code navigation.

```go
// Organize sets by architectural layer
var InfraSet = wire.NewSet(...)    // Database, cache, messaging
var RepoSet = wire.NewSet(...)     // Data access layer
var ServiceSet = wire.NewSet(...)  // Business logic
var HandlerSet = wire.NewSet(...)  // HTTP/gRPC handlers
```

### 2. Use Interface Bindings

Always bind concrete implementations to interfaces. This enables easy swapping of implementations and simplifies testing.

### 3. Return Errors from Providers

Providers should return errors when initialization can fail. Wire handles error propagation automatically.

```go
// Good: Returns error for proper handling
func NewDatabase(cfg *Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.URL)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }
    return db, nil
}
```

### 4. Use Cleanup Functions

Always return cleanup functions for resources that need cleanup. Wire composes them correctly in LIFO order.

### 5. Keep Wire Files Minimal

Wire files should only contain `wire.Build` calls. Put actual provider logic in separate files.

### 6. Run Wire in CI/CD

Add `wire generate` to your CI/CD pipeline to ensure generated code stays in sync:

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    steps:
      - name: Generate Wire code
        run: |
          go install github.com/google/wire/cmd/wire@latest
          wire ./...

      - name: Check for uncommitted changes
        run: |
          git diff --exit-code
```

## Conclusion

Wire provides a powerful, compile-time approach to dependency injection in Go. By generating plain Go code, it offers:

- **Type safety**: Errors are caught at compile time, not runtime
- **Zero overhead**: No reflection or runtime container
- **Debuggability**: Generated code is readable and traceable
- **Testability**: Easy to swap implementations for testing

The key concepts covered in this guide:

1. **Providers**: Functions that create dependencies
2. **Injectors**: Templates that Wire uses to generate wiring code
3. **Provider Sets**: Groups of related providers for organization
4. **Interface Bindings**: Mapping concrete types to interfaces
5. **Cleanup Functions**: Proper resource management

By following these patterns and best practices, you can build Go applications that are modular, testable, and maintainable. Wire handles the complexity of dependency wiring, letting you focus on business logic while ensuring your dependency graph is correct at compile time.

Start with simple providers and gradually adopt more advanced patterns like provider sets and interface bindings as your application grows. The investment in proper dependency injection pays dividends in code quality, testability, and long-term maintainability.
