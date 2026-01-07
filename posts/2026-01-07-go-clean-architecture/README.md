# How to Implement Clean Architecture in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Clean Architecture, Hexagonal Architecture, Design Patterns, Testing

Description: Implement clean architecture in Go using ports and adapters pattern for testable, maintainable services with clear separation of concerns.

---

Clean Architecture, also known as Hexagonal Architecture or Ports and Adapters, is a software design philosophy that emphasizes separation of concerns and dependency inversion. In Go, this architectural pattern helps create applications that are testable, maintainable, and independent of external frameworks and databases.

This guide will walk you through implementing Clean Architecture in Go, covering everything from domain entities to HTTP and gRPC adapters, with a focus on creating a real-world user management service.

## Understanding Clean Architecture Layers

Clean Architecture organizes code into concentric layers, where dependencies point inward toward the domain. The layers are:

1. **Domain Layer (Entities)**: Core business objects and rules
2. **Use Case Layer (Application)**: Application-specific business logic
3. **Interface Layer (Ports)**: Contracts for external communication
4. **Infrastructure Layer (Adapters)**: External implementations (databases, APIs, etc.)

The key principle is that inner layers know nothing about outer layers, making the core business logic completely independent of external concerns.

## Project Structure

Let's start by defining a clean project structure that reflects our architectural layers.

```
userservice/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── user.go
│   │   └── repository/
│   │       └── user_repository.go
│   ├── usecase/
│   │   └── user_usecase.go
│   ├── adapter/
│   │   ├── repository/
│   │   │   ├── postgres/
│   │   │   │   └── user_repository.go
│   │   │   └── memory/
│   │   │       └── user_repository.go
│   │   └── handler/
│   │       ├── http/
│   │       │   └── user_handler.go
│   │       └── grpc/
│   │           └── user_handler.go
│   └── port/
│       ├── input/
│       │   └── user_service.go
│       └── output/
│           └── user_repository.go
├── pkg/
│   └── errors/
│       └── errors.go
└── go.mod
```

## Domain Layer: Entities

The domain layer contains the core business entities. These are pure Go structs with business logic methods, completely independent of any external framework.

This entity represents a user in our system with validation logic encapsulated within the domain:

```go
// internal/domain/entity/user.go
package entity

import (
    "errors"
    "regexp"
    "time"

    "github.com/google/uuid"
)

// User represents the core domain entity for a user in the system.
// It contains all business rules and validations related to users.
type User struct {
    ID        uuid.UUID
    Email     string
    Name      string
    Password  string
    IsActive  bool
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Domain-specific errors that represent business rule violations
var (
    ErrInvalidEmail    = errors.New("invalid email format")
    ErrEmptyName       = errors.New("name cannot be empty")
    ErrPasswordTooWeak = errors.New("password must be at least 8 characters")
    ErrUserNotActive   = errors.New("user account is not active")
)

// NewUser creates a new User entity with proper initialization and validation.
// This is the factory function that ensures all users are created in a valid state.
func NewUser(email, name, password string) (*User, error) {
    user := &User{
        ID:        uuid.New(),
        Email:     email,
        Name:      name,
        Password:  password,
        IsActive:  true,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }

    if err := user.Validate(); err != nil {
        return nil, err
    }

    return user, nil
}

// Validate checks all business rules for the user entity.
// This method encapsulates domain validation logic within the entity itself.
func (u *User) Validate() error {
    if !isValidEmail(u.Email) {
        return ErrInvalidEmail
    }

    if u.Name == "" {
        return ErrEmptyName
    }

    if len(u.Password) < 8 {
        return ErrPasswordTooWeak
    }

    return nil
}

// Deactivate marks the user as inactive. This is a domain behavior
// that encapsulates the business rule for user deactivation.
func (u *User) Deactivate() {
    u.IsActive = false
    u.UpdatedAt = time.Now()
}

// Activate marks the user as active again.
func (u *User) Activate() {
    u.IsActive = true
    u.UpdatedAt = time.Now()
}

// CanPerformAction checks if the user is allowed to perform actions.
// This encapsulates the business rule that only active users can act.
func (u *User) CanPerformAction() error {
    if !u.IsActive {
        return ErrUserNotActive
    }
    return nil
}

// isValidEmail validates email format using a simple regex pattern
func isValidEmail(email string) bool {
    pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
    regex := regexp.MustCompile(pattern)
    return regex.MatchString(email)
}
```

## Ports: Defining Interfaces

Ports are interfaces that define the contracts for communication. There are two types:
- **Input Ports**: Define what the application offers to the outside world
- **Output Ports**: Define what the application needs from external systems

### Input Port (Service Interface)

This interface defines what operations our user service exposes to the outside world:

