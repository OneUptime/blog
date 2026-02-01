# How to Use Google Wire for Compile-Time DI in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Dependency Injection, Wire, Architecture, Testing

Description: A practical guide to using Google Wire for compile-time dependency injection in Go applications.

---

Dependency injection is one of those patterns that sounds fancy but really just means "pass your dependencies as arguments instead of creating them inside functions." It makes code testable, modular, and easier to reason about. The problem? As your application grows, manually wiring up all those dependencies becomes tedious and error-prone.

Google Wire solves this by generating the wiring code for you at compile time. No reflection, no runtime magic - just plain Go code that your IDE can navigate and your compiler can check.

## Why Wire Over Runtime DI?

Most DI frameworks in other languages use reflection to wire things up at runtime. Go has reflection too, and there are libraries like Uber's dig that use it. But runtime DI has drawbacks:

- Errors show up when you run the program, not when you build it
- Debugging is harder because the call stack goes through framework code
- Performance overhead from reflection (usually small, but it adds up)
- IDE navigation breaks because the framework calls your code indirectly

Wire takes a different approach. It reads your Go code, figures out how to wire things together, and generates a plain Go file with all the constructor calls. Your final binary has zero Wire code in it - just the generated functions calling your constructors in the right order.

## Installing Wire

First, install the Wire command line tool:

```bash
go install github.com/google/wire/cmd/wire@latest
```

Then add Wire as a dependency in your project:

```bash
go get github.com/google/wire
```

## The Basics: Providers and Injectors

Wire has two core concepts: providers and injectors.

A **provider** is any function that returns a value. Your existing constructor functions are already providers. Wire reads these to understand what types your application can produce and what dependencies each type needs.

An **injector** is a function signature you write that tells Wire what you want. Wire generates the implementation.

Let's start with a simple example. Say you're building an HTTP server that needs a database connection and a logger:

```go
// config.go - Configuration struct loaded from environment or file
package main

type Config struct {
    DatabaseURL string
    LogLevel    string
    Port        int
}

// NewConfig creates a Config from environment variables.
// In a real app, you might use envconfig or viper here.
func NewConfig() *Config {
    return &Config{
        DatabaseURL: os.Getenv("DATABASE_URL"),
        LogLevel:    os.Getenv("LOG_LEVEL"),
        Port:        8080,
    }
}
```

```go
// logger.go - Simple logger that depends on Config
package main

import "log/slog"

type Logger struct {
    *slog.Logger
}

// NewLogger creates a Logger configured based on the Config.
// Wire sees this function takes *Config and returns *Logger.
func NewLogger(cfg *Config) *Logger {
    level := slog.LevelInfo
    if cfg.LogLevel == "debug" {
        level = slog.LevelDebug
    }
    return &Logger{
        Logger: slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})),
    }
}
```

```go
// database.go - Database connection that depends on Config and Logger
package main

import "database/sql"

type Database struct {
    *sql.DB
    logger *Logger
}

// NewDatabase opens a database connection.
// It depends on both Config (for connection string) and Logger (for logging).
func NewDatabase(cfg *Config, logger *Logger) (*Database, error) {
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        return nil, err
    }
    logger.Info("database connected", "url", cfg.DatabaseURL)
    return &Database{DB: db, logger: logger}, nil
}
```

```go
// server.go - HTTP server that ties everything together
package main

import "net/http"

type Server struct {
    db     *Database
    logger *Logger
    mux    *http.ServeMux
}

// NewServer creates the HTTP server with all its dependencies.
func NewServer(db *Database, logger *Logger) *Server {
    s := &Server{db: db, logger: logger, mux: http.NewServeMux()}
    s.routes()
    return s
}
```

Now here's the Wire magic. Create a file called `wire.go`:

```go
//go:build wireinject
// +build wireinject

// wire.go - This file tells Wire what to generate.
// The build tags ensure this file is NOT included in normal builds.
package main

import "github.com/google/wire"

// InitializeServer tells Wire to generate a function that creates a *Server.
// The function body is a template - Wire replaces it with real code.
func InitializeServer() (*Server, error) {
    wire.Build(
        NewConfig,
        NewLogger,
        NewDatabase,
        NewServer,
    )
    return nil, nil // Wire ignores this return
}
```

