# How to Write Unit Tests in Go with the Testing Package

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Testing, Unit Tests, TDD, Quality Assurance

Description: Learn how to write effective unit tests in Go using the built-in testing package. This guide covers test functions, table-driven tests, mocking, and best practices.

---

Go ships with a powerful built-in testing package that makes writing and running tests straightforward. Unlike other languages where you need external frameworks, Go's `testing` package provides everything you need for comprehensive unit tests. This guide covers the fundamentals and advanced techniques for testing Go code effectively.

## Why Go's Testing Package

| Feature | Benefit |
|---------|---------|
| **Built-in** | No external dependencies |
| **Fast** | Parallel test execution |
| **Simple API** | Easy to learn and use |
| **Benchmarking** | Performance testing included |
| **Coverage** | Built-in coverage reports |
| **Subtests** | Organized test hierarchies |

## Getting Started with Go Tests

Go test files follow a simple convention: they end with `_test.go` and contain functions that start with `Test`.

### Your First Test

Create a simple calculator module to test:

```go
// calculator/calculator.go
package calculator

import "errors"

// Add returns the sum of two integers
func Add(a, b int) int {
    return a + b
}

// Divide returns the quotient of two integers
// Returns an error if attempting to divide by zero
func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, ErrDivisionByZero
    }
    return a / b, nil
}

var ErrDivisionByZero = errors.New("division by zero")
```

Now create the corresponding test file:

```go
// calculator/calculator_test.go
package calculator

import "testing"

// TestAdd verifies the Add function works correctly
// Test function names must start with "Test" followed by a capitalized word
func TestAdd(t *testing.T) {
    // Arrange: set up test data
    a, b := 2, 3
    expected := 5

    // Act: call the function being tested
    result := Add(a, b)

    // Assert: verify the result matches expected output
    if result != expected {
        // t.Errorf reports a failure but continues test execution
        t.Errorf("Add(%d, %d) = %d; expected %d", a, b, result, expected)
    }
}

// TestDivide verifies both successful division and error handling
func TestDivide(t *testing.T) {
    // Test successful division
    result, err := Divide(10, 2)
    if err != nil {
        t.Errorf("Divide(10, 2) returned unexpected error: %v", err)
    }
    if result != 5 {
        t.Errorf("Divide(10, 2) = %d; expected 5", result)
    }

    // Test division by zero
    _, err = Divide(10, 0)
    if err != ErrDivisionByZero {
        t.Errorf("Divide(10, 0) should return ErrDivisionByZero")
    }
}
```

Run the tests:

```bash
# Run all tests in the current package
go test

# Run tests with verbose output
go test -v

# Run a specific test by name
go test -v -run TestAdd

# Run tests in all subdirectories
go test ./...
```

## Table-Driven Tests

Table-driven tests are the idiomatic way to test multiple scenarios in Go. Instead of writing separate test functions, define a table of inputs and expected outputs.

```go
// TestAddTableDriven demonstrates the table-driven testing pattern
func TestAddTableDriven(t *testing.T) {
    // Define test cases as a slice of structs
    tests := []struct {
        name     string // Descriptive name for the test case
        a        int
        b        int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"zeros", 0, 0, 0},
        {"large numbers", 1000000, 2000000, 3000000},
    }

    // Iterate through each test case
    for _, tc := range tests {
        // Use t.Run to create a subtest for each case
        t.Run(tc.name, func(t *testing.T) {
            result := Add(tc.a, tc.b)
            if result != tc.expected {
                t.Errorf("Add(%d, %d) = %d; expected %d",
                    tc.a, tc.b, result, tc.expected)
            }
        })
    }
}

// TestDivideTableDriven shows table-driven tests with error handling
func TestDivideTableDriven(t *testing.T) {
    tests := []struct {
        name        string
        a, b        int
        expected    int
        expectError bool
    }{
        {"simple division", 10, 2, 5, false},
        {"division with remainder", 7, 2, 3, false},
        {"divide by zero", 10, 0, 0, true},
        {"negative dividend", -10, 2, -5, false},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            result, err := Divide(tc.a, tc.b)

            if tc.expectError {
                if err == nil {
                    t.Errorf("expected error but got none")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
                return
            }

            if result != tc.expected {
                t.Errorf("got %d; expected %d", result, tc.expected)
            }
        })
    }
}
```