```go
// internal/port/input/user_service.go
package input

import (
    "context"

    "userservice/internal/domain/entity"

    "github.com/google/uuid"
)

// CreateUserRequest contains the data needed to create a new user.
// Using DTOs (Data Transfer Objects) keeps the domain entity clean.
type CreateUserRequest struct {
    Email    string
    Name     string
    Password string
}

// UpdateUserRequest contains the data for updating an existing user.
type UpdateUserRequest struct {
    ID    uuid.UUID
    Email string
    Name  string
}

// UserService defines the input port for user-related operations.
// This interface represents what the application offers to external actors.
type UserService interface {
    // CreateUser creates a new user in the system
    CreateUser(ctx context.Context, req CreateUserRequest) (*entity.User, error)

    // GetUserByID retrieves a user by their unique identifier
    GetUserByID(ctx context.Context, id uuid.UUID) (*entity.User, error)

    // GetUserByEmail retrieves a user by their email address
    GetUserByEmail(ctx context.Context, email string) (*entity.User, error)

    // UpdateUser updates an existing user's information
    UpdateUser(ctx context.Context, req UpdateUserRequest) (*entity.User, error)

    // DeleteUser removes a user from the system
    DeleteUser(ctx context.Context, id uuid.UUID) error

    // ListUsers retrieves all users with pagination
    ListUsers(ctx context.Context, limit, offset int) ([]*entity.User, error)

    // DeactivateUser marks a user as inactive
    DeactivateUser(ctx context.Context, id uuid.UUID) error
}
```

### Output Port (Repository Interface)

This interface defines what our application needs from the persistence layer:

```go
// internal/port/output/user_repository.go
package output

import (
    "context"

    "userservice/internal/domain/entity"

    "github.com/google/uuid"
)

// UserRepository defines the output port for user persistence operations.
// This interface represents what the application needs from external systems.
// The actual implementation (PostgreSQL, MongoDB, in-memory) is irrelevant here.
type UserRepository interface {
    // Save persists a new user to the storage
    Save(ctx context.Context, user *entity.User) error

    // FindByID retrieves a user by their unique identifier
    FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error)

    // FindByEmail retrieves a user by their email address
    FindByEmail(ctx context.Context, email string) (*entity.User, error)

    // Update modifies an existing user in the storage
    Update(ctx context.Context, user *entity.User) error

    // Delete removes a user from the storage
    Delete(ctx context.Context, id uuid.UUID) error

    // FindAll retrieves all users with pagination support
    FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error)

    // ExistsByEmail checks if a user with the given email already exists
    ExistsByEmail(ctx context.Context, email string) (bool, error)
}
```

## Use Case Layer: Application Logic

The use case layer contains application-specific business logic. It orchestrates the flow of data between entities and coordinates the application's behavior.

This implementation of the UserService interface contains all application business logic:

