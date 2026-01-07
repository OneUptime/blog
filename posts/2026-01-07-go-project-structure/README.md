# How to Structure Go Projects for Maintainability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Project Structure, Clean Architecture, Best Practices

Description: Structure Go projects for maintainability with standard layouts, proper package organization, and dependency injection patterns.

---

Building maintainable Go applications requires more than just writing clean code. It demands a well-thought-out project structure that scales with your team and codebase. In this comprehensive guide, we will explore the standard Go project layout, package organization strategies, and dependency injection patterns that will keep your projects maintainable for years to come.

## Why Project Structure Matters

A well-organized Go project offers several benefits:

- **Discoverability**: New team members can quickly understand where to find code
- **Maintainability**: Changes are isolated and less likely to cause unintended side effects
- **Testability**: Clear boundaries make unit testing straightforward
- **Scalability**: The structure grows naturally as your application expands
- **Collaboration**: Multiple developers can work on different parts without conflicts

## The Standard Go Project Layout

The Go community has converged on a standard project layout that has become the de facto structure for production applications. Let us explore each directory and its purpose.

### Complete Project Structure Overview

Below is a comprehensive view of a well-structured Go project showing all major directories and their contents:

```
myproject/
├── cmd/
│   ├── api/
│   │   └── main.go
│   ├── worker/
│   │   └── main.go
│   └── cli/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── domain/
│   │   ├── user.go
│   │   └── order.go
│   ├── handler/
│   │   ├── user_handler.go
│   │   └── order_handler.go
│   ├── service/
│   │   ├── user_service.go
│   │   └── order_service.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   └── order_repository.go
│   └── middleware/
│       ├── auth.go
│       └── logging.go
├── pkg/
│   ├── httputil/
│   │   └── response.go
│   ├── validator/
│   │   └── validator.go
│   └── logger/
│       └── logger.go
├── api/
│   └── openapi.yaml
├── configs/
│   ├── config.yaml
│   └── config.example.yaml
├── scripts/
│   ├── build.sh
│   └── migrate.sh
├── migrations/
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
├── test/
│   └── integration/
│       └── api_test.go
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

## The cmd/ Directory

The `cmd/` directory contains the entry points for your application. Each subdirectory represents a separate executable.

### Basic cmd/ Structure

This example shows how to organize multiple application entry points, each with its own main.go file:

```go
// cmd/api/main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "myproject/internal/config"
    "myproject/internal/handler"
    "myproject/internal/repository"
    "myproject/internal/service"
)

func main() {
    // Load configuration from environment or config files
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("failed to load config: %v", err)
    }

    // Initialize dependencies using dependency injection
    // This creates a clear chain: repository -> service -> handler
    userRepo := repository.NewUserRepository(cfg.Database)
    userService := service.NewUserService(userRepo)
    userHandler := handler.NewUserHandler(userService)

    // Set up HTTP server with configured timeouts
    srv := &http.Server{
        Addr:         cfg.ServerAddress,
        Handler:      userHandler.Routes(),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server in a goroutine for graceful shutdown support
    go func() {
        log.Printf("Starting server on %s", cfg.ServerAddress)
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    // Wait for interrupt signal for graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    // Give outstanding requests 30 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("server forced to shutdown: %v", err)
    }

    log.Println("Server exited properly")
}
```

### Worker Application Entry Point

Separate executables for background workers keep concerns isolated and allow independent scaling:

```go
// cmd/worker/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "myproject/internal/config"
    "myproject/internal/queue"
    "myproject/internal/worker"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("failed to load config: %v", err)
    }

    // Initialize queue connection for job processing
    q, err := queue.NewConnection(cfg.QueueURL)
    if err != nil {
        log.Fatalf("failed to connect to queue: %v", err)
    }
    defer q.Close()

    // Create worker with the queue connection
    w := worker.New(q, cfg.WorkerConcurrency)

    // Set up context with cancellation for graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle shutdown signals
    go func() {
        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit
        log.Println("Shutting down worker...")
        cancel()
    }()

    // Run worker until context is cancelled
    if err := w.Run(ctx); err != nil {
        log.Fatalf("worker error: %v", err)
    }
}
```

## The internal/ Directory

The `internal/` directory is special in Go. Code here cannot be imported by external projects, providing a clear boundary between public and private APIs. This is enforced by the Go compiler.

### Domain Layer

The domain layer contains your core business entities. These should be pure Go structs with no external dependencies:

```go
// internal/domain/user.go
package domain

