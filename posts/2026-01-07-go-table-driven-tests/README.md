# How to Write Table-Driven Tests in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Testing, Table-Driven Tests, Best Practices

Description: Master table-driven testing in Go with idiomatic patterns for comprehensive test coverage, subtests, and parallel execution.

---

Table-driven tests are the cornerstone of idiomatic Go testing. This pattern allows you to write comprehensive, maintainable, and readable tests by defining test cases as data structures rather than repetitive code blocks. In this guide, we will explore how to effectively implement table-driven tests in Go, covering everything from basic patterns to advanced techniques like parallel execution and test helpers.

## Why Table-Driven Tests?

Before diving into implementation, let us understand why table-driven tests are the preferred approach in Go:

1. **Reduced Code Duplication**: Instead of writing separate test functions for each scenario, you define test cases as data.
2. **Easy to Add New Cases**: Adding a new test case is as simple as adding a new struct to your slice.
3. **Better Readability**: Test cases are clearly visible and organized in one place.
4. **Consistent Test Structure**: All test cases follow the same pattern, making tests predictable.
5. **Maintainability**: Changes to test logic only need to happen in one place.

## Basic Table-Driven Test Pattern

Let us start with a simple example. Consider a function that adds two numbers:

```go
// add.go
package math

// Add returns the sum of two integers
func Add(a, b int) int {
    return a + b
}
```

Here is the basic table-driven test structure for this function:

```go
// add_test.go
package math

import "testing"

// TestAdd demonstrates the fundamental table-driven test pattern
// Each test case is defined as a struct with input and expected output
func TestAdd(t *testing.T) {
    // Define test cases as a slice of anonymous structs
    tests := []struct {
        name     string // descriptive name for the test case
        a        int    // first input
        b        int    // second input
        expected int    // expected result
    }{
        {
            name:     "positive numbers",
            a:        2,
            b:        3,
            expected: 5,
        },
        {
            name:     "negative numbers",
            a:        -2,
            b:        -3,
            expected: -5,
        },
        {
            name:     "mixed sign numbers",
            a:        -2,
            b:        3,
            expected: 1,
        },
        {
            name:     "zero values",
            a:        0,
            b:        0,
            expected: 0,
        },
        {
            name:     "large numbers",
            a:        1000000,
            b:        2000000,
            expected: 3000000,
        },
    }

    // Iterate through each test case
    for _, tt := range tests {
        // Run each test case as a subtest
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

## Designing Effective Test Case Structs

The test case struct is the foundation of your table-driven tests. A well-designed struct makes tests clear and maintainable.

### Basic Struct Design Principles

Follow these principles when designing your test case struct:

```go
// user_validator_test.go
package user

import "testing"

// TestValidateUsername shows a well-structured test case design
// The struct includes all necessary fields for comprehensive testing
func TestValidateUsername(t *testing.T) {
    tests := []struct {
        name      string // always include a descriptive name
        input     string // the value being tested
        wantValid bool   // expected validation result
        wantErr   bool   // whether an error is expected
        errMsg    string // expected error message (optional)
    }{
        {
            name:      "valid username with letters",
            input:     "johndoe",
            wantValid: true,
            wantErr:   false,
        },
        {
            name:      "valid username with numbers",
            input:     "john123",
            wantValid: true,
            wantErr:   false,
        },
        {
            name:      "empty username",
            input:     "",
            wantValid: false,
            wantErr:   true,
            errMsg:    "username cannot be empty",
        },
        {
            name:      "username too short",
            input:     "ab",
            wantValid: false,
            wantErr:   true,
            errMsg:    "username must be at least 3 characters",
        },
        {
            name:      "username with special characters",
            input:     "john@doe",
            wantValid: false,
            wantErr:   true,
            errMsg:    "username can only contain alphanumeric characters",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            valid, err := ValidateUsername(tt.input)

            // Check error expectation
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateUsername(%q) error = %v, wantErr %v",
                    tt.input, err, tt.wantErr)
                return
            }

            // Check error message if expected
            if tt.wantErr && err != nil && err.Error() != tt.errMsg {
                t.Errorf("ValidateUsername(%q) error = %q, want %q",
                    tt.input, err.Error(), tt.errMsg)
            }

            // Check validation result
            if valid != tt.wantValid {
                t.Errorf("ValidateUsername(%q) = %v, want %v",
                    tt.input, valid, tt.wantValid)
            }
        })
    }
}
```

### Using Named Structs for Complex Cases

When your test cases become complex, consider using named structs for better organization:

```go
// order_processor_test.go
package order