```go
// internal/usecase/user_usecase.go
package usecase

import (
    "context"
    "errors"
    "time"

    "userservice/internal/domain/entity"
    "userservice/internal/port/input"
    "userservice/internal/port/output"

    "github.com/google/uuid"
    "golang.org/x/crypto/bcrypt"
)

// Application-level errors distinct from domain errors
var (
    ErrUserNotFound      = errors.New("user not found")
    ErrUserAlreadyExists = errors.New("user with this email already exists")
    ErrInternalError     = errors.New("internal server error")
)

// UserUseCase implements the input.UserService interface.
// It contains application-specific business logic and coordinates
// between the domain layer and external adapters.
type UserUseCase struct {
    userRepo output.UserRepository
    // Additional dependencies can be injected here
    // passwordHasher PasswordHasher
    // eventPublisher EventPublisher
}

// NewUserUseCase creates a new UserUseCase with the required dependencies.
// Dependencies are injected through the constructor, enabling easy testing.
func NewUserUseCase(userRepo output.UserRepository) *UserUseCase {
    return &UserUseCase{
        userRepo: userRepo,
    }
}

// CreateUser handles the user creation use case.
// It validates input, checks for duplicates, hashes password, and persists the user.
func (uc *UserUseCase) CreateUser(ctx context.Context, req input.CreateUserRequest) (*entity.User, error) {
    // Check if user already exists
    exists, err := uc.userRepo.ExistsByEmail(ctx, req.Email)
    if err != nil {
        return nil, ErrInternalError
    }
    if exists {
        return nil, ErrUserAlreadyExists
    }

    // Hash the password before creating the entity
    hashedPassword, err := hashPassword(req.Password)
    if err != nil {
        return nil, ErrInternalError
    }

    // Create the domain entity with validation
    user, err := entity.NewUser(req.Email, req.Name, hashedPassword)
    if err != nil {
        return nil, err
    }

    // Persist the user
    if err := uc.userRepo.Save(ctx, user); err != nil {
        return nil, ErrInternalError
    }

    return user, nil
}

// GetUserByID retrieves a user by their ID.
func (uc *UserUseCase) GetUserByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
    user, err := uc.userRepo.FindByID(ctx, id)
    if err != nil {
        return nil, ErrInternalError
    }
    if user == nil {
        return nil, ErrUserNotFound
    }

    return user, nil
}

// GetUserByEmail retrieves a user by their email address.
func (uc *UserUseCase) GetUserByEmail(ctx context.Context, email string) (*entity.User, error) {
    user, err := uc.userRepo.FindByEmail(ctx, email)
    if err != nil {
        return nil, ErrInternalError
    }
    if user == nil {
        return nil, ErrUserNotFound
    }

    return user, nil
}

// UpdateUser handles the user update use case.
// It retrieves the existing user, applies updates, and persists changes.
func (uc *UserUseCase) UpdateUser(ctx context.Context, req input.UpdateUserRequest) (*entity.User, error) {
    // Retrieve existing user
    user, err := uc.userRepo.FindByID(ctx, req.ID)
    if err != nil {
        return nil, ErrInternalError
    }
    if user == nil {
        return nil, ErrUserNotFound
    }

    // Check if new email is already taken by another user
    if req.Email != user.Email {
        existingUser, err := uc.userRepo.FindByEmail(ctx, req.Email)
        if err != nil {
            return nil, ErrInternalError
        }
        if existingUser != nil && existingUser.ID != user.ID {
            return nil, ErrUserAlreadyExists
        }
    }

    // Apply updates
    user.Email = req.Email
    user.Name = req.Name
    user.UpdatedAt = time.Now()

    // Validate the updated entity
    if err := user.Validate(); err != nil {
        return nil, err
    }

    // Persist changes
    if err := uc.userRepo.Update(ctx, user); err != nil {
        return nil, ErrInternalError
    }

    return user, nil
}

// DeleteUser removes a user from the system.
func (uc *UserUseCase) DeleteUser(ctx context.Context, id uuid.UUID) error {
    // Verify user exists before deletion
    user, err := uc.userRepo.FindByID(ctx, id)
    if err != nil {
        return ErrInternalError
    }
    if user == nil {
        return ErrUserNotFound
    }

    if err := uc.userRepo.Delete(ctx, id); err != nil {
        return ErrInternalError
    }

    return nil
}

// ListUsers retrieves all users with pagination.
func (uc *UserUseCase) ListUsers(ctx context.Context, limit, offset int) ([]*entity.User, error) {
    // Apply default pagination limits
    if limit <= 0 {
        limit = 10
    }
    if limit > 100 {
        limit = 100
    }
    if offset < 0 {
        offset = 0
    }

    users, err := uc.userRepo.FindAll(ctx, limit, offset)
    if err != nil {
        return nil, ErrInternalError
    }

    return users, nil
}

// DeactivateUser marks a user as inactive.
func (uc *UserUseCase) DeactivateUser(ctx context.Context, id uuid.UUID) error {
    user, err := uc.userRepo.FindByID(ctx, id)
    if err != nil {
        return ErrInternalError
    }
    if user == nil {
        return ErrUserNotFound
    }

    // Use domain method to deactivate
    user.Deactivate()

    if err := uc.userRepo.Update(ctx, user); err != nil {
        return ErrInternalError
    }

    return nil
}

// hashPassword creates a bcrypt hash of the password
func hashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}
```

## Repository Adapter: PostgreSQL Implementation

Adapters implement the port interfaces. Here's a PostgreSQL implementation of the UserRepository:

```go
// internal/adapter/repository/postgres/user_repository.go
package postgres

import (
    "context"
    "database/sql"
    "time"

    "userservice/internal/domain/entity"
    "userservice/internal/port/output"

    "github.com/google/uuid"
    _ "github.com/lib/pq"
)

// UserRepository implements the output.UserRepository interface using PostgreSQL.
// This adapter translates domain operations into SQL queries.
type UserRepository struct {
    db *sql.DB
}

// NewUserRepository creates a new PostgreSQL user repository.
func NewUserRepository(db *sql.DB) output.UserRepository {
    return &UserRepository{db: db}
}

// Save persists a new user to the PostgreSQL database.
func (r *UserRepository) Save(ctx context.Context, user *entity.User) error {
    query := `
        INSERT INTO users (id, email, name, password, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    _, err := r.db.ExecContext(ctx, query,
        user.ID,
        user.Email,
        user.Name,
        user.Password,
        user.IsActive,
        user.CreatedAt,
        user.UpdatedAt,
    )

    return err
}