import (
    "errors"
    "regexp"
    "time"
)

// Common domain errors that can be checked by callers
var (
    ErrUserNotFound      = errors.New("user not found")
    ErrUserAlreadyExists = errors.New("user already exists")
    ErrInvalidEmail      = errors.New("invalid email format")
    ErrWeakPassword      = errors.New("password does not meet requirements")
)

// User represents a user in our system.
// This is a domain entity - it should not contain any infrastructure concerns.
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Role      UserRole  `json:"role"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// UserRole represents the role of a user in the system
type UserRole string

const (
    RoleAdmin  UserRole = "admin"
    RoleEditor UserRole = "editor"
    RoleViewer UserRole = "viewer"
)

// Validate checks if the user data is valid according to business rules
func (u *User) Validate() error {
    if !isValidEmail(u.Email) {
        return ErrInvalidEmail
    }
    if u.Name == "" {
        return errors.New("name is required")
    }
    if !u.Role.IsValid() {
        return errors.New("invalid role")
    }
    return nil
}

// IsValid checks if the role is one of the allowed values
func (r UserRole) IsValid() bool {
    switch r {
    case RoleAdmin, RoleEditor, RoleViewer:
        return true
    default:
        return false
    }
}

// isValidEmail validates email format using a simple regex
func isValidEmail(email string) bool {
    pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
    matched, _ := regexp.MatchString(pattern, email)
    return matched
}

// CreateUserRequest represents the data needed to create a new user
type CreateUserRequest struct {
    Email    string   `json:"email"`
    Name     string   `json:"name"`
    Password string   `json:"password"`
    Role     UserRole `json:"role"`
}

// UpdateUserRequest represents the data that can be updated for a user
type UpdateUserRequest struct {
    Name *string   `json:"name,omitempty"`
    Role *UserRole `json:"role,omitempty"`
}
```

### Repository Layer

Repositories abstract data access. They should be defined as interfaces to allow easy testing and swapping implementations:

```go
// internal/repository/interfaces.go
package repository

import (
    "context"

    "myproject/internal/domain"
)

// UserRepository defines the interface for user data access.
// Using an interface allows us to swap implementations (PostgreSQL, MySQL, in-memory)
// and makes testing with mocks straightforward.
type UserRepository interface {
    // Create stores a new user and returns the created user with ID
    Create(ctx context.Context, user *domain.User) (*domain.User, error)

    // GetByID retrieves a user by their unique identifier
    GetByID(ctx context.Context, id string) (*domain.User, error)

    // GetByEmail retrieves a user by their email address
    GetByEmail(ctx context.Context, email string) (*domain.User, error)

    // Update modifies an existing user's data
    Update(ctx context.Context, user *domain.User) error

    // Delete removes a user from the system
    Delete(ctx context.Context, id string) error

    // List retrieves users with pagination support
    List(ctx context.Context, offset, limit int) ([]*domain.User, error)

    // Count returns the total number of users
    Count(ctx context.Context) (int64, error)
}
```

### PostgreSQL Repository Implementation

This concrete implementation satisfies the UserRepository interface using PostgreSQL:

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

    "myproject/internal/domain"
    "myproject/internal/repository"
)

// Verify at compile time that postgresUserRepository implements UserRepository
var _ repository.UserRepository = (*postgresUserRepository)(nil)

// postgresUserRepository implements UserRepository using PostgreSQL
type postgresUserRepository struct {
    db *sql.DB
}

// NewUserRepository creates a new PostgreSQL-backed user repository
func NewUserRepository(db *sql.DB) repository.UserRepository {
    return &postgresUserRepository{db: db}
}

