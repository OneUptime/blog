# How to Implement Dependency Injection without Frameworks in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Dependency Injection, Architecture, Testing

Description: Learn how to implement clean dependency injection in Go using interfaces and constructor injection without relying on frameworks.

---

Dependency injection (DI) is a design pattern that promotes loose coupling between components. Unlike languages such as Java or C#, Go does not require heavyweight DI frameworks. The language's simplicity and interface system make manual dependency injection straightforward and effective.

## Why Dependency Injection Matters

DI provides several benefits that improve code quality:

1. **Testability**: Components can be tested in isolation by injecting mock dependencies
2. **Flexibility**: Implementations can be swapped without changing dependent code
3. **Maintainability**: Clear dependency graphs make code easier to understand and modify
4. **Single Responsibility**: Each component focuses on its own logic, not instantiation

## Interface-Based Design

Go's implicit interface implementation is perfect for DI. Define interfaces based on what consumers need, not what providers offer.

```go
// Define interfaces for dependencies
// The interface describes the behavior needed by the consumer
type UserRepository interface {
    GetByID(id string) (*User, error)
    Save(user *User) error
}

type EmailSender interface {
    Send(to, subject, body string) error
}

// User represents a user in the system
type User struct {
    ID    string
    Email string
    Name  string
}
```

Keep interfaces small and focused. Go's philosophy encourages interfaces with one or two methods when possible.

## Constructor Injection

Constructor injection is the primary pattern for DI in Go. Dependencies are passed as parameters to a constructor function that returns a configured struct.

```go
// UserService depends on repository and email sender
type UserService struct {
    repo   UserRepository
    mailer EmailSender
}

// NewUserService creates a UserService with injected dependencies
// This constructor makes dependencies explicit and required
func NewUserService(repo UserRepository, mailer EmailSender) *UserService {
    return &UserService{
        repo:   repo,
        mailer: mailer,
    }
}

// Register creates a new user and sends a welcome email
func (s *UserService) Register(name, email string) (*User, error) {
    user := &User{
        ID:    generateID(),
        Email: email,
        Name:  name,
    }

    // Use the injected repository
    if err := s.repo.Save(user); err != nil {
        return nil, fmt.Errorf("failed to save user: %w", err)
    }

    // Use the injected email sender
    if err := s.mailer.Send(email, "Welcome!", "Thanks for signing up"); err != nil {
        // Log the error but don't fail registration
        log.Printf("failed to send welcome email: %v", err)
    }

    return user, nil
}

func generateID() string {
    return fmt.Sprintf("user_%d", time.Now().UnixNano())
}
```

## Concrete Implementations

Create concrete types that implement your interfaces. These contain the actual business logic.

```go
// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
    db *sql.DB
}

// NewPostgresUserRepository creates a repository with a database connection
func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) GetByID(id string) (*User, error) {
    user := &User{}
    err := r.db.QueryRow(
        "SELECT id, email, name FROM users WHERE id = $1",
        id,
    ).Scan(&user.ID, &user.Email, &user.Name)

    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("user not found: %s", id)
    }
    return user, err
}

func (r *PostgresUserRepository) Save(user *User) error {
    _, err := r.db.Exec(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
        user.ID, user.Email, user.Name,
    )
    return err
}

// SMTPEmailSender implements EmailSender using SMTP
type SMTPEmailSender struct {
    host string
    port int
    from string
}

func NewSMTPEmailSender(host string, port int, from string) *SMTPEmailSender {
    return &SMTPEmailSender{host: host, port: port, from: from}
}

func (s *SMTPEmailSender) Send(to, subject, body string) error {
    addr := fmt.Sprintf("%s:%d", s.host, s.port)
    msg := []byte(fmt.Sprintf("Subject: %s\r\n\r\n%s", subject, body))
    return smtp.SendMail(addr, nil, s.from, []string{to}, msg)
}
```

## Wiring Dependencies Without a Framework

In your main function, wire everything together manually. This is often called the composition root.

```go
func main() {
    // Initialize database connection
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create concrete implementations
    userRepo := NewPostgresUserRepository(db)
    emailSender := NewSMTPEmailSender("smtp.example.com", 587, "noreply@example.com")

    // Inject dependencies into services
    userService := NewUserService(userRepo, emailSender)

    // Create HTTP handlers with the configured service
    handler := NewUserHandler(userService)

    // Start server
    http.Handle("/users", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

For larger applications, you might consider Google's Wire tool. Wire generates dependency injection code at compile time, eliminating reflection overhead while maintaining explicit dependencies.

## Testing with Mock Implementations

The real power of DI shines in testing. Create mock implementations to test components in isolation.

```go
// MockUserRepository for testing
type MockUserRepository struct {
    users map[string]*User
    err   error // Set this to simulate errors
}

func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{users: make(map[string]*User)}
}

func (m *MockUserRepository) GetByID(id string) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    user, ok := m.users[id]
    if !ok {
        return nil, fmt.Errorf("user not found")
    }
    return user, nil
}

func (m *MockUserRepository) Save(user *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[user.ID] = user
    return nil
}

// MockEmailSender tracks sent emails for verification
type MockEmailSender struct {
    SentEmails []SentEmail
    err        error
}

type SentEmail struct {
    To      string
    Subject string
    Body    string
}

func (m *MockEmailSender) Send(to, subject, body string) error {
    if m.err != nil {
        return m.err
    }
    m.SentEmails = append(m.SentEmails, SentEmail{to, subject, body})
    return nil
}

// Test the UserService with mocks
func TestUserService_Register(t *testing.T) {
    // Arrange: create mocks and inject them
    mockRepo := NewMockUserRepository()
    mockMailer := &MockEmailSender{}
    service := NewUserService(mockRepo, mockMailer)

    // Act: call the method under test
    user, err := service.Register("John Doe", "john@example.com")

    // Assert: verify the results
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    if user.Name != "John Doe" {
        t.Errorf("expected name 'John Doe', got '%s'", user.Name)
    }

    // Verify email was sent
    if len(mockMailer.SentEmails) != 1 {
        t.Fatalf("expected 1 email, got %d", len(mockMailer.SentEmails))
    }

    if mockMailer.SentEmails[0].To != "john@example.com" {
        t.Errorf("email sent to wrong address")
    }
}
```

## Conclusion

Go's interface system and constructor functions provide everything you need for clean dependency injection. The manual approach keeps dependencies explicit, avoids runtime reflection, and makes the codebase easier to navigate. Start simple with constructor injection, and only reach for tools like Wire when your application grows large enough to warrant code generation.