// FindByID retrieves a user by their UUID from the database.
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
    query := `
        SELECT id, email, name, password, is_active, created_at, updated_at
        FROM users
        WHERE id = $1
    `

    user := &entity.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Password,
        &user.IsActive,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// FindByEmail retrieves a user by their email address.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
    query := `
        SELECT id, email, name, password, is_active, created_at, updated_at
        FROM users
        WHERE email = $1
    `

    user := &entity.User{}
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.Password,
        &user.IsActive,
        &user.CreatedAt,
        &user.UpdatedAt,
    )

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// Update modifies an existing user in the database.
func (r *UserRepository) Update(ctx context.Context, user *entity.User) error {
    query := `
        UPDATE users
        SET email = $1, name = $2, password = $3, is_active = $4, updated_at = $5
        WHERE id = $6
    `

    _, err := r.db.ExecContext(ctx, query,
        user.Email,
        user.Name,
        user.Password,
        user.IsActive,
        user.UpdatedAt,
        user.ID,
    )

    return err
}

// Delete removes a user from the database.
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
    query := `DELETE FROM users WHERE id = $1`
    _, err := r.db.ExecContext(ctx, query, id)
    return err
}

// FindAll retrieves all users with pagination support.
func (r *UserRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error) {
    query := `
        SELECT id, email, name, password, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `

    rows, err := r.db.QueryContext(ctx, query, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*entity.User
    for rows.Next() {
        user := &entity.User{}
        err := rows.Scan(
            &user.ID,
            &user.Email,
            &user.Name,
            &user.Password,
            &user.IsActive,
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

// ExistsByEmail checks if a user with the given email already exists.
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

    var exists bool
    err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
    return exists, err
}
```

## In-Memory Repository for Testing

An in-memory implementation is invaluable for testing. It implements the same interface but stores data in memory:

```go
// internal/adapter/repository/memory/user_repository.go
package memory

import (
    "context"
    "sync"

    "userservice/internal/domain/entity"
    "userservice/internal/port/output"

    "github.com/google/uuid"
)

// UserRepository implements the output.UserRepository interface using in-memory storage.
// This adapter is useful for testing and development without database dependencies.
type UserRepository struct {
    mu    sync.RWMutex
    users map[uuid.UUID]*entity.User
}

// NewUserRepository creates a new in-memory user repository.
func NewUserRepository() output.UserRepository {
    return &UserRepository{
        users: make(map[uuid.UUID]*entity.User),
    }
}

// Save stores a new user in memory.
func (r *UserRepository) Save(ctx context.Context, user *entity.User) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    // Create a copy to avoid external modifications
    userCopy := *user
    r.users[user.ID] = &userCopy
    return nil
}

// FindByID retrieves a user by their UUID from memory.
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    user, exists := r.users[id]
    if !exists {
        return nil, nil
    }

    // Return a copy to prevent external modifications
    userCopy := *user
    return &userCopy, nil
}

// FindByEmail retrieves a user by their email address.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    for _, user := range r.users {
        if user.Email == email {
            userCopy := *user
            return &userCopy, nil
        }
    }
    return nil, nil
}

// Update modifies an existing user in memory.
func (r *UserRepository) Update(ctx context.Context, user *entity.User) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    userCopy := *user
    r.users[user.ID] = &userCopy
    return nil
}

// Delete removes a user from memory.
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    delete(r.users, id)
    return nil
}

// FindAll retrieves all users with pagination support.
func (r *UserRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    var users []*entity.User
    for _, user := range r.users {
        userCopy := *user
        users = append(users, &userCopy)
    }

    // Apply pagination
    start := offset
    if start > len(users) {
        return []*entity.User{}, nil
    }

    end := start + limit
    if end > len(users) {
        end = len(users)
    }

    return users[start:end], nil
}

// ExistsByEmail checks if a user with the given email already exists.
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    for _, user := range r.users {
        if user.Email == email {
            return true, nil
        }
    }
    return false, nil
}
```

## HTTP Adapter

The HTTP adapter translates HTTP requests into use case calls and formats responses:

```go
// internal/adapter/handler/http/user_handler.go
package http

import (
    "encoding/json"
    "net/http"

    "userservice/internal/domain/entity"
    "userservice/internal/port/input"
    "userservice/internal/usecase"

    "github.com/google/uuid"
    "github.com/gorilla/mux"
)

// UserHandler handles HTTP requests for user operations.
// It adapts HTTP protocol to the application's input port.
type UserHandler struct {
    userService input.UserService
}