// Create inserts a new user into the database
func (r *postgresUserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
    // Generate a new UUID for the user
    user.ID = uuid.New().String()
    user.CreatedAt = time.Now()
    user.UpdatedAt = time.Now()

    query := `
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, role, created_at, updated_at
    `

    err := r.db.QueryRowContext(
        ctx,
        query,
        user.ID,
        user.Email,
        user.Name,
        user.Role,
        user.CreatedAt,
        user.UpdatedAt,
    ).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Role,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if err != nil {
        // Check for unique constraint violation (duplicate email)
        var pqErr *pq.Error
        if errors.As(err, &pqErr) && pqErr.Code == "23505" {
            return nil, domain.ErrUserAlreadyExists
        }
        return nil, err
    }

    return user, nil
}

// GetByID retrieves a user by their ID
func (r *postgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    query := `
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE id = $1
    `

    user := &domain.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Role,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, domain.ErrUserNotFound
        }
        return nil, err
    }

    return user, nil
}

// GetByEmail retrieves a user by their email address
func (r *postgresUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
    query := `
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE email = $1
    `

    user := &domain.User{}
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Role,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, domain.ErrUserNotFound
        }
        return nil, err
    }

    return user, nil
}

// List retrieves a paginated list of users
func (r *postgresUserRepository) List(ctx context.Context, offset, limit int) ([]*domain.User, error) {
    query := `
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `

    rows, err := r.db.QueryContext(ctx, query, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*domain.User
    for rows.Next() {
        user := &domain.User{}
        if err := rows.Scan(
            &user.ID,
            &user.Email,
            &user.Name,
            &user.Role,
            &user.CreatedAt,
            &user.UpdatedAt,
        ); err != nil {
            return nil, err
        }
        users = append(users, user)
    }

    return users, rows.Err()
}
```

### Service Layer

Services contain business logic and orchestrate between handlers and repositories:

```go
// internal/service/user_service.go
package service

import (
    "context"
    "errors"

    "golang.org/x/crypto/bcrypt"

    "myproject/internal/domain"
    "myproject/internal/repository"
)

// UserService defines the interface for user business operations.
// This interface makes the service testable and allows for alternative implementations.
type UserService interface {
    CreateUser(ctx context.Context, req *domain.CreateUserRequest) (*domain.User, error)
    GetUser(ctx context.Context, id string) (*domain.User, error)
    UpdateUser(ctx context.Context, id string, req *domain.UpdateUserRequest) (*domain.User, error)
    DeleteUser(ctx context.Context, id string) error
    ListUsers(ctx context.Context, page, pageSize int) (*UserListResult, error)
}

// UserListResult contains paginated user results
type UserListResult struct {
    Users      []*domain.User `json:"users"`
    TotalCount int64          `json:"total_count"`
    Page       int            `json:"page"`
    PageSize   int            `json:"page_size"`
}

// userService implements UserService with all user-related business logic
type userService struct {
    userRepo     repository.UserRepository
    passwordRepo repository.PasswordRepository
}

// NewUserService creates a new user service with the required dependencies.
// Dependencies are injected through the constructor, making testing easier.
func NewUserService(
    userRepo repository.UserRepository,
    passwordRepo repository.PasswordRepository,
) UserService {
    return &userService{
        userRepo:     userRepo,
        passwordRepo: passwordRepo,
    }
}

// CreateUser creates a new user after validating the request and hashing the password
func (s *userService) CreateUser(ctx context.Context, req *domain.CreateUserRequest) (*domain.User, error) {
    // Validate password meets requirements
    if err := validatePassword(req.Password); err != nil {
        return nil, err
    }

    // Check if email is already taken
    existing, err := s.userRepo.GetByEmail(ctx, req.Email)
    if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
        return nil, err
    }
    if existing != nil {
        return nil, domain.ErrUserAlreadyExists
    }

    // Create the user entity
    user := &domain.User{
        Email: req.Email,
        Name:  req.Name,
        Role:  req.Role,
    }

    // Validate the user entity
    if err := user.Validate(); err != nil {
        return nil, err
    }

    // Create user in repository
    createdUser, err := s.userRepo.Create(ctx, user)
    if err != nil {
        return nil, err
    }

    // Hash and store password separately
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    if err := s.passwordRepo.Store(ctx, createdUser.ID, string(hashedPassword)); err != nil {
        // Rollback user creation if password storage fails
        _ = s.userRepo.Delete(ctx, createdUser.ID)
        return nil, err
    }

    return createdUser, nil
}