Run `wire` in your project directory:

```bash
wire
```

Wire generates `wire_gen.go`:

```go
// Code generated by Wire. DO NOT EDIT.

//go:build !wireinject
// +build !wireinject

package main

// InitializeServer creates a new Server with all dependencies wired up.
func InitializeServer() (*Server, error) {
    config := NewConfig()
    logger := NewLogger(config)
    database, err := NewDatabase(config, logger)
    if err != nil {
        return nil, err
    }
    server := NewServer(database, logger)
    return server, nil
}
```

That's it. Wire figured out the order, handled the error from `NewDatabase`, and generated clean, readable code. Your `main.go` just calls `InitializeServer()`.

## Provider Sets: Organizing Related Providers

As your app grows, listing every provider in `wire.Build` gets unwieldy. Provider sets let you group related providers together.

```go
// db/providers.go - Group all database-related providers
package db

import "github.com/google/wire"

// ProviderSet bundles all database providers together.
// Other packages can use this set without knowing the internal details.
var ProviderSet = wire.NewSet(
    NewDatabase,
    NewMigrator,
    NewQueryBuilder,
)
```

```go
// http/providers.go - Group all HTTP-related providers  
package http

import "github.com/google/wire"

var ProviderSet = wire.NewSet(
    NewRouter,
    NewMiddleware,
    NewServer,
)
```

```go
// wire.go - Now the injector is much cleaner
package main

import (
    "github.com/google/wire"
    "myapp/db"
    "myapp/http"
)

func InitializeApp() (*App, error) {
    wire.Build(
        NewConfig,
        NewLogger,
        db.ProviderSet,
        http.ProviderSet,
        NewApp,
    )
    return nil, nil
}
```

This keeps your wire.go file manageable even in large applications.

## Binding Interfaces

Real applications depend on interfaces, not concrete types. This is crucial for testing - you want to swap implementations without changing the code that uses them.

Wire handles this with `wire.Bind`:

```go
// repository.go - Define the interface and implementation separately
package repository

// UserRepository defines the contract for user data access.
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(user *User) error
}

// PostgresUserRepository implements UserRepository using PostgreSQL.
type PostgresUserRepository struct {
    db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) FindByID(id string) (*User, error) {
    // implementation
}
```

```go
// wire.go - Bind the interface to the concrete implementation
package main

import "github.com/google/wire"

var RepositorySet = wire.NewSet(
    repository.NewPostgresUserRepository,
    // This tells Wire: when something needs UserRepository, use *PostgresUserRepository
    wire.Bind(new(repository.UserRepository), new(*repository.PostgresUserRepository)),
)
```

Now any provider that takes `repository.UserRepository` as a parameter will receive the Postgres implementation.

## Cleanup Functions

Many resources need cleanup - database connections should be closed, background goroutines should be stopped. Wire supports this through cleanup functions.

If a provider returns a cleanup function as its second return value (before any error), Wire tracks it:

```go
// NewDatabase returns the database, a cleanup function, and possibly an error.
// Wire will include the cleanup function in the generated code.
func NewDatabase(cfg *Config) (*Database, func(), error) {
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        return nil, nil, err
    }
    
    // Return a cleanup function that closes the connection
    cleanup := func() {
        db.Close()
    }
    
    return &Database{DB: db}, cleanup, nil
}
```

The generated injector returns a combined cleanup function:

```go
func InitializeApp() (*App, func(), error) {
    config := NewConfig()
    database, cleanup, err := NewDatabase(config)
    if err != nil {
        return nil, nil, err
    }
    server := NewServer(database)
    return server, cleanup, nil  // cleanup closes the database
}
```

When you have multiple providers with cleanup functions, Wire chains them in reverse order - last created, first cleaned up. This handles dependencies correctly.

## Wire vs Manual DI

Let's compare Wire to doing it manually. Here's manual wiring for a moderately complex app:

