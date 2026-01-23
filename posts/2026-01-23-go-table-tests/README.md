# How to Write Table-Driven Tests in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Testing, Table-Driven Tests, Unit Tests, TDD

Description: Learn how to write effective table-driven tests in Go. This pattern makes tests more readable, maintainable, and comprehensive by defining test cases as data.

---

Table-driven tests are a Go testing pattern where test cases are defined as a slice of structs. Each struct represents a test case with inputs and expected outputs. This approach reduces code duplication and makes it easy to add new test cases.

---

## Basic Table-Driven Test

```go
package math

import "testing"

func Add(a, b int) int {
    return a + b
}

func TestAdd(t *testing.T) {
    // Define test cases as a slice of structs
    tests := []struct {
        name     string
        a        int
        b        int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"zeros", 0, 0, 0},
        {"zero and positive", 0, 5, 5},
    }
    
    // Run each test case
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", 
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

Run with:
```bash
go test -v
```

**Output:**
```
=== RUN   TestAdd
=== RUN   TestAdd/positive_numbers
=== RUN   TestAdd/negative_numbers
=== RUN   TestAdd/mixed_signs
=== RUN   TestAdd/zeros
=== RUN   TestAdd/zero_and_positive
--- PASS: TestAdd (0.00s)
    --- PASS: TestAdd/positive_numbers (0.00s)
    --- PASS: TestAdd/negative_numbers (0.00s)
    --- PASS: TestAdd/mixed_signs (0.00s)
    --- PASS: TestAdd/zeros (0.00s)
    --- PASS: TestAdd/zero_and_positive (0.00s)
PASS
```

---

## Testing Functions That Return Errors

```go
package user

import (
    "errors"
    "testing"
)

var ErrInvalidEmail = errors.New("invalid email format")

func ValidateEmail(email string) error {
    if len(email) == 0 {
        return errors.New("email cannot be empty")
    }
    if !strings.Contains(email, "@") {
        return ErrInvalidEmail
    }
    return nil
}

func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr error  // nil means no error expected
    }{
        {
            name:    "valid email",
            email:   "user@example.com",
            wantErr: nil,
        },
        {
            name:    "empty email",
            email:   "",
            wantErr: errors.New("email cannot be empty"),
        },
        {
            name:    "missing at sign",
            email:   "userexample.com",
            wantErr: ErrInvalidEmail,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            
            // Check error presence
            if (err != nil) != (tt.wantErr != nil) {
                t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", 
                    tt.email, err, tt.wantErr)
                return
            }
            
            // Check specific error
            if tt.wantErr != nil && !errors.Is(err, tt.wantErr) {
                // For non-sentinel errors, compare messages
                if err.Error() != tt.wantErr.Error() {
                    t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", 
                        tt.email, err, tt.wantErr)
                }
            }
        })
    }
}
```

---

## Testing Multiple Return Values

```go
package parser

import "testing"

func ParseKeyValue(s string) (key, value string, ok bool) {
    idx := strings.Index(s, "=")
    if idx == -1 {
        return "", "", false
    }
    return s[:idx], s[idx+1:], true
}