// GetUser retrieves a user by ID
func (s *userService) GetUser(ctx context.Context, id string) (*domain.User, error) {
    return s.userRepo.GetByID(ctx, id)
}

// UpdateUser updates an existing user's information
func (s *userService) UpdateUser(ctx context.Context, id string, req *domain.UpdateUserRequest) (*domain.User, error) {
    // Fetch existing user
    user, err := s.userRepo.GetByID(ctx, id)
    if err != nil {
        return nil, err
    }

    // Apply updates only for fields that are provided
    if req.Name != nil {
        user.Name = *req.Name
    }
    if req.Role != nil {
        user.Role = *req.Role
    }

    // Validate updated user
    if err := user.Validate(); err != nil {
        return nil, err
    }

    // Persist changes
    if err := s.userRepo.Update(ctx, user); err != nil {
        return nil, err
    }

    return user, nil
}

// ListUsers returns a paginated list of users
func (s *userService) ListUsers(ctx context.Context, page, pageSize int) (*UserListResult, error) {
    // Calculate offset from page number
    offset := (page - 1) * pageSize

    // Fetch users and total count concurrently for better performance
    users, err := s.userRepo.List(ctx, offset, pageSize)
    if err != nil {
        return nil, err
    }

    count, err := s.userRepo.Count(ctx)
    if err != nil {
        return nil, err
    }

    return &UserListResult{
        Users:      users,
        TotalCount: count,
        Page:       page,
        PageSize:   pageSize,
    }, nil
}

// validatePassword checks if the password meets security requirements
func validatePassword(password string) error {
    if len(password) < 8 {
        return domain.ErrWeakPassword
    }
    // Add more password validation rules as needed
    return nil
}
```

### Handler Layer

Handlers deal with HTTP concerns and delegate to services:

```go
// internal/handler/user_handler.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "strconv"

    "github.com/go-chi/chi/v5"

    "myproject/internal/domain"
    "myproject/internal/service"
    "myproject/pkg/httputil"
)

// UserHandler handles HTTP requests for user operations
type UserHandler struct {
    userService service.UserService
}

// NewUserHandler creates a new user handler with the required service dependency
func NewUserHandler(userService service.UserService) *UserHandler {
    return &UserHandler{
        userService: userService,
    }
}

// Routes returns the router with all user routes configured.
// This keeps route definitions close to their handlers.
func (h *UserHandler) Routes() http.Handler {
    r := chi.NewRouter()

    r.Post("/", h.CreateUser)
    r.Get("/", h.ListUsers)
    r.Get("/{id}", h.GetUser)
    r.Put("/{id}", h.UpdateUser)
    r.Delete("/{id}", h.DeleteUser)

    return r
}

// CreateUser handles POST /users requests
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req domain.CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        httputil.Error(w, http.StatusBadRequest, "invalid request body")
        return
    }

    user, err := h.userService.CreateUser(r.Context(), &req)
    if err != nil {
        h.handleError(w, err)
        return
    }

    httputil.JSON(w, http.StatusCreated, user)
}

// GetUser handles GET /users/{id} requests
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    user, err := h.userService.GetUser(r.Context(), id)
    if err != nil {
        h.handleError(w, err)
        return
    }

    httputil.JSON(w, http.StatusOK, user)
}

// ListUsers handles GET /users requests with pagination
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    // Parse pagination parameters with defaults
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page < 1 {
        page = 1
    }

    pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
    if pageSize < 1 || pageSize > 100 {
        pageSize = 20
    }

    result, err := h.userService.ListUsers(r.Context(), page, pageSize)
    if err != nil {
        h.handleError(w, err)
        return
    }

    httputil.JSON(w, http.StatusOK, result)
}

// UpdateUser handles PUT /users/{id} requests
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    var req domain.UpdateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        httputil.Error(w, http.StatusBadRequest, "invalid request body")
        return
    }

    user, err := h.userService.UpdateUser(r.Context(), id, &req)
    if err != nil {
        h.handleError(w, err)
        return
    }

    httputil.JSON(w, http.StatusOK, user)
}