import (
    "testing"
    "time"
)

// OrderTestCase defines the structure for order processing tests
// Using a named struct improves readability for complex test scenarios
type OrderTestCase struct {
    Name           string
    Order          Order
    Inventory      map[string]int
    ExpectedStatus OrderStatus
    ExpectedError  error
    ShouldProcess  bool
}

// TestProcessOrder demonstrates using named structs for complex test cases
func TestProcessOrder(t *testing.T) {
    // Define test cases using the named struct
    tests := []OrderTestCase{
        {
            Name: "successful order with available inventory",
            Order: Order{
                ID:        "order-001",
                ProductID: "prod-123",
                Quantity:  5,
                CreatedAt: time.Now(),
            },
            Inventory: map[string]int{
                "prod-123": 100,
            },
            ExpectedStatus: StatusConfirmed,
            ExpectedError:  nil,
            ShouldProcess:  true,
        },
        {
            Name: "order fails due to insufficient inventory",
            Order: Order{
                ID:        "order-002",
                ProductID: "prod-456",
                Quantity:  50,
                CreatedAt: time.Now(),
            },
            Inventory: map[string]int{
                "prod-456": 10,
            },
            ExpectedStatus: StatusRejected,
            ExpectedError:  ErrInsufficientInventory,
            ShouldProcess:  false,
        },
        {
            Name: "order fails for unknown product",
            Order: Order{
                ID:        "order-003",
                ProductID: "unknown-prod",
                Quantity:  1,
                CreatedAt: time.Now(),
            },
            Inventory:      map[string]int{},
            ExpectedStatus: StatusRejected,
            ExpectedError:  ErrProductNotFound,
            ShouldProcess:  false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.Name, func(t *testing.T) {
            processor := NewOrderProcessor(tt.Inventory)
            status, err := processor.Process(tt.Order)

            if err != tt.ExpectedError {
                t.Errorf("Process() error = %v, want %v", err, tt.ExpectedError)
            }

            if status != tt.ExpectedStatus {
                t.Errorf("Process() status = %v, want %v", status, tt.ExpectedStatus)
            }
        })
    }
}
```

## Using t.Run for Subtests

The `t.Run` method is essential for table-driven tests. It creates subtests that can be run independently and provide clear output.

### Benefits of Subtests

Subtests offer several advantages:

```go
// calculator_test.go
package calculator

import "testing"

// TestDivide demonstrates subtests with t.Run
// Subtests allow individual test cases to be run and reported separately
func TestDivide(t *testing.T) {
    tests := []struct {
        name        string
        dividend    float64
        divisor     float64
        expected    float64
        expectError bool
    }{
        {
            name:        "divide positive numbers",
            dividend:    10,
            divisor:     2,
            expected:    5,
            expectError: false,
        },
        {
            name:        "divide by zero",
            dividend:    10,
            divisor:     0,
            expected:    0,
            expectError: true,
        },
        {
            name:        "divide negative by positive",
            dividend:    -10,
            divisor:     2,
            expected:    -5,
            expectError: false,
        },
        {
            name:        "divide with decimal result",
            dividend:    7,
            divisor:     2,
            expected:    3.5,
            expectError: false,
        },
    }

    for _, tt := range tests {
        // t.Run creates a subtest with its own name
        // This allows running specific tests with: go test -run TestDivide/divide_by_zero
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.dividend, tt.divisor)

            if tt.expectError {
                if err == nil {
                    t.Error("expected error but got none")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
                return
            }

            if result != tt.expected {
                t.Errorf("Divide(%v, %v) = %v; want %v",
                    tt.dividend, tt.divisor, result, tt.expected)
            }
        })
    }
}
```

### Running Specific Subtests

You can run specific subtests using the `-run` flag:

```bash
# Run all tests in TestDivide
go test -run TestDivide