Run specific subtests:

```bash
# Run only the "negative numbers" subtest
go test -v -run "TestAddTableDriven/negative_numbers"
```

## Subtests for Complex Scenarios

Subtests using `t.Run()` help organize related tests and enable parallel execution.

```go
// TestUserValidation demonstrates nested subtests
func TestUserValidation(t *testing.T) {
    t.Run("email validation", func(t *testing.T) {
        t.Run("valid email", func(t *testing.T) {
            err := ValidateEmail("user@example.com")
            if err != nil {
                t.Errorf("expected valid email, got error: %v", err)
            }
        })

        t.Run("missing @", func(t *testing.T) {
            err := ValidateEmail("userexample.com")
            if err == nil {
                t.Error("expected error for email without @")
            }
        })
    })

    t.Run("password validation", func(t *testing.T) {
        t.Run("strong password", func(t *testing.T) {
            err := ValidatePassword("SecureP@ss123")
            if err != nil {
                t.Errorf("expected valid password, got error: %v", err)
            }
        })

        t.Run("too short", func(t *testing.T) {
            err := ValidatePassword("short")
            if err == nil {
                t.Error("expected error for short password")
            }
        })
    })
}
```

## Parallel Testing

Use `t.Parallel()` to run tests concurrently for faster execution.

```go
func TestParallelTableDriven(t *testing.T) {
    tests := []struct {
        name   string
        input  string
        output string
    }{
        {"case1", "input1", "output1"},
        {"case2", "input2", "output2"},
        {"case3", "input3", "output3"},
    }

    for _, tc := range tests {
        // IMPORTANT: capture loop variable to avoid closure issues
        tc := tc

        t.Run(tc.name, func(t *testing.T) {
            t.Parallel() // Mark as parallel-safe

            result := Process(tc.input)
            if result != tc.output {
                t.Errorf("Process(%s) = %s; expected %s",
                    tc.input, result, tc.output)
            }
        })
    }
}
```

Control parallel execution:

```bash
go test -parallel 4  # Limit to 4 concurrent tests
```

## Test Setup and Teardown

Go provides several patterns for test setup and cleanup.

```go
// Package-level setup using TestMain
func TestMain(m *testing.M) {
    // Setup: runs before any test
    setupTestDatabase()

    // Run all tests
    code := m.Run()

    // Teardown: runs after all tests complete
    teardownTestDatabase()

    os.Exit(code)
}

// Per-test setup and cleanup
func TestDatabaseOperations(t *testing.T) {
    db := createTestConnection(t)

    // t.Cleanup registers cleanup functions (run in LIFO order)
    t.Cleanup(func() {
        db.Close()
    })

    // Actual test code
    err := db.CreateUser(&User{Email: "test@test.com"})
    if err != nil {
        t.Fatalf("failed to create user: %v", err)
    }
}

// Test helper that can fail the test
func createTestConnection(t *testing.T) *Database {
    t.Helper() // Errors report caller's line number

    db, err := Connect("postgres://localhost/testdb")
    if err != nil {
        t.Fatalf("failed to connect: %v", err)
    }
    return db
}
```

## Test Helpers

Reusable helper functions make tests cleaner.

```go
// assertEqual is a generic helper for comparing values
func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v, want %v", got, want)
    }
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertError(t *testing.T, err error) {
    t.Helper()
    if err == nil {
        t.Fatal("expected error but got nil")
    }
}

// Usage
func TestUserCreation(t *testing.T) {
    user, err := CreateUser("test@example.com", "password123")
    assertNoError(t, err)
    assertEqual(t, user.Email, "test@example.com")
}
```

## Benchmarking

Go's testing package includes built-in benchmarks. Benchmark functions start with `Benchmark` and take `*testing.B`.

```go
// BenchmarkAdd measures the performance of Add
func BenchmarkAdd(b *testing.B) {
    // b.N is automatically determined by the framework
    for i := 0; i < b.N; i++ {
        Add(100, 200)
    }
}

// BenchmarkWithSetup excludes setup time from measurement
func BenchmarkComplexCalculation(b *testing.B) {
    data := generateLargeDataset(10000)
    b.ResetTimer() // Reset timer after setup

    for i := 0; i < b.N; i++ {
        processData(data)
    }
}

// BenchmarkWithAllocation reports memory allocations
func BenchmarkWithAllocation(b *testing.B) {
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        result := createSlice(1000)
        _ = result
    }
}

// Sub-benchmarks for comparing implementations
func BenchmarkSort(b *testing.B) {
    b.Run("QuickSort", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            quickSort(data)
        }
    })

    b.Run("MergeSort", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            mergeSort(data)
        }
    })
}
```