// DeleteUser handles DELETE /users/{id} requests
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    if err := h.userService.DeleteUser(r.Context(), id); err != nil {
        h.handleError(w, err)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// handleError maps domain errors to appropriate HTTP responses
func (h *UserHandler) handleError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, domain.ErrUserNotFound):
        httputil.Error(w, http.StatusNotFound, "user not found")
    case errors.Is(err, domain.ErrUserAlreadyExists):
        httputil.Error(w, http.StatusConflict, "user already exists")
    case errors.Is(err, domain.ErrInvalidEmail):
        httputil.Error(w, http.StatusBadRequest, "invalid email format")
    case errors.Is(err, domain.ErrWeakPassword):
        httputil.Error(w, http.StatusBadRequest, "password does not meet requirements")
    default:
        httputil.Error(w, http.StatusInternalServerError, "internal server error")
    }
}
```

## The pkg/ Directory

The `pkg/` directory contains code that can be imported by external projects. Use this for reusable utilities.

### HTTP Utility Package

Common HTTP response helpers that can be used across handlers:

```go
// pkg/httputil/response.go
package httputil

import (
    "encoding/json"
    "net/http"
)

// ErrorResponse represents a standardized error response format
type ErrorResponse struct {
    Error   string `json:"error"`
    Code    int    `json:"code"`
    Message string `json:"message,omitempty"`
}

// JSON writes a JSON response with the given status code and data
func JSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)

    if data != nil {
        if err := json.NewEncoder(w).Encode(data); err != nil {
            // Log encoding error but response headers are already sent
            http.Error(w, "failed to encode response", http.StatusInternalServerError)
        }
    }
}

// Error writes a standardized error response
func Error(w http.ResponseWriter, status int, message string) {
    JSON(w, status, ErrorResponse{
        Error:   http.StatusText(status),
        Code:    status,
        Message: message,
    })
}

// NoContent writes a 204 No Content response
func NoContent(w http.ResponseWriter) {
    w.WriteHeader(http.StatusNoContent)
}
```

## Dependency Injection Patterns

Dependency injection is crucial for testable and maintainable Go code. Here are the recommended patterns.

### Constructor Injection

Constructor injection is the most common and recommended pattern in Go:

```go
// internal/service/order_service.go
package service

import (
    "context"

    "myproject/internal/domain"
    "myproject/internal/repository"
)

// OrderService defines the interface for order operations
type OrderService interface {
    CreateOrder(ctx context.Context, userID string, items []domain.OrderItem) (*domain.Order, error)
    GetOrder(ctx context.Context, id string) (*domain.Order, error)
    ProcessPayment(ctx context.Context, orderID string, payment domain.PaymentInfo) error
}

// orderService implements OrderService with all dependencies injected
type orderService struct {
    orderRepo      repository.OrderRepository
    inventoryRepo  repository.InventoryRepository
    paymentService PaymentService
    notifier       NotificationService
}

// NewOrderService creates an order service with all required dependencies.
// This pattern makes dependencies explicit and the service easy to test.
func NewOrderService(
    orderRepo repository.OrderRepository,
    inventoryRepo repository.InventoryRepository,
    paymentService PaymentService,
    notifier NotificationService,
) OrderService {
    return &orderService{
        orderRepo:      orderRepo,
        inventoryRepo:  inventoryRepo,
        paymentService: paymentService,
        notifier:       notifier,
    }
}

// CreateOrder creates a new order after checking inventory
func (s *orderService) CreateOrder(ctx context.Context, userID string, items []domain.OrderItem) (*domain.Order, error) {
    // Check inventory for all items
    for _, item := range items {
        available, err := s.inventoryRepo.CheckAvailability(ctx, item.ProductID, item.Quantity)
        if err != nil {
            return nil, err
        }
        if !available {
            return nil, domain.ErrInsufficientInventory
        }
    }

    // Create the order
    order := &domain.Order{
        UserID: userID,
        Items:  items,
        Status: domain.OrderStatusPending,
    }

    createdOrder, err := s.orderRepo.Create(ctx, order)
    if err != nil {
        return nil, err
    }

    // Reserve inventory
    for _, item := range items {
        if err := s.inventoryRepo.Reserve(ctx, item.ProductID, item.Quantity); err != nil {
            // Handle rollback in production
            return nil, err
        }
    }

    // Send notification asynchronously
    go s.notifier.SendOrderConfirmation(context.Background(), createdOrder)

    return createdOrder, nil
}
```

### Wire for Dependency Injection

For larger applications, use Google's Wire for compile-time dependency injection:

```go
// internal/wire/wire.go
//go:build wireinject
// +build wireinject