# Run only the "divide by zero" subtest
go test -run "TestDivide/divide_by_zero"

# Run all subtests matching a pattern
go test -run "TestDivide/divide.*positive"
```

## Parallel Test Execution

Go supports running tests in parallel, which can significantly speed up your test suite. Table-driven tests work excellently with parallel execution.

### Basic Parallel Execution

Use `t.Parallel()` to run tests concurrently:

```go
// http_client_test.go
package httpclient

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

// TestHTTPClient demonstrates parallel test execution
// Use t.Parallel() to run independent test cases concurrently
func TestHTTPClient(t *testing.T) {
    tests := []struct {
        name           string
        serverResponse string
        serverStatus   int
        expectedBody   string
        expectError    bool
    }{
        {
            name:           "successful GET request",
            serverResponse: `{"status": "ok"}`,
            serverStatus:   http.StatusOK,
            expectedBody:   `{"status": "ok"}`,
            expectError:    false,
        },
        {
            name:           "server returns 404",
            serverResponse: `{"error": "not found"}`,
            serverStatus:   http.StatusNotFound,
            expectedBody:   "",
            expectError:    true,
        },
        {
            name:           "server returns 500",
            serverResponse: `{"error": "internal error"}`,
            serverStatus:   http.StatusInternalServerError,
            expectedBody:   "",
            expectError:    true,
        },
        {
            name:           "empty response body",
            serverResponse: "",
            serverStatus:   http.StatusOK,
            expectedBody:   "",
            expectError:    false,
        },
    }

    for _, tt := range tests {
        // Capture the loop variable to avoid closure issues
        tt := tt

        t.Run(tt.name, func(t *testing.T) {
            // Mark this subtest as safe for parallel execution
            t.Parallel()

            // Create a test server for this specific test case
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.serverStatus)
                w.Write([]byte(tt.serverResponse))
            }))
            defer server.Close()

            // Create client and make request
            client := NewHTTPClient()
            body, err := client.Get(server.URL)

            if tt.expectError {
                if err == nil {
                    t.Error("expected error but got none")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
                return
            }

            if body != tt.expectedBody {
                t.Errorf("got body %q; want %q", body, tt.expectedBody)
            }
        })
    }
}
```

### Important Note About Loop Variables

When using parallel tests, always capture the loop variable to avoid race conditions:

```go
// Correct way - capture the variable
for _, tt := range tests {
    tt := tt // This creates a new variable scoped to each iteration
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // Use tt safely here
    })
}

// Incorrect way - can cause race conditions
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // tt might have changed by the time this runs!
    })
}
```

## Testing Error Cases

Properly testing error cases is crucial for robust software. Table-driven tests make it easy to cover various error scenarios.

### Comprehensive Error Testing

Here is an example of thorough error case testing:

```go
// file_reader_test.go
package filereader

import (
    "errors"
    "os"
    "testing"
)

