# How to Use Go Interfaces for Dependency Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Interfaces, Dependency Injection, Testing, Architecture

Description: Learn how to use Go interfaces for clean dependency injection. This guide covers interface design, constructor injection, and testable architecture patterns.

---

Dependency injection in Go does not require a framework. Go interfaces provide implicit satisfaction, meaning any type that implements an interface's methods automatically satisfies that interface. This design philosophy makes dependency injection natural and straightforward.

---

## Why Dependency Injection Matters

```go
// WITHOUT dependency injection: Hard to test, tightly coupled
type UserService struct {
    db *sql.DB  // Concrete type, can't mock
}

func (s *UserService) GetUser(id int) (*User, error) {
    row := s.db.QueryRow("SELECT * FROM users WHERE id = $1", id)
    // Requires real database connection to test
}

// WITH dependency injection: Testable, loosely coupled
type UserService struct {
    repo UserRepository  // Interface, can be mocked
}

func (s *UserService) GetUser(id int) (*User, error) {
    return s.repo.FindByID(id)
    // Can inject mock repository for testing
}
```

---

## Interface Design Principles

### Keep Interfaces Small

Go's philosophy favors small, focused interfaces. The standard library demonstrates this with interfaces like `io.Reader` (one method) and `io.Writer` (one method).

```go
package main

// BAD: Large interface, hard to implement and mock
type UserManager interface {
    Create(user *User) error
    Update(user *User) error
    Delete(id int) error
    GetByID(id int) (*User, error)
    GetByEmail(email string) (*User, error)
    List(limit, offset int) ([]*User, error)
    Authenticate(email, password string) (*User, error)
}

// GOOD: Focused interfaces, easy to implement and mock
type UserReader interface {
    GetByID(id int) (*User, error)
    GetByEmail(email string) (*User, error)
}

type UserWriter interface {
    Create(user *User) error
    Update(user *User) error
    Delete(id int) error
}

// Compose interfaces when needed
type UserRepository interface {
    UserReader
    UserWriter
}
```

### Define Interfaces at the Consumer Side

In Go, interfaces should be defined where they are used, not where they are implemented.

```go
// notification/service.go - Consumer defines the interface it needs
package notification

type Mailer interface {
    Send(ctx context.Context, to, subject, body string) error
}

type Service struct {
    mailer Mailer
}

func NewService(m Mailer) *Service {
    return &Service{mailer: m}
}

func (s *Service) NotifyUser(ctx context.Context, user *User, message string) error {
    return s.mailer.Send(ctx, user.Email, "Notification", message)
}
```

```go
// email/smtp.go - Implementation doesn't need to know about the interface
package email

type SMTPClient struct {
    host, port, username, password string
}

// This method satisfies notification.Mailer without importing that package
func (c *SMTPClient) Send(ctx context.Context, to, subject, body string) error {
    addr := c.host + ":" + c.port
    auth := smtp.PlainAuth("", c.username, c.password, c.host)
    msg := []byte("Subject: " + subject + "\r\n\r\n" + body)
    return smtp.SendMail(addr, auth, c.username, []string{to}, msg)
}
```

---

## Constructor Injection Pattern

Constructor injection is the most common pattern in Go. Dependencies are passed when creating a new instance.

```go
package main

import (
    "context"
    "errors"
)

type UserRepository interface {
    FindByID(ctx context.Context, id int) (*User, error)
    Save(ctx context.Context, user *User) error
}

type PasswordHasher interface {
    Hash(password string) (string, error)
    Compare(hash, password string) error
}

type EventPublisher interface {
    Publish(ctx context.Context, event Event) error
}

type UserService struct {
    repo      UserRepository
    hasher    PasswordHasher
    publisher EventPublisher
}

// Constructor function - dependencies are explicit
func NewUserService(
    repo UserRepository,
    hasher PasswordHasher,
    publisher EventPublisher,
) *UserService {
    return &UserService{
        repo:      repo,
        hasher:    hasher,
        publisher: publisher,
    }
}

func (s *UserService) CreateUser(ctx context.Context, email, password string) (*User, error) {
    hash, err := s.hasher.Hash(password)
    if err != nil {
        return nil, err
    }

    user := &User{Email: email, PasswordHash: hash}

    if err := s.repo.Save(ctx, user); err != nil {
        return nil, err
    }

    event := Event{Type: "user.created", Data: user}
    s.publisher.Publish(ctx, event)

    return user, nil
}
```

### Constructor with Validation

```go
func NewOrderService(
    repo OrderRepository,
    inventory InventoryChecker,
    payment PaymentProcessor,
) (*OrderService, error) {
    if repo == nil {
        return nil, errors.New("order repository is required")
    }
    if inventory == nil {
        return nil, errors.New("inventory checker is required")
    }
    if payment == nil {
        return nil, errors.New("payment processor is required")
    }

    return &OrderService{
        repo:      repo,
        inventory: inventory,
        payment:   payment,
    }, nil
}
```