package wire

import (
    "database/sql"

    "github.com/google/wire"

    "myproject/internal/handler"
    "myproject/internal/repository/postgres"
    "myproject/internal/service"
)

// ProviderSet groups all providers together for organization
var ProviderSet = wire.NewSet(
    // Repositories
    postgres.NewUserRepository,
    postgres.NewPasswordRepository,
    postgres.NewOrderRepository,
    postgres.NewInventoryRepository,

    // Services
    service.NewUserService,
    service.NewOrderService,
    service.NewPaymentService,
    service.NewNotificationService,

    // Handlers
    handler.NewUserHandler,
    handler.NewOrderHandler,
)

// Application holds all the dependencies for the application
type Application struct {
    UserHandler  *handler.UserHandler
    OrderHandler *handler.OrderHandler
}

// InitializeApplication creates a fully wired Application.
// Wire generates the implementation of this function at compile time.
func InitializeApplication(db *sql.DB) (*Application, error) {
    wire.Build(
        ProviderSet,
        wire.Struct(new(Application), "*"),
    )
    return nil, nil
}
```

## Avoiding Circular Dependencies

Circular dependencies are a common issue in Go. Here are strategies to prevent them.

### Use Interfaces at Package Boundaries

Define interfaces in the package that uses them, not the package that implements them:

```go
// internal/service/notification.go
package service

import "context"

// EmailSender is defined in the service package where it is used.
// This breaks the dependency cycle by depending on an abstraction.
type EmailSender interface {
    SendEmail(ctx context.Context, to, subject, body string) error
}

// notificationService uses EmailSender without depending on the email package
type notificationService struct {
    emailSender EmailSender
}

func NewNotificationService(emailSender EmailSender) *notificationService {
    return &notificationService{
        emailSender: emailSender,
    }
}
```

### Extract Shared Types to a Common Package

When two packages need to share types, extract them to a third package:

```go
// internal/domain/events.go
package domain

import "time"

// Event types that can be used across packages without creating cycles

// OrderCreatedEvent is published when a new order is created
type OrderCreatedEvent struct {
    OrderID   string    `json:"order_id"`
    UserID    string    `json:"user_id"`
    Total     float64   `json:"total"`
    CreatedAt time.Time `json:"created_at"`
}

// PaymentProcessedEvent is published when payment is successful
type PaymentProcessedEvent struct {
    OrderID     string    `json:"order_id"`
    PaymentID   string    `json:"payment_id"`
    Amount      float64   `json:"amount"`
    ProcessedAt time.Time `json:"processed_at"`
}

// InventoryReservedEvent is published when inventory is reserved
type InventoryReservedEvent struct {
    OrderID   string    `json:"order_id"`
    ProductID string    `json:"product_id"`
    Quantity  int       `json:"quantity"`
    ExpiresAt time.Time `json:"expires_at"`
}
```

## Configuration Management

A well-structured configuration package makes your application flexible and testable:

```go
// internal/config/config.go
package config

import (
    "os"
    "strconv"
    "time"
)

// Config holds all configuration for the application.
// Values are loaded from environment variables with sensible defaults.
type Config struct {
    // Server configuration
    ServerAddress     string
    ServerReadTimeout time.Duration
    ServerWriteTimeout time.Duration

    // Database configuration
    DatabaseURL          string
    DatabaseMaxOpenConns int
    DatabaseMaxIdleConns int

    // Redis configuration
    RedisURL string

    // Feature flags
    EnableMetrics bool
    EnableTracing bool

    // External service configuration
    PaymentServiceURL string
    NotificationServiceURL string
}