// TestReadFile demonstrates comprehensive error case testing
// Each test case covers a specific error condition
func TestReadFile(t *testing.T) {
    tests := []struct {
        name          string
        filename      string
        setupFunc     func() error    // setup function for test prerequisites
        cleanupFunc   func()          // cleanup function for test teardown
        expectedError error
        checkError    func(error) bool // custom error checking function
    }{
        {
            name:     "file does not exist",
            filename: "/nonexistent/path/file.txt",
            setupFunc: func() error {
                return nil // no setup needed
            },
            cleanupFunc: func() {},
            checkError: func(err error) bool {
                return errors.Is(err, os.ErrNotExist)
            },
        },
        {
            name:     "empty filename",
            filename: "",
            setupFunc: func() error {
                return nil
            },
            cleanupFunc:   func() {},
            expectedError: ErrEmptyFilename,
        },
        {
            name:     "directory instead of file",
            filename: "/tmp/testdir",
            setupFunc: func() error {
                return os.MkdirAll("/tmp/testdir", 0755)
            },
            cleanupFunc: func() {
                os.RemoveAll("/tmp/testdir")
            },
            expectedError: ErrNotAFile,
        },
        {
            name:     "successful read",
            filename: "/tmp/testfile.txt",
            setupFunc: func() error {
                return os.WriteFile("/tmp/testfile.txt", []byte("test content"), 0644)
            },
            cleanupFunc: func() {
                os.Remove("/tmp/testfile.txt")
            },
            expectedError: nil,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Run setup
            if err := tt.setupFunc(); err != nil {
                t.Fatalf("setup failed: %v", err)
            }
            defer tt.cleanupFunc()

            // Execute the function under test
            _, err := ReadFile(tt.filename)

            // Check error using custom function if provided
            if tt.checkError != nil {
                if !tt.checkError(err) {
                    t.Errorf("error check failed for error: %v", err)
                }
                return
            }

            // Check for expected error
            if !errors.Is(err, tt.expectedError) {
                t.Errorf("ReadFile(%q) error = %v, want %v",
                    tt.filename, err, tt.expectedError)
            }
        })
    }
}
```

### Testing Multiple Error Types

When a function can return different error types, test each one:

```go
// parser_test.go
package parser

import (
    "errors"
    "testing"
)

// Custom error types for the parser
var (
    ErrEmptyInput     = errors.New("input cannot be empty")
    ErrInvalidSyntax  = errors.New("invalid syntax")
    ErrUnexpectedToken = errors.New("unexpected token")
    ErrMaxDepthExceeded = errors.New("maximum nesting depth exceeded")
)

// TestParseJSON tests various error scenarios in JSON parsing
func TestParseJSON(t *testing.T) {
    tests := []struct {
        name        string
        input       string
        wantErr     bool
        expectedErr error
        errContains string // for checking partial error messages
    }{
        {
            name:        "valid JSON object",
            input:       `{"key": "value"}`,
            wantErr:     false,
            expectedErr: nil,
        },
        {
            name:        "empty input",
            input:       "",
            wantErr:     true,
            expectedErr: ErrEmptyInput,
        },
        {
            name:        "invalid syntax - missing quote",
            input:       `{"key: "value"}`,
            wantErr:     true,
            expectedErr: ErrInvalidSyntax,
        },
        {
            name:        "unexpected token",
            input:       `{"key": value}`,
            wantErr:     true,
            expectedErr: ErrUnexpectedToken,
        },
        {
            name:        "deeply nested exceeds limit",
            input:       `{"a":{"b":{"c":{"d":{"e":{"f":{}}}}}}}`,
            wantErr:     true,
            expectedErr: ErrMaxDepthExceeded,
        },
        {
            name:        "error message contains line number",
            input:       "{\n\"key\": \n}",
            wantErr:     true,
            errContains: "line 3",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := ParseJSON(tt.input)

            // Check if error occurred as expected
            if (err != nil) != tt.wantErr {
                t.Errorf("ParseJSON() error = %v, wantErr %v", err, tt.wantErr)
                return
            }

            // Check specific error type
            if tt.expectedErr != nil && !errors.Is(err, tt.expectedErr) {
                t.Errorf("ParseJSON() error = %v, want %v", err, tt.expectedErr)
            }

            // Check error message contains expected substring
            if tt.errContains != "" && err != nil {
                if !containsString(err.Error(), tt.errContains) {
                    t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
                }
            }
        })
    }
}

// containsString is a helper to check if a string contains a substring
func containsString(s, substr string) bool {
    return len(s) >= len(substr) &&
        (s == substr || len(s) > 0 && containsString(s[1:], substr) || s[:len(substr)] == substr)
}
```

## Test Helper Functions

Test helpers reduce duplication and improve readability. Go 1.9 introduced `t.Helper()` to mark functions as test helpers.

### Creating Effective Test Helpers

Here is how to create and use test helpers:

```go
// database_test.go
package database

import (
    "testing"
)

// assertEqual is a generic helper for comparing values
// t.Helper() ensures error messages point to the calling test, not the helper
func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v, want %v", got, want)
    }
}