// NewUserHandler creates a new HTTP user handler.
func NewUserHandler(userService input.UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

// RegisterRoutes registers all user-related HTTP routes.
func (h *UserHandler) RegisterRoutes(router *mux.Router) {
    router.HandleFunc("/users", h.CreateUser).Methods("POST")
    router.HandleFunc("/users", h.ListUsers).Methods("GET")
    router.HandleFunc("/users/{id}", h.GetUser).Methods("GET")
    router.HandleFunc("/users/{id}", h.UpdateUser).Methods("PUT")
    router.HandleFunc("/users/{id}", h.DeleteUser).Methods("DELETE")
    router.HandleFunc("/users/{id}/deactivate", h.DeactivateUser).Methods("POST")
}

// CreateUserRequest is the HTTP request body for creating a user.
type CreateUserRequest struct {
    Email    string `json:"email"`
    Name     string `json:"name"`
    Password string `json:"password"`
}

// UserResponse is the HTTP response body for user data.
type UserResponse struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Name      string `json:"name"`
    IsActive  bool   `json:"is_active"`
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
}

// ErrorResponse is the HTTP response body for errors.
type ErrorResponse struct {
    Error   string `json:"error"`
    Message string `json:"message"`
}

// CreateUser handles POST /users requests.
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
        return
    }

    user, err := h.userService.CreateUser(r.Context(), input.CreateUserRequest{
        Email:    req.Email,
        Name:     req.Name,
        Password: req.Password,
    })

    if err != nil {
        handleUseCaseError(w, err)
        return
    }

    respondWithJSON(w, http.StatusCreated, toUserResponse(user))
}

// GetUser handles GET /users/{id} requests.
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := uuid.Parse(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_id", "Invalid user ID format")
        return
    }

    user, err := h.userService.GetUserByID(r.Context(), id)
    if err != nil {
        handleUseCaseError(w, err)
        return
    }

    respondWithJSON(w, http.StatusOK, toUserResponse(user))
}

// ListUsers handles GET /users requests with pagination.
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    // Parse query parameters for pagination
    limit := 10
    offset := 0

    users, err := h.userService.ListUsers(r.Context(), limit, offset)
    if err != nil {
        handleUseCaseError(w, err)
        return
    }

    var response []UserResponse
    for _, user := range users {
        response = append(response, toUserResponse(user))
    }

    respondWithJSON(w, http.StatusOK, response)
}

// UpdateUser handles PUT /users/{id} requests.
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := uuid.Parse(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_id", "Invalid user ID format")
        return
    }

    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
        return
    }

    user, err := h.userService.UpdateUser(r.Context(), input.UpdateUserRequest{
        ID:    id,
        Email: req.Email,
        Name:  req.Name,
    })

    if err != nil {
        handleUseCaseError(w, err)
        return
    }

    respondWithJSON(w, http.StatusOK, toUserResponse(user))
}

// DeleteUser handles DELETE /users/{id} requests.
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := uuid.Parse(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_id", "Invalid user ID format")
        return
    }

    if err := h.userService.DeleteUser(r.Context(), id); err != nil {
        handleUseCaseError(w, err)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// DeactivateUser handles POST /users/{id}/deactivate requests.
func (h *UserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := uuid.Parse(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid_id", "Invalid user ID format")
        return
    }

    if err := h.userService.DeactivateUser(r.Context(), id); err != nil {
        handleUseCaseError(w, err)
        return
    }

    w.WriteHeader(http.StatusOK)
}

// Helper functions for HTTP responses

func toUserResponse(user *entity.User) UserResponse {
    return UserResponse{
        ID:        user.ID.String(),
        Email:     user.Email,
        Name:      user.Name,
        IsActive:  user.IsActive,
        CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
        UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
    }
}

func respondWithJSON(w http.ResponseWriter, status int, payload interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(payload)
}

func respondWithError(w http.ResponseWriter, status int, errorCode, message string) {
    respondWithJSON(w, status, ErrorResponse{
        Error:   errorCode,
        Message: message,
    })
}

func handleUseCaseError(w http.ResponseWriter, err error) {
    switch err {
    case usecase.ErrUserNotFound:
        respondWithError(w, http.StatusNotFound, "not_found", "User not found")
    case usecase.ErrUserAlreadyExists:
        respondWithError(w, http.StatusConflict, "already_exists", "User with this email already exists")
    case entity.ErrInvalidEmail:
        respondWithError(w, http.StatusBadRequest, "invalid_email", "Invalid email format")
    case entity.ErrEmptyName:
        respondWithError(w, http.StatusBadRequest, "empty_name", "Name cannot be empty")
    case entity.ErrPasswordTooWeak:
        respondWithError(w, http.StatusBadRequest, "weak_password", "Password must be at least 8 characters")
    default:
        respondWithError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
    }
}
```

## gRPC Adapter

For gRPC, first define the protobuf service, then implement the adapter:

```protobuf
// api/proto/user.proto
syntax = "proto3";

package user;

option go_package = "userservice/api/proto";

service UserService {
  rpc CreateUser(CreateUserRequest) returns (UserResponse);
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (Empty);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc DeactivateUser(DeactivateUserRequest) returns (Empty);
}

message CreateUserRequest {
  string email = 1;
  string name = 2;
  string password = 3;
}

message GetUserRequest {
  string id = 1;
}

message UpdateUserRequest {
  string id = 1;
  string email = 2;
  string name = 3;
}

message DeleteUserRequest {
  string id = 1;
}

message DeactivateUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 limit = 1;
  int32 offset = 2;
}