```go
// Manual wiring - you write and maintain this yourself
func main() {
    cfg := config.Load()
    logger := logging.New(cfg.LogLevel)
    
    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil {
        logger.Fatal("database connection failed", "error", err)
    }
    defer db.Close()
    
    cache := cache.New(cfg.RedisURL)
    defer cache.Close()
    
    userRepo := repository.NewUserRepository(db, cache, logger)
    orderRepo := repository.NewOrderRepository(db, logger)
    
    userService := service.NewUserService(userRepo, logger)
    orderService := service.NewOrderService(orderRepo, userRepo, logger)
    paymentService := service.NewPaymentService(cfg.StripeKey, logger)
    
    userHandler := handler.NewUserHandler(userService, logger)
    orderHandler := handler.NewOrderHandler(orderService, paymentService, logger)
    
    router := http.NewRouter(userHandler, orderHandler, logger)
    server := http.NewServer(cfg.Port, router, logger)
    
    server.Start()
}
```

This works fine for small apps. But notice:

- Every time you add a dependency to a service, you update main.go
- The order matters - you can't create userService before userRepo
- Error handling is scattered throughout
- Cleanup (defer statements) is easy to forget

With Wire, you add the provider to a set and regenerate. Wire figures out the order and generates the cleanup handling.

That said, Wire adds complexity. For small projects or simple dependency graphs, manual wiring is perfectly fine. Consider Wire when:

- Your main.go is getting long and hard to follow
- You keep making mistakes in the wiring order
- You want compile-time validation that all dependencies are satisfiable
- Multiple binaries share providers but wire them differently

## Testing Benefits

The real payoff of proper DI - whether manual or with Wire - is testing. When your components depend on interfaces, you can inject test doubles.

```go
// user_service_test.go - Test with a mock repository
package service

// MockUserRepository implements UserRepository for testing.
type MockUserRepository struct {
    users map[string]*User
}

func (m *MockUserRepository) FindByID(id string) (*User, error) {
    if user, ok := m.users[id]; ok {
        return user, nil
    }
    return nil, ErrNotFound
}

func TestUserService_GetUser(t *testing.T) {
    // Create a mock with test data
    mock := &MockUserRepository{
        users: map[string]*User{
            "123": {ID: "123", Name: "Test User"},
        },
    }
    
    // Inject the mock - no Wire needed in tests
    svc := NewUserService(mock, NewTestLogger())
    
    user, err := svc.GetUser("123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Test User" {
        t.Errorf("expected Test User, got %s", user.Name)
    }
}
```

You can also create a separate Wire injector for integration tests that uses real implementations but a test database:

```go
//go:build wireinject

package integration

// InitializeTestApp creates an App wired for integration testing.
// Uses a test database but real implementations otherwise.
func InitializeTestApp(testDBURL string) (*App, func(), error) {
    wire.Build(
        provideTestConfig,  // Uses testDBURL instead of env vars
        NewLogger,
        db.ProviderSet,
        service.ProviderSet,
        NewApp,
    )
    return nil, nil, nil
}
```

## Common Patterns and Tips

**Use value types for simple config**: Instead of passing the entire Config everywhere, extract specific values:

```go
// Provide just the database URL, not the whole config
func ProvideDatabaseURL(cfg *Config) DatabaseURL {
    return DatabaseURL(cfg.DatabaseURL)
}

var ConfigSet = wire.NewSet(
    NewConfig,
    ProvideDatabaseURL,
    ProvideLogLevel,
)
```

**Keep wire.go files small**: One injector per binary. If you have multiple binaries (API server, worker, CLI), each gets its own wire.go in its main package.

**Run wire in CI**: Add `wire && git diff --exit-code` to your CI pipeline. This catches cases where someone changed a provider but forgot to regenerate.

**Use wire.Value for constants**: If you need to inject a specific value:

```go
wire.Build(
    wire.Value(time.Second * 30),  // Request timeout
    NewHTTPClient,
)
```

## Wrapping Up

Wire hits a sweet spot for Go dependency injection. It gives you the benefits of a DI framework - automated wiring, compile-time validation, clean separation of concerns - without the runtime overhead or debugging headaches of reflection-based solutions.

Start simple. Use manual wiring until it becomes painful, then introduce Wire incrementally. Group related providers into sets, bind interfaces for testability, and let Wire handle the tedious parts.

The generated code is yours to read and debug. That's the beauty of compile-time code generation - no magic, just Go.

---

*Build observable Go applications with [OneUptime](https://oneuptime.com) - add monitoring and tracing with minimal code changes.*