### Functional Options Pattern

For services with many optional dependencies:

```go
type CacheService struct {
    store      CacheStore
    logger     Logger
    metrics    MetricsRecorder
    defaultTTL time.Duration
}

type CacheOption func(*CacheService)

func WithLogger(l Logger) CacheOption {
    return func(s *CacheService) {
        s.logger = l
    }
}

func WithMetrics(m MetricsRecorder) CacheOption {
    return func(s *CacheService) {
        s.metrics = m
    }
}

func WithDefaultTTL(ttl time.Duration) CacheOption {
    return func(s *CacheService) {
        s.defaultTTL = ttl
    }
}

func NewCacheService(store CacheStore, opts ...CacheOption) *CacheService {
    s := &CacheService{
        store:      store,
        logger:     &noopLogger{},
        defaultTTL: 5 * time.Minute,
    }

    for _, opt := range opts {
        opt(s)
    }

    return s
}

// Usage
cache := NewCacheService(
    store,
    WithLogger(logger),
    WithMetrics(metrics),
    WithDefaultTTL(10*time.Minute),
)
```

---

## Implementing Mocks for Testing

### Manual Mocks

```go
type MockUserRepository struct {
    users      map[int]*User
    saveErr    error
    findErr    error
    saveCalled bool
}

func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{users: make(map[int]*User)}
}

func (m *MockUserRepository) FindByID(ctx context.Context, id int) (*User, error) {
    if m.findErr != nil {
        return nil, m.findErr
    }
    user, exists := m.users[id]
    if !exists {
        return nil, errors.New("user not found")
    }
    return user, nil
}

func (m *MockUserRepository) Save(ctx context.Context, user *User) error {
    m.saveCalled = true
    if m.saveErr != nil {
        return m.saveErr
    }
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) SetSaveError(err error) {
    m.saveErr = err
}

func (m *MockUserRepository) AddUser(user *User) {
    m.users[user.ID] = user
}
```

### Test Using the Mock

```go
func TestUserService_GetUser(t *testing.T) {
    mockRepo := NewMockUserRepository()
    mockRepo.AddUser(&User{ID: 1, Email: "test@example.com"})

    service := NewUserService(mockRepo, nil, nil)

    user, err := service.GetUser(context.Background(), 1)

    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if user.Email != "test@example.com" {
        t.Errorf("expected email test@example.com, got %s", user.Email)
    }
}

func TestUserService_CreateUser_SaveError(t *testing.T) {
    mockRepo := NewMockUserRepository()
    mockRepo.SetSaveError(errors.New("database connection failed"))

    mockHasher := &MockPasswordHasher{}
    mockPublisher := &MockEventPublisher{}

    service := NewUserService(mockRepo, mockHasher, mockPublisher)

    _, err := service.CreateUser(context.Background(), "test@example.com", "password")

    if err == nil {
        t.Fatal("expected error, got nil")
    }
}
```

### Spy with Recorded Calls

```go
type SpyEventPublisher struct {
    mu    sync.Mutex
    calls []Event
    err   error
}

func (s *SpyEventPublisher) Publish(ctx context.Context, event Event) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.calls = append(s.calls, event)
    return s.err
}

func (s *SpyEventPublisher) CallCount() int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return len(s.calls)
}

func (s *SpyEventPublisher) GetCall(index int) Event {
    s.mu.Lock()
    defer s.mu.Unlock()
    return s.calls[index]
}

func TestUserService_CreateUser_PublishesEvent(t *testing.T) {
    mockRepo := NewMockUserRepository()
    mockHasher := &MockPasswordHasher{hash: "hashed_password"}
    spyPublisher := &SpyEventPublisher{}

    service := NewUserService(mockRepo, mockHasher, spyPublisher)

    user, _ := service.CreateUser(context.Background(), "test@example.com", "password")

    if spyPublisher.CallCount() != 1 {
        t.Fatalf("expected 1 publish call, got %d", spyPublisher.CallCount())
    }

    event := spyPublisher.GetCall(0)
    if event.Type != "user.created" {
        t.Errorf("expected event type user.created, got %s", event.Type)
    }
}
```

---

## Wire: Compile-Time Dependency Injection

Wire is Google's code generation tool for dependency injection.

### Installation

```bash
go install github.com/google/wire/cmd/wire@latest
```

### Basic Usage

```go
// providers.go
package main

func ProvideDatabase() (*sql.DB, error) {
    return sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

func ProvideUserRepository(db *sql.DB) UserRepository {
    return &PostgresUserRepository{db: db}
}

func ProvidePasswordHasher() PasswordHasher {
    return &BCryptHasher{cost: 10}
}

func ProvideUserService(
    repo UserRepository,
    hasher PasswordHasher,
) *UserService {
    return NewUserService(repo, hasher, nil)
}
```