// Load reads configuration from environment variables.
// This pattern makes configuration explicit and easy to validate.
func Load() (*Config, error) {
    cfg := &Config{
        // Server defaults
        ServerAddress:      getEnv("SERVER_ADDRESS", ":8080"),
        ServerReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second),
        ServerWriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second),

        // Database defaults
        DatabaseURL:          getEnv("DATABASE_URL", "postgres://localhost:5432/myapp"),
        DatabaseMaxOpenConns: getIntEnv("DATABASE_MAX_OPEN_CONNS", 25),
        DatabaseMaxIdleConns: getIntEnv("DATABASE_MAX_IDLE_CONNS", 5),

        // Redis
        RedisURL: getEnv("REDIS_URL", "redis://localhost:6379"),

        // Feature flags
        EnableMetrics: getBoolEnv("ENABLE_METRICS", true),
        EnableTracing: getBoolEnv("ENABLE_TRACING", true),

        // External services
        PaymentServiceURL:      getEnv("PAYMENT_SERVICE_URL", ""),
        NotificationServiceURL: getEnv("NOTIFICATION_SERVICE_URL", ""),
    }

    // Validate required configuration
    if err := cfg.Validate(); err != nil {
        return nil, err
    }

    return cfg, nil
}

// Validate checks that all required configuration is present
func (c *Config) Validate() error {
    // Add validation logic for required fields
    return nil
}

// Helper functions for reading environment variables with type conversion

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
    if value := os.Getenv(key); value != "" {
        if boolValue, err := strconv.ParseBool(value); err == nil {
            return boolValue
        }
    }
    return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}
```

## Middleware Organization

Organize middleware in a dedicated package for reusability:

```go
// internal/middleware/logging.go
package middleware

import (
    "log/slog"
    "net/http"
    "time"
)

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// Logging returns middleware that logs all HTTP requests.
// It captures request method, path, status code, and duration.
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()

            // Wrap response writer to capture status code
            wrapped := &responseWriter{
                ResponseWriter: w,
                statusCode:     http.StatusOK,
            }

            // Call the next handler
            next.ServeHTTP(wrapped, r)

            // Log the request details
            logger.Info("http request",
                slog.String("method", r.Method),
                slog.String("path", r.URL.Path),
                slog.Int("status", wrapped.statusCode),
                slog.Duration("duration", time.Since(start)),
                slog.String("remote_addr", r.RemoteAddr),
            )
        })
    }
}
```

### Authentication Middleware

Authentication middleware validates tokens and injects user context:

```go
// internal/middleware/auth.go
package middleware

import (
    "context"
    "net/http"
    "strings"

    "myproject/internal/domain"
    "myproject/internal/service"
    "myproject/pkg/httputil"
)

// contextKey is a custom type to avoid context key collisions
type contextKey string

const userContextKey contextKey = "user"

// Auth returns middleware that validates JWT tokens and sets user context.
// Protected routes can then access the authenticated user from the context.
func Auth(authService service.AuthService) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract token from Authorization header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                httputil.Error(w, http.StatusUnauthorized, "missing authorization header")
                return
            }

            // Expect "Bearer <token>" format
            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || parts[0] != "Bearer" {
                httputil.Error(w, http.StatusUnauthorized, "invalid authorization header format")
                return
            }

            token := parts[1]

            // Validate token and get user
            user, err := authService.ValidateToken(r.Context(), token)
            if err != nil {
                httputil.Error(w, http.StatusUnauthorized, "invalid or expired token")
                return
            }

            // Add user to context for downstream handlers
            ctx := context.WithValue(r.Context(), userContextKey, user)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// UserFromContext extracts the authenticated user from the request context.
// Returns nil if no user is present (for unauthenticated requests).
func UserFromContext(ctx context.Context) *domain.User {
    user, ok := ctx.Value(userContextKey).(*domain.User)
    if !ok {
        return nil
    }
    return user
}