message UserResponse {
  string id = 1;
  string email = 2;
  string name = 3;
  bool is_active = 4;
  string created_at = 5;
  string updated_at = 6;
}

message ListUsersResponse {
  repeated UserResponse users = 1;
}

message Empty {}
```

The gRPC handler implementation adapts gRPC calls to the use case layer:

```go
// internal/adapter/handler/grpc/user_handler.go
package grpc

import (
    "context"

    "userservice/api/proto"
    "userservice/internal/domain/entity"
    "userservice/internal/port/input"
    "userservice/internal/usecase"

    "github.com/google/uuid"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// UserHandler implements the gRPC UserServiceServer interface.
// It adapts gRPC protocol to the application's input port.
type UserHandler struct {
    proto.UnimplementedUserServiceServer
    userService input.UserService
}

// NewUserHandler creates a new gRPC user handler.
func NewUserHandler(userService input.UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

// CreateUser handles gRPC CreateUser requests.
func (h *UserHandler) CreateUser(ctx context.Context, req *proto.CreateUserRequest) (*proto.UserResponse, error) {
    user, err := h.userService.CreateUser(ctx, input.CreateUserRequest{
        Email:    req.Email,
        Name:     req.Name,
        Password: req.Password,
    })

    if err != nil {
        return nil, mapError(err)
    }

    return toProtoUser(user), nil
}

// GetUser handles gRPC GetUser requests.
func (h *UserHandler) GetUser(ctx context.Context, req *proto.GetUserRequest) (*proto.UserResponse, error) {
    id, err := uuid.Parse(req.Id)
    if err != nil {
        return nil, status.Error(codes.InvalidArgument, "invalid user ID format")
    }

    user, err := h.userService.GetUserByID(ctx, id)
    if err != nil {
        return nil, mapError(err)
    }

    return toProtoUser(user), nil
}

// UpdateUser handles gRPC UpdateUser requests.
func (h *UserHandler) UpdateUser(ctx context.Context, req *proto.UpdateUserRequest) (*proto.UserResponse, error) {
    id, err := uuid.Parse(req.Id)
    if err != nil {
        return nil, status.Error(codes.InvalidArgument, "invalid user ID format")
    }

    user, err := h.userService.UpdateUser(ctx, input.UpdateUserRequest{
        ID:    id,
        Email: req.Email,
        Name:  req.Name,
    })

    if err != nil {
        return nil, mapError(err)
    }

    return toProtoUser(user), nil
}

// DeleteUser handles gRPC DeleteUser requests.
func (h *UserHandler) DeleteUser(ctx context.Context, req *proto.DeleteUserRequest) (*proto.Empty, error) {
    id, err := uuid.Parse(req.Id)
    if err != nil {
        return nil, status.Error(codes.InvalidArgument, "invalid user ID format")
    }

    if err := h.userService.DeleteUser(ctx, id); err != nil {
        return nil, mapError(err)
    }

    return &proto.Empty{}, nil
}

// ListUsers handles gRPC ListUsers requests.
func (h *UserHandler) ListUsers(ctx context.Context, req *proto.ListUsersRequest) (*proto.ListUsersResponse, error) {
    users, err := h.userService.ListUsers(ctx, int(req.Limit), int(req.Offset))
    if err != nil {
        return nil, mapError(err)
    }

    var protoUsers []*proto.UserResponse
    for _, user := range users {
        protoUsers = append(protoUsers, toProtoUser(user))
    }

    return &proto.ListUsersResponse{Users: protoUsers}, nil
}

// DeactivateUser handles gRPC DeactivateUser requests.
func (h *UserHandler) DeactivateUser(ctx context.Context, req *proto.DeactivateUserRequest) (*proto.Empty, error) {
    id, err := uuid.Parse(req.Id)
    if err != nil {
        return nil, status.Error(codes.InvalidArgument, "invalid user ID format")
    }

    if err := h.userService.DeactivateUser(ctx, id); err != nil {
        return nil, mapError(err)
    }

    return &proto.Empty{}, nil
}

// Helper function to convert domain entity to protobuf message
func toProtoUser(user *entity.User) *proto.UserResponse {
    return &proto.UserResponse{
        Id:        user.ID.String(),
        Email:     user.Email,
        Name:      user.Name,
        IsActive:  user.IsActive,
        CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
        UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
    }
}

// mapError converts use case errors to gRPC status errors
func mapError(err error) error {
    switch err {
    case usecase.ErrUserNotFound:
        return status.Error(codes.NotFound, "user not found")
    case usecase.ErrUserAlreadyExists:
        return status.Error(codes.AlreadyExists, "user with this email already exists")
    case entity.ErrInvalidEmail:
        return status.Error(codes.InvalidArgument, "invalid email format")
    case entity.ErrEmptyName:
        return status.Error(codes.InvalidArgument, "name cannot be empty")
    case entity.ErrPasswordTooWeak:
        return status.Error(codes.InvalidArgument, "password must be at least 8 characters")
    default:
        return status.Error(codes.Internal, "internal server error")
    }
}
```

## Testing Each Layer

Clean Architecture shines when it comes to testing. Each layer can be tested independently with appropriate mocks.

### Testing Domain Entities

Domain entities are pure Go structs with no dependencies, making them trivial to test:

```go
// internal/domain/entity/user_test.go
package entity

import (
    "testing"
)

func TestNewUser_ValidInput(t *testing.T) {
    user, err := NewUser("test@example.com", "John Doe", "password123")

    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }

    if user.Email != "test@example.com" {
        t.Errorf("expected email 'test@example.com', got '%s'", user.Email)
    }

    if user.Name != "John Doe" {
        t.Errorf("expected name 'John Doe', got '%s'", user.Name)
    }

    if !user.IsActive {
        t.Error("expected user to be active")
    }
}

func TestNewUser_InvalidEmail(t *testing.T) {
    _, err := NewUser("invalid-email", "John Doe", "password123")

    if err != ErrInvalidEmail {
        t.Errorf("expected ErrInvalidEmail, got %v", err)
    }
}

func TestNewUser_EmptyName(t *testing.T) {
    _, err := NewUser("test@example.com", "", "password123")

    if err != ErrEmptyName {
        t.Errorf("expected ErrEmptyName, got %v", err)
    }
}

func TestNewUser_WeakPassword(t *testing.T) {
    _, err := NewUser("test@example.com", "John Doe", "short")

    if err != ErrPasswordTooWeak {
        t.Errorf("expected ErrPasswordTooWeak, got %v", err)
    }
}

func TestUser_Deactivate(t *testing.T) {
    user, _ := NewUser("test@example.com", "John Doe", "password123")
    user.Deactivate()

    if user.IsActive {
        t.Error("expected user to be inactive after deactivation")
    }
}

func TestUser_CanPerformAction(t *testing.T) {
    user, _ := NewUser("test@example.com", "John Doe", "password123")

    if err := user.CanPerformAction(); err != nil {
        t.Errorf("expected active user to be able to perform action, got %v", err)
    }

    user.Deactivate()

    if err := user.CanPerformAction(); err != ErrUserNotActive {
        t.Errorf("expected ErrUserNotActive, got %v", err)
    }
}
```

### Testing Use Cases with Mocks

Use cases can be tested by mocking the repository interface:

```go
// internal/usecase/user_usecase_test.go
package usecase

import (
    "context"
    "testing"

    "userservice/internal/domain/entity"
    "userservice/internal/port/input"

    "github.com/google/uuid"
)

// MockUserRepository is a mock implementation of output.UserRepository for testing.
type MockUserRepository struct {
    users       map[uuid.UUID]*entity.User
    saveErr     error
    findErr     error
}

func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{
        users: make(map[uuid.UUID]*entity.User),
    }
}