```go
// wire.go
//go:build wireinject

package main

import "github.com/google/wire"

func InitializeUserService() (*UserService, error) {
    wire.Build(
        ProvideDatabase,
        ProvideUserRepository,
        ProvidePasswordHasher,
        ProvideUserService,
    )
    return nil, nil
}
```

Run `wire` to generate the initialization code:

```bash
wire ./...
```

### Provider Sets

Group related providers:

```go
var DatabaseSet = wire.NewSet(
    ProvideDatabase,
    ProvideUserRepository,
    ProvideOrderRepository,
)

var ServiceSet = wire.NewSet(
    ProvideUserService,
    ProvideOrderService,
)

var ApplicationSet = wire.NewSet(
    DatabaseSet,
    ServiceSet,
)
```

### Interface Bindings

Bind concrete types to interfaces:

```go
var RepositorySet = wire.NewSet(
    NewPostgresUserRepository,
    wire.Bind(new(UserRepository), new(*PostgresUserRepository)),
)
```

### Cleanup Functions

Handle resources that need cleanup:

```go
func ProvideDatabase() (*sql.DB, func(), error) {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        return nil, nil, err
    }

    cleanup := func() {
        db.Close()
    }

    return db, cleanup, nil
}

// Usage in main
func main() {
    app, cleanup, err := InitializeApplication()
    if err != nil {
        log.Fatal(err)
    }
    defer cleanup()

    app.Run()
}
```

---

## Layered Architecture Example

```go
// domain/user.go
package domain

type User struct {
    ID           int
    Email        string
    PasswordHash string
}

type UserRepository interface {
    FindByID(ctx context.Context, id int) (*User, error)
    Save(ctx context.Context, user *User) error
}
```

```go
// infrastructure/postgres/user_repository.go
package postgres

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id int) (*domain.User, error) {
    query := `SELECT id, email, password_hash FROM users WHERE id = $1`
    user := &domain.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(&user.ID, &user.Email, &user.PasswordHash)
    return user, err
}
```

```go
// application/user_service.go
package application

type UserService struct {
    repo   domain.UserRepository
    hasher PasswordHasher
}

func NewUserService(repo domain.UserRepository, hasher PasswordHasher) *UserService {
    return &UserService{repo: repo, hasher: hasher}
}

func (s *UserService) CreateUser(ctx context.Context, email, password string) (*domain.User, error) {
    hash, err := s.hasher.Hash(password)
    if err != nil {
        return nil, err
    }

    user := &domain.User{Email: email, PasswordHash: hash}
    if err := s.repo.Save(ctx, user); err != nil {
        return nil, err
    }

    return user, nil
}
```

```go
// main.go
package main

func main() {
    db, _ := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    defer db.Close()

    userRepo := postgres.NewUserRepository(db)
    passwordHasher := security.NewBCryptHasher(10)
    userService := application.NewUserService(userRepo, passwordHasher)
    userHandler := api.NewUserHandler(userService)

    mux := http.NewServeMux()
    mux.HandleFunc("POST /users", userHandler.CreateUser)
    mux.HandleFunc("GET /users/{id}", userHandler.GetUser)

    http.ListenAndServe(":8080", mux)
}
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Small interfaces** | Define interfaces with few methods, compose when needed |
| **Consumer-defined interfaces** | Define interfaces where they are used |
| **Constructor injection** | Pass dependencies through constructor functions |
| **Validate dependencies** | Check for nil dependencies in constructors |
| **Explicit dependencies** | Make dependencies visible in function signatures |
| **Avoid global state** | Pass dependencies explicitly |
| **Use Wire for complexity** | Use Wire when dependency graphs grow complex |

---

## Common Mistakes to Avoid

```go
// MISTAKE 1: Using package-level variables
var db *sql.DB  // Global state

func GetUser(id int) (*User, error) {
    return db.Query(...)  // Implicit dependency
}

// CORRECT: Inject the dependency
type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) GetUser(id int) (*User, error) {
    return r.db.Query(...)
}
```

```go
// MISTAKE 2: Accepting concrete types
func NewService(repo *PostgresRepository) *Service {
    // Can't mock
}

// CORRECT: Accept an interface
func NewService(repo UserRepository) *Service {
    // Can inject any implementation
}
```

```go
// MISTAKE 3: Creating dependencies inside functions
func NewService() *Service {
    db := connectToDatabase()  // Hard to test
    return &Service{db: db}
}

// CORRECT: Accept dependencies from outside
func NewService(db *sql.DB) *Service {
    return &Service{db: db}
}
```

---

Dependency injection through interfaces makes Go applications more testable, maintainable, and flexible. By following these patterns, you can build applications where components are loosely coupled and easily replaceable.

---

*Building observable Go applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, logging, and tracing for your services. Track dependencies across your architecture, set up alerts when services fail, and debug issues faster with distributed tracing.*