Run benchmarks:

```bash
go test -bench=.                    # Run all benchmarks
go test -bench=BenchmarkAdd         # Run specific benchmark
go test -bench=. -benchmem          # Include memory stats
go test -bench=. -benchtime=5s      # Run longer for accuracy
```

Sample output:

```
BenchmarkAdd-8              1000000000    0.31 ns/op    0 B/op    0 allocs/op
BenchmarkWithAllocation-8      2000000    892 ns/op     8192 B/op  1 allocs/op
```

## Code Coverage

Go provides built-in coverage analysis.

```bash
# Run tests with coverage
go test -cover

# Generate coverage profile
go test -coverprofile=coverage.out

# View coverage in terminal
go tool cover -func=coverage.out

# Generate HTML coverage report
go tool cover -html=coverage.out -o coverage.html

# Coverage for all packages
go test -coverprofile=coverage.out ./...
```

Coverage modes:

| Mode | Description |
|------|-------------|
| `set` | Did this statement run? (default) |
| `count` | How many times did it run? |
| `atomic` | Thread-safe count for parallel tests |

## Using Testify for Better Assertions

[Testify](https://github.com/stretchr/testify) provides cleaner assertions and mocking.

```bash
go get github.com/stretchr/testify
```

### Testify Assertions

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUserWithAssert(t *testing.T) {
    user := CreateUser("test@example.com", "John Doe")

    // assert.* continues even if assertion fails
    assert.Equal(t, "test@example.com", user.Email)
    assert.NotNil(t, user.ID)
    assert.True(t, user.IsActive)
    assert.Contains(t, user.Roles, "user")
    assert.Len(t, user.Roles, 1)

    err := user.Validate()
    assert.NoError(t, err)
}

func TestUserWithRequire(t *testing.T) {
    user, err := FetchUser("user_123")

    // require.* stops test immediately if condition fails
    require.NoError(t, err, "must be able to fetch user")
    require.NotNil(t, user, "user must exist")

    // Now safe to use user
    assert.Equal(t, "user_123", user.ID)
}
```

### Testify Mocking

```go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// Interface to mock
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(user *User) error
}