func (m *MockUserRepository) Save(ctx context.Context, user *entity.User) error {
    if m.saveErr != nil {
        return m.saveErr
    }
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
    if m.findErr != nil {
        return nil, m.findErr
    }
    return m.users[id], nil
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
    for _, user := range m.users {
        if user.Email == email {
            return user, nil
        }
    }
    return nil, nil
}

func (m *MockUserRepository) Update(ctx context.Context, user *entity.User) error {
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
    delete(m.users, id)
    return nil
}

func (m *MockUserRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error) {
    var users []*entity.User
    for _, user := range m.users {
        users = append(users, user)
    }
    return users, nil
}

func (m *MockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    for _, user := range m.users {
        if user.Email == email {
            return true, nil
        }
    }
    return false, nil
}

func TestUserUseCase_CreateUser_Success(t *testing.T) {
    repo := NewMockUserRepository()
    useCase := NewUserUseCase(repo)

    user, err := useCase.CreateUser(context.Background(), input.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "John Doe",
        Password: "password123",
    })

    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }

    if user.Email != "test@example.com" {
        t.Errorf("expected email 'test@example.com', got '%s'", user.Email)
    }
}

func TestUserUseCase_CreateUser_DuplicateEmail(t *testing.T) {
    repo := NewMockUserRepository()
    useCase := NewUserUseCase(repo)

    // Create first user
    _, _ = useCase.CreateUser(context.Background(), input.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "John Doe",
        Password: "password123",
    })

    // Attempt to create user with same email
    _, err := useCase.CreateUser(context.Background(), input.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "Jane Doe",
        Password: "password456",
    })

    if err != ErrUserAlreadyExists {
        t.Errorf("expected ErrUserAlreadyExists, got %v", err)
    }
}