// assertError is a helper for checking error conditions
func assertError(t *testing.T, err error, wantErr bool) {
    t.Helper()
    if (err != nil) != wantErr {
        t.Errorf("error = %v, wantErr %v", err, wantErr)
    }
}

// assertSliceEqual compares two slices for equality
func assertSliceEqual[T comparable](t *testing.T, got, want []T) {
    t.Helper()
    if len(got) != len(want) {
        t.Errorf("slice length mismatch: got %d, want %d", len(got), len(want))
        return
    }
    for i := range got {
        if got[i] != want[i] {
            t.Errorf("mismatch at index %d: got %v, want %v", i, got[i], want[i])
        }
    }
}

// TestUserRepository demonstrates using test helpers
func TestUserRepository(t *testing.T) {
    tests := []struct {
        name      string
        userID    int
        wantName  string
        wantEmail string
        wantErr   bool
    }{
        {
            name:      "existing user",
            userID:    1,
            wantName:  "John Doe",
            wantEmail: "john@example.com",
            wantErr:   false,
        },
        {
            name:      "non-existing user",
            userID:    999,
            wantName:  "",
            wantEmail: "",
            wantErr:   true,
        },
    }

    repo := NewUserRepository()

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            user, err := repo.FindByID(tt.userID)

            assertError(t, err, tt.wantErr)
            if tt.wantErr {
                return
            }

            assertEqual(t, user.Name, tt.wantName)
            assertEqual(t, user.Email, tt.wantEmail)
        })
    }
}
```

### Setup and Teardown Helpers

Create helpers for common setup and teardown operations:

```go
// integration_test.go
package integration

import (
    "database/sql"
    "testing"
)

// testDB is a helper that creates a test database connection
// It returns the connection and a cleanup function
func testDB(t *testing.T) (*sql.DB, func()) {
    t.Helper()

    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open test database: %v", err)
    }

    // Run migrations
    if err := runMigrations(db); err != nil {
        db.Close()
        t.Fatalf("failed to run migrations: %v", err)
    }

    // Return cleanup function
    cleanup := func() {
        db.Close()
    }

    return db, cleanup
}

// seedTestData populates the database with test data
func seedTestData(t *testing.T, db *sql.DB, data TestData) {
    t.Helper()

    for _, user := range data.Users {
        _, err := db.Exec("INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
            user.ID, user.Name, user.Email)
        if err != nil {
            t.Fatalf("failed to seed user: %v", err)
        }
    }
}

// TestUserService uses the helper functions for clean setup
func TestUserService(t *testing.T) {
    tests := []struct {
        name     string
        testData TestData
        query    string
        wantLen  int
    }{
        {
            name: "find users by name",
            testData: TestData{
                Users: []User{
                    {ID: 1, Name: "Alice", Email: "alice@test.com"},
                    {ID: 2, Name: "Bob", Email: "bob@test.com"},
                    {ID: 3, Name: "Alice Smith", Email: "asmith@test.com"},
                },
            },
            query:   "Alice",
            wantLen: 2,
        },
        {
            name: "no matching users",
            testData: TestData{
                Users: []User{
                    {ID: 1, Name: "Charlie", Email: "charlie@test.com"},
                },
            },
            query:   "Alice",
            wantLen: 0,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            db, cleanup := testDB(t)
            defer cleanup()
            seedTestData(t, db, tt.testData)

            // Execute
            service := NewUserService(db)
            users, err := service.SearchByName(tt.query)

            // Assert
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }

            if len(users) != tt.wantLen {
                t.Errorf("got %d users, want %d", len(users), tt.wantLen)
            }
        })
    }
}
```

## Naming Conventions

Good naming makes tests self-documenting. Follow these conventions for clear, descriptive test names.

### Test Case Naming

Use descriptive names that explain the scenario:

```go
// naming_examples_test.go
package examples

import "testing"