// Mock implementation
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByID(id string) (*User, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func (m *MockUserRepository) Save(user *User) error {
    args := m.Called(user)
    return args.Error(0)
}

// Test using mock
func TestUserService(t *testing.T) {
    mockRepo := new(MockUserRepository)

    // Set up expectation
    expectedUser := &User{ID: "user_1", Name: "John"}
    mockRepo.On("FindByID", "user_1").Return(expectedUser, nil)

    service := NewUserService(mockRepo)
    user, err := service.GetUser("user_1")

    assert.NoError(t, err)
    assert.Equal(t, "John", user.Name)
    mockRepo.AssertExpectations(t)
}

func TestUserServiceNotFound(t *testing.T) {
    mockRepo := new(MockUserRepository)
    mockRepo.On("FindByID", "nonexistent").Return(nil, ErrUserNotFound)

    service := NewUserService(mockRepo)
    user, err := service.GetUser("nonexistent")

    assert.Nil(t, user)
    assert.ErrorIs(t, err, ErrUserNotFound)
}
```

### Testify Suites

```go
import "github.com/stretchr/testify/suite"

type UserServiceTestSuite struct {
    suite.Suite
    service  *UserService
    mockRepo *MockUserRepository
}

func (s *UserServiceTestSuite) SetupTest() {
    s.mockRepo = new(MockUserRepository)
    s.service = NewUserService(s.mockRepo)
}

func (s *UserServiceTestSuite) TearDownTest() {
    s.mockRepo.AssertExpectations(s.T())
}

func (s *UserServiceTestSuite) TestGetUser() {
    expectedUser := &User{ID: "user_1", Name: "Alice"}
    s.mockRepo.On("FindByID", "user_1").Return(expectedUser, nil)

    user, err := s.service.GetUser("user_1")

    s.NoError(err)
    s.Equal("Alice", user.Name)
}

// Run the suite
func TestUserServiceSuite(t *testing.T) {
    suite.Run(t, new(UserServiceTestSuite))
}
```

## Testing HTTP Handlers

Use `net/http/httptest` for testing HTTP handlers.

```go
import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestGetUserHandler(t *testing.T) {
    req, _ := http.NewRequest("GET", "/users/123", nil)
    rr := httptest.NewRecorder()

    handler := http.HandlerFunc(GetUserHandler)
    handler.ServeHTTP(rr, req)

    if rr.Code != http.StatusOK {
        t.Errorf("got status %d, want %d", rr.Code, http.StatusOK)
    }

    var response map[string]interface{}
    json.Unmarshal(rr.Body.Bytes(), &response)

    if response["id"] != "123" {
        t.Errorf("unexpected id: %v", response["id"])
    }
}

func TestCreateUserHandler(t *testing.T) {
    body := map[string]string{"email": "new@example.com", "name": "New User"}
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")

    rr := httptest.NewRecorder()
    handler := http.HandlerFunc(CreateUserHandler)
    handler.ServeHTTP(rr, req)

    if rr.Code != http.StatusCreated {
        t.Errorf("got status %d, want %d", rr.Code, http.StatusCreated)
    }
}

func TestWithTestServer(t *testing.T) {
    server := httptest.NewServer(NewRouter())
    defer server.Close()

    resp, err := http.Get(server.URL + "/users/123")
    if err != nil {
        t.Fatalf("request failed: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("unexpected status: %d", resp.StatusCode)
    }
}
```

## Best Practices Summary

| Practice | Reason |
|----------|--------|
| **Use table-driven tests** | Reduces duplication, easy to add cases |
| **Name tests descriptively** | Clear what each test verifies |
| **Use t.Helper() in helpers** | Error messages show caller's line |
| **Test edge cases** | Zero values, empty strings, nil |
| **Keep tests fast** | Slow tests get skipped |
| **Use interfaces** | Enables mocking and loose coupling |
| **Test one thing per test** | Easier debugging when tests fail |
| **Don't test private functions** | Test through public API |
| **Use parallel tests wisely** | Speed up test suite |
| **Maintain test coverage** | Catch regressions early |

## Common Testing Patterns

```go
// Golden file testing - compare against known good output
func TestOutputGolden(t *testing.T) {
    result := GenerateReport(testData)
    golden := filepath.Join("testdata", "expected.txt")

    expected, _ := os.ReadFile(golden)
    if result != string(expected) {
        t.Errorf("output mismatch")
    }
}

// Testing with environment variables
func TestWithEnvVar(t *testing.T) {
    original := os.Getenv("API_KEY")
    os.Setenv("API_KEY", "test-key-123")
    t.Cleanup(func() { os.Setenv("API_KEY", original) })

    config := LoadConfig()
    assert.Equal(t, "test-key-123", config.APIKey)
}

// Testing with temporary files
func TestFileProcessing(t *testing.T) {
    tmpDir := t.TempDir() // Automatically cleaned up
    testFile := filepath.Join(tmpDir, "test.txt")
    os.WriteFile(testFile, []byte("test content"), 0644)

    result, err := ProcessFile(testFile)
    assert.NoError(t, err)
}
```

## Monitoring Your Go Applications with OneUptime

Once your tests pass and your Go application is deployed, you need visibility into production performance. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Go applications.

```go
// Instrumenting Go applications with OpenTelemetry for OneUptime
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/trace"
)

func InitTelemetry(serviceName string) (func(), error) {
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("otlp.oneuptime.com"),
        otlptracehttp.WithHeaders(map[string]string{
            "x-oneuptime-token": os.Getenv("ONEUPTIME_TOKEN"),
        }),
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(trace.WithBatcher(exporter))
    otel.SetTracerProvider(tp)

    return func() { tp.Shutdown(context.Background()) }, nil
}
```

With OneUptime, you can:

- **Track test coverage trends** - Monitor coverage over time
- **Set up uptime monitoring** - Alert when services go down
- **Collect traces and logs** - Debug production issues
- **Create status pages** - Communicate with users during incidents

---

*Building reliable Go applications? [OneUptime](https://oneuptime.com) provides end-to-end observability for your Go services - from tracing and metrics to uptime monitoring and incident management.*