func TestUserUseCase_GetUserByID_NotFound(t *testing.T) {
    repo := NewMockUserRepository()
    useCase := NewUserUseCase(repo)

    _, err := useCase.GetUserByID(context.Background(), uuid.New())

    if err != ErrUserNotFound {
        t.Errorf("expected ErrUserNotFound, got %v", err)
    }
}

func TestUserUseCase_DeactivateUser(t *testing.T) {
    repo := NewMockUserRepository()
    useCase := NewUserUseCase(repo)

    // Create a user first
    user, _ := useCase.CreateUser(context.Background(), input.CreateUserRequest{
        Email:    "test@example.com",
        Name:     "John Doe",
        Password: "password123",
    })

    // Deactivate the user
    err := useCase.DeactivateUser(context.Background(), user.ID)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }

    // Verify user is deactivated
    deactivatedUser, _ := useCase.GetUserByID(context.Background(), user.ID)
    if deactivatedUser.IsActive {
        t.Error("expected user to be deactivated")
    }
}
```

## Application Bootstrap

The main function wires everything together using dependency injection:

```go
// cmd/api/main.go
package main

import (
    "database/sql"
    "log"
    "net"
    "net/http"

    "userservice/internal/adapter/handler/grpc"
    httpHandler "userservice/internal/adapter/handler/http"
    "userservice/internal/adapter/repository/postgres"
    "userservice/internal/usecase"

    "github.com/gorilla/mux"
    pb "userservice/api/proto"
    grpcLib "google.golang.org/grpc"
)

func main() {
    // Initialize database connection
    db, err := sql.Open("postgres", "postgres://user:password@localhost/userdb?sslmode=disable")
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    // Initialize repository (adapter for output port)
    userRepo := postgres.NewUserRepository(db)

    // Initialize use case (implements input port)
    userUseCase := usecase.NewUserUseCase(userRepo)

    // Initialize HTTP handler (adapter for input port)
    httpUserHandler := httpHandler.NewUserHandler(userUseCase)

    // Set up HTTP router
    router := mux.NewRouter()
    httpUserHandler.RegisterRoutes(router)

    // Start HTTP server in a goroutine
    go func() {
        log.Println("Starting HTTP server on :8080")
        if err := http.ListenAndServe(":8080", router); err != nil {
            log.Fatal("HTTP server error:", err)
        }
    }()

    // Initialize gRPC handler (adapter for input port)
    grpcUserHandler := grpc.NewUserHandler(userUseCase)

    // Set up gRPC server
    grpcServer := grpcLib.NewServer()
    pb.RegisterUserServiceServer(grpcServer, grpcUserHandler)

    // Start gRPC server
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal("Failed to listen:", err)
    }

    log.Println("Starting gRPC server on :50051")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatal("gRPC server error:", err)
    }
}
```

## Benefits of Clean Architecture

Implementing Clean Architecture in Go provides several advantages:

1. **Testability**: Each layer can be tested in isolation using mocks and stubs.

2. **Maintainability**: Changes to external systems (databases, APIs) only affect adapters, not core business logic.

3. **Flexibility**: You can easily swap implementations (e.g., PostgreSQL to MongoDB) without touching business logic.

4. **Domain Focus**: Business rules are centralized in the domain layer, making them easy to understand and modify.

5. **Framework Independence**: The core application does not depend on any specific framework.

## Common Pitfalls to Avoid

1. **Over-engineering**: Do not create abstractions before you need them. Start simple and refactor when complexity grows.

2. **Leaking Domain Logic**: Keep validation and business rules in the domain layer, not in adapters.

3. **Circular Dependencies**: Ensure dependencies always point inward toward the domain.

4. **Ignoring Context**: Always propagate context through layers for proper cancellation and timeout handling.

5. **Mixing Concerns**: Keep HTTP/gRPC concerns in adapters, not in use cases.

## Conclusion

Clean Architecture provides a robust foundation for building maintainable Go applications. By separating concerns into distinct layers and depending on abstractions rather than implementations, you create systems that are easier to test, modify, and scale.

The ports and adapters pattern ensures that your core business logic remains isolated from external concerns, allowing you to focus on what matters most: solving business problems. Start with simple implementations and evolve your architecture as your application grows in complexity.

Remember that architecture should serve your goals, not the other way around. Apply these patterns where they add value, and keep things simple where they do not.