// RequireRole returns middleware that checks if the user has the required role
func RequireRole(roles ...domain.UserRole) func(http.Handler) http.Handler {
    roleSet := make(map[domain.UserRole]bool)
    for _, role := range roles {
        roleSet[role] = true
    }

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := UserFromContext(r.Context())
            if user == nil {
                httputil.Error(w, http.StatusUnauthorized, "authentication required")
                return
            }

            if !roleSet[user.Role] {
                httputil.Error(w, http.StatusForbidden, "insufficient permissions")
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Testing with This Structure

The layered architecture makes testing straightforward. Here is how to test each layer.

### Service Layer Tests

Mock repositories to test service logic in isolation:

```go
// internal/service/user_service_test.go
package service_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "myproject/internal/domain"
    "myproject/internal/service"
)

// MockUserRepository is a mock implementation of UserRepository for testing
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
    args := m.Called(ctx, user)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
    args := m.Called(ctx, email)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.User), args.Error(1)
}

// Additional mock methods...

func TestUserService_CreateUser_Success(t *testing.T) {
    // Arrange
    mockUserRepo := new(MockUserRepository)
    mockPasswordRepo := new(MockPasswordRepository)

    svc := service.NewUserService(mockUserRepo, mockPasswordRepo)

    req := &domain.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "Test User",
        Password: "securepassword123",
        Role:     domain.RoleViewer,
    }

    // Set up expectations
    mockUserRepo.On("GetByEmail", mock.Anything, req.Email).
        Return(nil, domain.ErrUserNotFound)

    mockUserRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.User")).
        Return(&domain.User{
            ID:    "user-123",
            Email: req.Email,
            Name:  req.Name,
            Role:  req.Role,
        }, nil)

    mockPasswordRepo.On("Store", mock.Anything, "user-123", mock.AnythingOfType("string")).
        Return(nil)

    // Act
    user, err := svc.CreateUser(context.Background(), req)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, "user-123", user.ID)
    assert.Equal(t, req.Email, user.Email)

    mockUserRepo.AssertExpectations(t)
    mockPasswordRepo.AssertExpectations(t)
}

func TestUserService_CreateUser_DuplicateEmail(t *testing.T) {
    // Arrange
    mockUserRepo := new(MockUserRepository)
    mockPasswordRepo := new(MockPasswordRepository)

    svc := service.NewUserService(mockUserRepo, mockPasswordRepo)

    existingUser := &domain.User{
        ID:    "existing-user",
        Email: "test@example.com",
    }

    mockUserRepo.On("GetByEmail", mock.Anything, "test@example.com").
        Return(existingUser, nil)

    req := &domain.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "Test User",
        Password: "securepassword123",
        Role:     domain.RoleViewer,
    }

    // Act
    user, err := svc.CreateUser(context.Background(), req)

    // Assert
    assert.Nil(t, user)
    assert.ErrorIs(t, err, domain.ErrUserAlreadyExists)
}
```

## Best Practices Summary

Here are the key takeaways for structuring Go projects:

1. **Use cmd/ for entry points**: Each executable gets its own subdirectory with a main.go file.

2. **Protect internal code**: Put private packages in internal/ to prevent external imports.

3. **Export reusable code**: Place truly reusable utilities in pkg/ for external consumption.

4. **Define interfaces where used**: Define interfaces in the consuming package, not the implementing one.

5. **Use constructor injection**: Pass dependencies through constructors for explicit, testable code.

6. **Separate layers clearly**: Keep handlers, services, and repositories in distinct packages.

7. **Avoid circular dependencies**: Use interfaces and shared type packages to break cycles.

8. **Keep packages focused**: Each package should have a single, clear responsibility.

9. **Use meaningful names**: Package names should be short, lowercase, and descriptive.

10. **Test each layer independently**: Mock dependencies to test components in isolation.

## Conclusion

A well-structured Go project is the foundation of maintainable software. By following the standard layout conventions, organizing packages by responsibility, and using dependency injection, you create codebases that are easy to understand, test, and extend.

The patterns shown in this guide have been battle-tested in production systems and represent the collective wisdom of the Go community. Start with this structure for your next project, and adapt it as your application grows.

Remember that project structure is not a one-time decision. As your application evolves, regularly review and refactor your organization to keep it clean and maintainable. The investment in good structure pays dividends in reduced bugs, faster development, and happier developers.

## Additional Resources

- [Standard Go Project Layout](https://github.com/golang-standards/project-layout)
- [Effective Go](https://go.dev/doc/effective_go)
- [Google Wire](https://github.com/google/wire)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