// TestCalculateDiscount demonstrates good naming conventions
func TestCalculateDiscount(t *testing.T) {
    tests := []struct {
        name     string
        amount   float64
        discount float64
        want     float64
    }{
        // Good: Describes the scenario and expected behavior
        {
            name:     "applies 10 percent discount to regular price",
            amount:   100.00,
            discount: 0.10,
            want:     90.00,
        },
        // Good: Clearly states the boundary condition
        {
            name:     "returns zero when discount is 100 percent",
            amount:   50.00,
            discount: 1.00,
            want:     0.00,
        },
        // Good: Describes edge case handling
        {
            name:     "returns original amount when discount is zero",
            amount:   75.00,
            discount: 0.00,
            want:     75.00,
        },
        // Good: Indicates error condition
        {
            name:     "handles negative discount by treating as zero",
            amount:   100.00,
            discount: -0.10,
            want:     100.00,
        },
        // Good: Specifies the context and constraint
        {
            name:     "rounds to two decimal places for currency",
            amount:   99.99,
            discount: 0.15,
            want:     84.99,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := CalculateDiscount(tt.amount, tt.discount)
            if got != tt.want {
                t.Errorf("CalculateDiscount(%v, %v) = %v, want %v",
                    tt.amount, tt.discount, got, tt.want)
            }
        })
    }
}
```

### Naming Anti-Patterns to Avoid

Here are examples of what not to do:

```go
// Bad naming examples - DO NOT follow these patterns

tests := []struct {
    name string
    // ...
}{
    // Bad: Too vague
    {name: "test1"},
    {name: "test case 2"},

    // Bad: Just describes input, not behavior
    {name: "100 dollars"},
    {name: "negative number"},

    // Bad: Doesn't explain what should happen
    {name: "edge case"},
    {name: "special case"},

    // Bad: Too technical, doesn't describe business logic
    {name: "float64 overflow"},
}

// Good naming examples - Follow these patterns

tests := []struct {
    name string
    // ...
}{
    // Good: Describes input AND expected behavior
    {name: "calculates tax for 100 dollar purchase"},
    {name: "returns error for negative quantity"},

    // Good: Clearly states the scenario
    {name: "applies bulk discount when quantity exceeds 10"},
    {name: "prevents division by zero with zero denominator"},

    // Good: Includes context when needed
    {name: "premium user gets 20 percent discount"},
    {name: "expired coupon returns validation error"},
}
```

## Advanced Patterns

Let us explore some advanced patterns for more complex testing scenarios.

### Testing with Interfaces and Mocks

Table-driven tests work well with dependency injection and mocks:

```go
// notification_service_test.go
package notification

import (
    "errors"
    "testing"
)

// EmailSender interface for dependency injection
type EmailSender interface {
    Send(to, subject, body string) error
}

// MockEmailSender is a configurable mock for testing
type MockEmailSender struct {
    SendFunc func(to, subject, body string) error
    Calls    []EmailCall
}

type EmailCall struct {
    To      string
    Subject string
    Body    string
}

func (m *MockEmailSender) Send(to, subject, body string) error {
    m.Calls = append(m.Calls, EmailCall{To: to, Subject: subject, Body: body})
    if m.SendFunc != nil {
        return m.SendFunc(to, subject, body)
    }
    return nil
}

// TestNotificationService demonstrates testing with mocks
func TestNotificationService(t *testing.T) {
    tests := []struct {
        name          string
        recipient     string
        message       string
        mockSendFunc  func(to, subject, body string) error
        wantErr       bool
        wantCallCount int
    }{
        {
            name:      "successfully sends notification",
            recipient: "user@example.com",
            message:   "Hello, World!",
            mockSendFunc: func(to, subject, body string) error {
                return nil
            },
            wantErr:       false,
            wantCallCount: 1,
        },
        {
            name:      "handles email sending failure",
            recipient: "user@example.com",
            message:   "Test message",
            mockSendFunc: func(to, subject, body string) error {
                return errors.New("SMTP connection failed")
            },
            wantErr:       true,
            wantCallCount: 1,
        },
        {
            name:      "skips sending for empty recipient",
            recipient: "",
            message:   "Test message",
            mockSendFunc: func(to, subject, body string) error {
                return nil
            },
            wantErr:       true,
            wantCallCount: 0,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mock := &MockEmailSender{SendFunc: tt.mockSendFunc}
            service := NewNotificationService(mock)

            err := service.Notify(tt.recipient, tt.message)

            if (err != nil) != tt.wantErr {
                t.Errorf("Notify() error = %v, wantErr %v", err, tt.wantErr)
            }

            if len(mock.Calls) != tt.wantCallCount {
                t.Errorf("Send() called %d times, want %d",
                    len(mock.Calls), tt.wantCallCount)
            }
        })
    }
}
```

### Testing with Test Fixtures

For tests that require complex data, use fixtures:

```go
// fixture_test.go
package api