func TestParseKeyValue(t *testing.T) {
    tests := []struct {
        name      string
        input     string
        wantKey   string
        wantValue string
        wantOK    bool
    }{
        {
            name:      "simple key value",
            input:     "name=John",
            wantKey:   "name",
            wantValue: "John",
            wantOK:    true,
        },
        {
            name:      "empty value",
            input:     "name=",
            wantKey:   "name",
            wantValue: "",
            wantOK:    true,
        },
        {
            name:      "value with equals",
            input:     "expr=a=b",
            wantKey:   "expr",
            wantValue: "a=b",
            wantOK:    true,
        },
        {
            name:      "no equals sign",
            input:     "novalue",
            wantKey:   "",
            wantValue: "",
            wantOK:    false,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            key, value, ok := ParseKeyValue(tt.input)
            
            if key != tt.wantKey {
                t.Errorf("key = %q, want %q", key, tt.wantKey)
            }
            if value != tt.wantValue {
                t.Errorf("value = %q, want %q", value, tt.wantValue)
            }
            if ok != tt.wantOK {
                t.Errorf("ok = %v, want %v", ok, tt.wantOK)
            }
        })
    }
}
```

---

## Using Maps for Test Cases

For simple tests without subtests:

```go
func TestIsValidPort(t *testing.T) {
    tests := map[string]struct {
        port int
        want bool
    }{
        "valid low port":      {80, true},
        "valid high port":     {8080, true},
        "max valid port":      {65535, true},
        "zero port":           {0, false},
        "negative port":       {-1, false},
        "too high port":       {65536, false},
    }
    
    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            got := IsValidPort(tc.port)
            if got != tc.want {
                t.Errorf("IsValidPort(%d) = %v, want %v", tc.port, got, tc.want)
            }
        })
    }
}
```

---

## Parallel Table Tests

Run test cases in parallel for faster execution:

```go
func TestSlowOperation(t *testing.T) {
    tests := []struct {
        name  string
        input int
        want  int
    }{
        {"case1", 1, 2},
        {"case2", 2, 4},
        {"case3", 3, 6},
    }
    
    for _, tt := range tests {
        tt := tt  // Capture range variable (important before Go 1.22!)
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()  // Mark as parallel
            
            result := SlowOperation(tt.input)
            if result != tt.want {
                t.Errorf("got %d, want %d", result, tt.want)
            }
        })
    }
}
```

**Note:** In Go 1.22+, loop variables are scoped per iteration, so the `tt := tt` line is not needed.

---

## Testing with Fixtures

```go
func TestProcessFile(t *testing.T) {
    tests := []struct {
        name        string
        inputFile   string
        wantOutput  string
        wantErr     bool
    }{
        {
            name:       "valid JSON",
            inputFile:  "testdata/valid.json",
            wantOutput: "testdata/valid_expected.txt",
            wantErr:    false,
        },
        {
            name:       "invalid JSON",
            inputFile:  "testdata/invalid.json",
            wantOutput: "",
            wantErr:    true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := ProcessFile(tt.inputFile)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            
            if tt.wantOutput != "" {
                expected, _ := os.ReadFile(tt.wantOutput)
                if result != string(expected) {
                    t.Errorf("output mismatch")
                }
            }
        })
    }
}
```

---

## Setup and Teardown Per Test

```go
func TestDatabase(t *testing.T) {
    tests := []struct {
        name   string
        setup  func(db *DB)  // Optional setup function
        query  string
        want   int
    }{
        {
            name: "count empty table",
            setup: nil,
            query: "SELECT COUNT(*) FROM users",
            want:  0,
        },
        {
            name: "count with data",
            setup: func(db *DB) {
                db.Exec("INSERT INTO users (name) VALUES ('Alice')")
                db.Exec("INSERT INTO users (name) VALUES ('Bob')")
            },
            query: "SELECT COUNT(*) FROM users",
            want:  2,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            db := setupTestDB(t)
            defer teardownTestDB(t, db)
            
            if tt.setup != nil {
                tt.setup(db)
            }
            
            // Test
            var count int
            db.QueryRow(tt.query).Scan(&count)
            
            if count != tt.want {
                t.Errorf("got %d, want %d", count, tt.want)
            }
        })
    }
}
```

---

## Custom Check Functions

For complex assertions, use helper functions:

```go
func TestHTTPHandler(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        path       string
        body       string
        wantStatus int
        wantBody   string
        checkFunc  func(t *testing.T, resp *http.Response)
    }{
        {
            name:       "get users",
            method:     "GET",
            path:       "/users",
            wantStatus: 200,
            checkFunc: func(t *testing.T, resp *http.Response) {
                // Custom validation
                var users []User
                json.NewDecoder(resp.Body).Decode(&users)
                if len(users) == 0 {
                    t.Error("expected users in response")
                }
            },
        },
        {
            name:       "create user",
            method:     "POST",
            path:       "/users",
            body:       `{"name": "Alice"}`,
            wantStatus: 201,
            checkFunc: func(t *testing.T, resp *http.Response) {
                loc := resp.Header.Get("Location")
                if loc == "" {
                    t.Error("expected Location header")
                }
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
            rec := httptest.NewRecorder()
            
            handler.ServeHTTP(rec, req)
            resp := rec.Result()
            
            if resp.StatusCode != tt.wantStatus {
                t.Errorf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
            }
            
            if tt.checkFunc != nil {
                tt.checkFunc(t, resp)
            }
        })
    }
}
```

---

## Test Case Generation

Generate test cases programmatically:

```go
func TestFibonacci(t *testing.T) {
    // Known Fibonacci numbers
    expected := []int{0, 1, 1, 2, 3, 5, 8, 13, 21, 34}
    
    // Generate test cases
    tests := make([]struct {
        n    int
        want int
    }, len(expected))
    
    for i, want := range expected {
        tests[i] = struct {
            n    int
            want int
        }{i, want}
    }
    
    for _, tt := range tests {
        t.Run(fmt.Sprintf("fib(%d)", tt.n), func(t *testing.T) {
            got := Fibonacci(tt.n)
            if got != tt.want {
                t.Errorf("Fibonacci(%d) = %d, want %d", tt.n, got, tt.want)
            }
        })
    }
}
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Basic table | Simple input/output testing |
| Named struct fields | Complex test cases with many fields |
| Map-based | When order doesn't matter |
| Parallel | Independent, slow tests |
| With fixtures | File-based test data |
| Custom check functions | Complex validation logic |

**Best Practices:**

1. Use descriptive test case names
2. Test edge cases: zero values, empty strings, nil
3. Include both success and error cases
4. Keep test data close to test logic
5. Use `t.Run` for subtests
6. Use `t.Parallel()` for independent tests
7. Use helper functions for common assertions

---

*Testing complex Go applications? [OneUptime](https://oneuptime.com) provides test monitoring and performance tracking to ensure your test suites remain fast and reliable.*