import (
    "encoding/json"
    "os"
    "path/filepath"
    "testing"
)

// loadFixture loads test data from a JSON file
func loadFixture[T any](t *testing.T, filename string) T {
    t.Helper()

    path := filepath.Join("testdata", filename)
    data, err := os.ReadFile(path)
    if err != nil {
        t.Fatalf("failed to read fixture %s: %v", filename, err)
    }

    var result T
    if err := json.Unmarshal(data, &result); err != nil {
        t.Fatalf("failed to parse fixture %s: %v", filename, err)
    }

    return result
}

// TestAPIResponse demonstrates using fixtures for complex test data
func TestAPIResponse(t *testing.T) {
    tests := []struct {
        name         string
        fixtureFile  string
        expectedLen  int
        validateFunc func(*testing.T, APIResponse)
    }{
        {
            name:        "parses user list response",
            fixtureFile: "users_response.json",
            expectedLen: 3,
            validateFunc: func(t *testing.T, resp APIResponse) {
                if resp.Status != "success" {
                    t.Errorf("expected status success, got %s", resp.Status)
                }
            },
        },
        {
            name:        "parses empty response",
            fixtureFile: "empty_response.json",
            expectedLen: 0,
            validateFunc: func(t *testing.T, resp APIResponse) {
                if resp.Data != nil && len(resp.Data) > 0 {
                    t.Error("expected empty data")
                }
            },
        },
        {
            name:        "parses error response",
            fixtureFile: "error_response.json",
            expectedLen: 0,
            validateFunc: func(t *testing.T, resp APIResponse) {
                if resp.Error == "" {
                    t.Error("expected error message")
                }
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            response := loadFixture[APIResponse](t, tt.fixtureFile)

            if len(response.Data) != tt.expectedLen {
                t.Errorf("got %d items, want %d", len(response.Data), tt.expectedLen)
            }

            if tt.validateFunc != nil {
                tt.validateFunc(t, response)
            }
        })
    }
}
```

## Best Practices Summary

Here is a summary of best practices for table-driven tests in Go:

1. **Always use descriptive test case names** that explain the scenario being tested.

2. **Include both positive and negative test cases** to ensure complete coverage.

3. **Use t.Run for subtests** to get better test output and the ability to run specific cases.

4. **Capture loop variables** when using parallel tests to avoid race conditions.

5. **Create helper functions** for common assertions and setup/teardown operations.

6. **Use t.Helper()** in helper functions for accurate error reporting.

7. **Design test case structs carefully** with clear field names and appropriate types.

8. **Test error cases thoroughly** including error types, messages, and wrapped errors.

9. **Keep test data close to tests** using struct literals or fixture files in a testdata directory.

10. **Run tests in parallel** when possible to speed up the test suite.

## Conclusion

Table-driven tests are a fundamental pattern in Go that leads to more maintainable, readable, and comprehensive test suites. By following the patterns and practices outlined in this guide, you can write tests that are easy to understand, extend, and maintain.

The key benefits of table-driven testing include reduced code duplication, clear test case organization, and the ability to easily add new test scenarios. Combined with Go's built-in testing features like subtests and parallel execution, table-driven tests provide a powerful foundation for testing any Go application.

Start applying these patterns in your next Go project, and you will see immediate improvements in your test quality and developer experience. Remember that good tests are an investment that pays dividends throughout the lifetime of your codebase.
