# How to Use Fuzzing in Go for Security Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Fuzzing, Security, Testing, Input Validation

Description: Use Go's built-in fuzz testing to find security vulnerabilities and edge cases in input validation, parsers, and data processing code.

---

## Introduction

Fuzzing is a powerful automated testing technique that feeds random or semi-random data to your program to find bugs, crashes, and security vulnerabilities. Unlike traditional unit tests that check specific cases you anticipate, fuzzing explores the input space systematically to find edge cases you might never think of.

Go 1.18 introduced native fuzzing support directly into the standard library and toolchain, making it easier than ever to add fuzz testing to your security testing workflow. This guide covers everything you need to know about using Go's built-in fuzzing capabilities to harden your code against security vulnerabilities.

## Why Fuzzing Matters for Security

Security vulnerabilities often lurk in edge cases that developers do not anticipate:

- **Buffer overflows** from unexpectedly long inputs
- **Denial of service** from malformed data causing infinite loops
- **Injection attacks** exploiting improperly validated input
- **Memory corruption** from unusual character combinations
- **Panic conditions** from unexpected nil values or type assertions

Traditional testing covers known scenarios, but attackers are creative. Fuzzing helps you discover the unknown unknowns in your code.

### Benefits of Fuzzing

1. **Automated discovery** - Find bugs without manually writing test cases for every edge case
2. **Coverage-guided** - Go's fuzzer uses code coverage to guide input generation toward unexplored paths
3. **Reproducible** - Found inputs are saved as test cases you can debug and add to your test suite
4. **Continuous** - Run fuzzing continuously in CI/CD to catch regressions

## Understanding Go's Native Fuzzing

Go 1.18+ includes fuzzing as a first-class citizen in the testing package. The fuzzer intelligently mutates inputs based on code coverage, prioritizing mutations that explore new code paths.

### How Go Fuzzing Works

The Go fuzzer operates in two phases:

1. **Seed corpus processing** - Runs your fuzz test with each seed input to establish baseline coverage
2. **Mutation-based fuzzing** - Generates new inputs by mutating seeds and existing interesting inputs

The fuzzer tracks code coverage and keeps inputs that discover new execution paths. This coverage-guided approach is far more effective than purely random fuzzing.

## Writing Your First Fuzz Test

Fuzz tests in Go follow a specific naming convention and structure. They must start with `Fuzz` and take a `*testing.F` parameter.

### Basic Fuzz Test Structure

The following example demonstrates a simple fuzz test for a URL parser function:

```go
package urlparser

import (
    "net/url"
    "testing"
)

// FuzzParseURL tests the URL parsing function with random inputs.
// The fuzzer will generate various string inputs to find edge cases.
func FuzzParseURL(f *testing.F) {
    // Add seed corpus entries - known interesting inputs
    f.Add("https://example.com")
    f.Add("http://localhost:8080/path?query=value")
    f.Add("")
    f.Add("://invalid")
    f.Add("http://user:pass@host.com:8080/path")

    // Define the fuzz target function
    f.Fuzz(func(t *testing.T, input string) {
        // Parse the URL - we want to ensure this never panics
        parsed, err := url.Parse(input)

        // If parsing succeeds, verify round-trip consistency
        if err == nil && parsed != nil {
            // Re-parse the stringified URL
            reparsed, err2 := url.Parse(parsed.String())
            if err2 != nil {
                t.Errorf("round-trip failed: %v -> %v", input, err2)
            }

            // Check that scheme is preserved
            if reparsed != nil && parsed.Scheme != reparsed.Scheme {
                t.Errorf("scheme mismatch: %s vs %s", parsed.Scheme, reparsed.Scheme)
            }
        }
    })
}
```

### Fuzz Test Naming Conventions

Follow these conventions for fuzz tests:

```go
// Fuzz test function names must start with "Fuzz"
func FuzzFunctionName(f *testing.F) {
    // Test implementation
}

// File names typically end with _test.go like regular tests
// Example: parser_fuzz_test.go, validator_fuzz_test.go
```

## Seed Corpus Management

The seed corpus is a collection of initial inputs that the fuzzer uses as starting points for mutation. Good seed inputs significantly improve fuzzing effectiveness.

### Adding Seeds Programmatically

Use f.Add() to provide seed inputs directly in your test code:

```go
package jsonparser

import (
    "encoding/json"
    "testing"
)

// FuzzJSONUnmarshal tests JSON parsing with various input patterns.
// Seeds cover different JSON structures to guide the fuzzer.
func FuzzJSONUnmarshal(f *testing.F) {
    // Add various JSON structure types as seeds
    f.Add([]byte(`{}`))
    f.Add([]byte(`{"key": "value"}`))
    f.Add([]byte(`{"nested": {"deep": true}}`))
    f.Add([]byte(`[1, 2, 3]`))
    f.Add([]byte(`{"array": [1, "mixed", null]}`))
    f.Add([]byte(`null`))
    f.Add([]byte(`"string"`))
    f.Add([]byte(`123`))
    f.Add([]byte(`true`))

    // Add edge cases
    f.Add([]byte(``))                          // Empty input
    f.Add([]byte(`{`))                         // Incomplete JSON
    f.Add([]byte(`{"unicode": "\u0000"}`))     // Null character
    f.Add([]byte(`{"large": 1e308}`))          // Large number

    f.Fuzz(func(t *testing.T, data []byte) {
        var result interface{}

        // Attempt to unmarshal - should not panic
        err := json.Unmarshal(data, &result)

        // If unmarshal succeeds, verify we can re-marshal
        if err == nil {
            remarshaled, err2 := json.Marshal(result)
            if err2 != nil {
                t.Errorf("marshal failed after successful unmarshal: %v", err2)
            }

            // Verify the remarshaled data can be unmarshaled again
            var result2 interface{}
            if err3 := json.Unmarshal(remarshaled, &result2); err3 != nil {
                t.Errorf("round-trip unmarshal failed: %v", err3)
            }
        }
    })
}
```

### Using Seed Corpus Files

Go also supports seed corpus files stored in the `testdata/fuzz/<FuzzTestName>` directory:

```
mypackage/
    parser.go
    parser_test.go
    testdata/
        fuzz/
            FuzzParseInput/
                seed1
                seed2
                interesting_edge_case
```

Each file in the seed directory contains a serialized input that Go can read and use as a seed.

### Generating Corpus from Real Data

Create seeds from production data samples for more realistic fuzzing:

```go
package api

import (
    "os"
    "path/filepath"
    "testing"
)

// FuzzAPIRequest tests API request parsing with production-like samples.
func FuzzAPIRequest(f *testing.F) {
    // Load seed corpus from sample request files
    samples, err := filepath.Glob("testdata/sample_requests/*.json")
    if err == nil {
        for _, sample := range samples {
            data, err := os.ReadFile(sample)
            if err == nil {
                f.Add(data)
            }
        }
    }

    // Add some edge cases manually
    f.Add([]byte(`{}`))
    f.Add([]byte(`{"action": "", "payload": null}`))

    f.Fuzz(func(t *testing.T, data []byte) {
        // Parse and validate the request
        req, err := ParseAPIRequest(data)
        if err != nil {
            return // Invalid input is expected
        }

        // If parsing succeeds, validation should work
        if err := req.Validate(); err != nil {
            t.Errorf("valid parse but invalid request: %v", err)
        }
    })
}
```

## Running Fuzz Tests

Go provides several ways to run fuzz tests with different options.

### Basic Fuzzing Commands

Run a specific fuzz test for a duration:

```bash
# Run FuzzParseURL for 30 seconds
go test -fuzz=FuzzParseURL -fuzztime=30s

# Run all fuzz tests in a package for 1 minute each
go test -fuzz=. -fuzztime=1m

# Run fuzzing with verbose output
go test -fuzz=FuzzParseURL -fuzztime=30s -v
```

### Controlling Fuzz Test Behavior

Use additional flags to control fuzzing behavior:

```bash
# Limit parallel fuzzing workers
go test -fuzz=FuzzParseURL -fuzztime=1m -parallel=4

# Use a specific seed corpus directory
go test -fuzz=FuzzParseURL -fuzztime=1m -test.fuzzcachedir=/tmp/fuzz-cache

# Run only the seed corpus without generating new inputs (for CI)
go test -run=FuzzParseURL

# Keep running indefinitely until interrupted
go test -fuzz=FuzzParseURL -fuzztime=0
```

### Running Fuzz Tests in CI/CD

For CI pipelines, run seeds as regular tests and schedule longer fuzzing sessions:

```yaml
# .github/workflows/fuzz.yml
name: Fuzz Testing

on:
  schedule:
    # Run fuzzing nightly
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run fuzz tests
        run: |
          # Run each fuzz test for 5 minutes
          go test -fuzz=FuzzParseURL -fuzztime=5m ./...
          go test -fuzz=FuzzJSONUnmarshal -fuzztime=5m ./...

      - name: Upload crash artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: fuzz-crashes
          path: testdata/fuzz/*/
```

## Fuzzing Different Data Types

Go's fuzzer supports multiple input types for different testing scenarios.

### Fuzzing with Multiple Parameters

Fuzz tests can take multiple parameters of different types:

```go
package crypto

import (
    "bytes"
    "crypto/aes"
    "crypto/cipher"
    "testing"
)

// FuzzEncryptDecrypt tests encryption round-trip with various inputs.
// Uses multiple parameters: key material and plaintext data.
func FuzzEncryptDecrypt(f *testing.F) {
    // Add seeds with different key and data combinations
    f.Add([]byte("0123456789abcdef"), []byte("secret message"))
    f.Add([]byte("16-byte-key-here"), []byte(""))
    f.Add([]byte("another-16b-key!"), []byte("x"))

    f.Fuzz(func(t *testing.T, keyMaterial, plaintext []byte) {
        // AES requires 16, 24, or 32 byte keys
        if len(keyMaterial) < 16 {
            return
        }
        key := keyMaterial[:16]

        // Create cipher block
        block, err := aes.NewCipher(key)
        if err != nil {
            return
        }

        // Pad plaintext to block size
        padded := pkcs7Pad(plaintext, aes.BlockSize)

        // Encrypt
        encrypted := make([]byte, aes.BlockSize+len(padded))
        iv := encrypted[:aes.BlockSize]
        for i := range iv {
            iv[i] = byte(i) // Deterministic IV for testing
        }

        mode := cipher.NewCBCEncrypter(block, iv)
        mode.CryptBlocks(encrypted[aes.BlockSize:], padded)

        // Decrypt
        decrypted := make([]byte, len(padded))
        mode2 := cipher.NewCBCDecrypter(block, iv)
        mode2.CryptBlocks(decrypted, encrypted[aes.BlockSize:])

        // Unpad and verify
        unpadded, err := pkcs7Unpad(decrypted)
        if err != nil {
            t.Errorf("unpad failed: %v", err)
            return
        }

        if !bytes.Equal(plaintext, unpadded) {
            t.Errorf("round-trip failed: got %q, want %q", unpadded, plaintext)
        }
    })
}

// pkcs7Pad pads data to block size using PKCS#7 padding
func pkcs7Pad(data []byte, blockSize int) []byte {
    padding := blockSize - len(data)%blockSize
    padtext := bytes.Repeat([]byte{byte(padding)}, padding)
    return append(data, padtext...)
}

// pkcs7Unpad removes PKCS#7 padding
func pkcs7Unpad(data []byte) ([]byte, error) {
    if len(data) == 0 {
        return nil, nil
    }
    padding := int(data[len(data)-1])
    if padding > len(data) {
        return data, nil
    }
    return data[:len(data)-padding], nil
}
```

### Supported Fuzz Types

Go's fuzzer supports these parameter types:

```go
// All supported types for fuzz parameters
func FuzzMultipleTypes(f *testing.F) {
    // String input
    f.Add("test string")

    // Byte slice input
    f.Add([]byte("byte data"))

    // Integer types
    f.Add(int(42))
    f.Add(int8(1))
    f.Add(int16(100))
    f.Add(int32(1000))
    f.Add(int64(10000))

    // Unsigned integer types
    f.Add(uint(42))
    f.Add(uint8(1))
    f.Add(uint16(100))
    f.Add(uint32(1000))
    f.Add(uint64(10000))

    // Floating point types
    f.Add(float32(3.14))
    f.Add(float64(2.718))

    // Boolean type
    f.Add(true)

    // Rune type
    f.Add('a')

    f.Fuzz(func(t *testing.T, s string, b []byte, i int, f32 float32) {
        // Test implementation
    })
}
```

## Fuzzing Parsers and Validators

Parsers and validators are prime targets for fuzzing because they handle untrusted input.

### Fuzzing a Custom Parser

The following example fuzzes a configuration file parser:

```go
package config

import (
    "strings"
    "testing"
)

// Config represents a parsed configuration
type Config struct {
    Host     string
    Port     int
    Debug    bool
    Tags     []string
    Settings map[string]string
}

// ParseConfig parses a configuration string in a custom format.
// Format: key=value lines, with # comments
func ParseConfig(input string) (*Config, error) {
    // Implementation details omitted for brevity
    return parseConfigImpl(input)
}

// FuzzParseConfig tests the configuration parser with random inputs.
// This helps find parsing edge cases and potential panics.
func FuzzParseConfig(f *testing.F) {
    // Add realistic configuration samples as seeds
    f.Add(`
host=localhost
port=8080
debug=true
tags=web,api,production
settings.timeout=30
settings.retry=3
`)

    f.Add(`# Comment line
host=example.com
port=443
`)

    // Edge cases
    f.Add("")
    f.Add("=")
    f.Add("key=")
    f.Add("=value")
    f.Add("key=value=extra")
    f.Add("host=localhost\x00port=8080") // Null byte
    f.Add(strings.Repeat("a", 10000) + "=value") // Long key
    f.Add("key=" + strings.Repeat("b", 100000)) // Long value

    f.Fuzz(func(t *testing.T, input string) {
        // Parse should never panic
        config, err := ParseConfig(input)

        if err != nil {
            return // Invalid input is expected
        }

        // If parsing succeeds, verify invariants
        if config == nil {
            t.Error("nil config with nil error")
            return
        }

        // Port should be in valid range if set
        if config.Port < 0 || config.Port > 65535 {
            t.Errorf("invalid port: %d", config.Port)
        }

        // Host should not contain newlines
        if strings.ContainsAny(config.Host, "\n\r") {
            t.Errorf("host contains newlines: %q", config.Host)
        }
    })
}
```

### Fuzzing Input Validators

Fuzz validators to ensure they correctly reject malicious input:

```go
package validation

import (
    "regexp"
    "testing"
    "unicode"
)

// ValidateUsername checks if a username meets security requirements.
// Returns nil if valid, error describing the violation otherwise.
func ValidateUsername(username string) error {
    // Implementation validates length, characters, etc.
    return validateUsernameImpl(username)
}

// ValidateEmail checks if an email address is valid.
func ValidateEmail(email string) error {
    return validateEmailImpl(email)
}

// FuzzValidateUsername tests username validation with random inputs.
func FuzzValidateUsername(f *testing.F) {
    // Valid usernames
    f.Add("johndoe")
    f.Add("user123")
    f.Add("valid_user")
    f.Add("User-Name")

    // Invalid usernames
    f.Add("")
    f.Add("ab") // Too short
    f.Add(string(make([]byte, 1000))) // Too long
    f.Add("user@name") // Invalid character
    f.Add("user\x00name") // Null byte
    f.Add("<script>") // XSS attempt
    f.Add("admin' OR '1'='1") // SQL injection attempt
    f.Add("../../../etc/passwd") // Path traversal

    f.Fuzz(func(t *testing.T, username string) {
        err := ValidateUsername(username)

        // If validation passes, verify the username is actually safe
        if err == nil {
            // Check length constraints
            if len(username) < 3 || len(username) > 50 {
                t.Errorf("invalid length %d passed validation", len(username))
            }

            // Check for dangerous characters
            for _, r := range username {
                if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '_' && r != '-' {
                    t.Errorf("dangerous character %q passed validation", r)
                }
            }

            // Check for null bytes
            for i := 0; i < len(username); i++ {
                if username[i] == 0 {
                    t.Error("null byte passed validation")
                }
            }
        }
    })
}

// FuzzValidateEmail tests email validation against various attack patterns.
func FuzzValidateEmail(f *testing.F) {
    // Valid emails
    f.Add("user@example.com")
    f.Add("user.name@domain.org")
    f.Add("user+tag@example.com")

    // Invalid emails
    f.Add("")
    f.Add("@")
    f.Add("user@")
    f.Add("@domain.com")
    f.Add("user@@domain.com")
    f.Add("user@domain..com")

    // Attack patterns
    f.Add("user@domain.com\nBcc: victim@target.com") // Header injection
    f.Add("user@[127.0.0.1]") // IP literal
    f.Add("\"very.unusual.@.unusual.com\"@example.com") // Quoted local

    f.Fuzz(func(t *testing.T, email string) {
        err := ValidateEmail(email)

        if err == nil {
            // Basic structure check
            emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
            if !emailRegex.MatchString(email) {
                t.Errorf("invalid email structure passed: %q", email)
            }

            // Check for header injection
            if regexp.MustCompile(`[\r\n]`).MatchString(email) {
                t.Errorf("header injection attempt passed: %q", email)
            }
        }
    })
}
```

## Analyzing and Fixing Found Issues

When the fuzzer finds a crash or failure, it saves the input to the corpus for debugging.

### Understanding Fuzzer Output

When a bug is found, the fuzzer outputs:

```
--- FAIL: FuzzParseConfig (0.15s)
    --- FAIL: FuzzParseConfig (0.00s)
        parser_fuzz_test.go:45: panic: runtime error: index out of range [5] with length 3

    Failing input written to testdata/fuzz/FuzzParseConfig/8a3f2b1c

        To re-run:
        go test -run=FuzzParseConfig/8a3f2b1c
```

### Debugging Failed Cases

Use the provided failing input to debug the issue:

```go
package config

import (
    "testing"
)

// TestParseConfigCrash reproduces a specific crash found by fuzzing.
// This test ensures the fix works and prevents regression.
func TestParseConfigCrash(t *testing.T) {
    // Reproduce the exact input that caused the crash
    crashInput := "key=value\n=\nother=data"

    // This should not panic after the fix
    config, err := ParseConfig(crashInput)

    // Verify the fix handles this case correctly
    if err == nil {
        t.Log("Parser accepted malformed input")
    } else {
        t.Logf("Parser correctly rejected input: %v", err)
    }

    // Ensure no panic occurred
    _ = config
}
```

### Fixing Common Vulnerability Patterns

Example fixes for common issues found by fuzzing:

```go
package parser

import (
    "errors"
    "strings"
)

// BEFORE: Vulnerable to index out of bounds
func parseLineBefore(line string) (string, string, error) {
    parts := strings.Split(line, "=")
    // BUG: Panics if line doesn't contain "="
    return parts[0], parts[1], nil
}

// AFTER: Fixed to handle missing delimiter
func parseLineAfter(line string) (string, string, error) {
    idx := strings.Index(line, "=")
    if idx == -1 {
        return "", "", errors.New("missing delimiter")
    }
    if idx == 0 {
        return "", "", errors.New("empty key")
    }
    return line[:idx], line[idx+1:], nil
}

// BEFORE: Vulnerable to stack overflow with deeply nested input
func parseNestedBefore(input string, depth int) (interface{}, error) {
    // BUG: No depth limit, recursive calls can overflow stack
    if input[0] == '{' {
        return parseNestedBefore(input[1:], depth+1)
    }
    return input, nil
}

// AFTER: Fixed with depth limit
const maxDepth = 100

func parseNestedAfter(input string, depth int) (interface{}, error) {
    if depth > maxDepth {
        return nil, errors.New("maximum nesting depth exceeded")
    }
    if len(input) == 0 {
        return nil, errors.New("unexpected end of input")
    }
    if input[0] == '{' {
        return parseNestedAfter(input[1:], depth+1)
    }
    return input, nil
}

// BEFORE: Vulnerable to large allocation DoS
func processDataBefore(sizeHint int, data []byte) []byte {
    // BUG: Attacker can cause huge allocation with crafted sizeHint
    result := make([]byte, sizeHint)
    copy(result, data)
    return result
}

// AFTER: Fixed with size limits
const maxAllocation = 10 * 1024 * 1024 // 10MB

func processDataAfter(sizeHint int, data []byte) ([]byte, error) {
    if sizeHint < 0 || sizeHint > maxAllocation {
        return nil, errors.New("invalid size hint")
    }
    if sizeHint < len(data) {
        sizeHint = len(data)
    }
    result := make([]byte, sizeHint)
    copy(result, data)
    return result, nil
}
```

## Advanced Fuzzing Patterns

### Differential Fuzzing

Compare two implementations to find discrepancies:

```go
package encoding

import (
    "bytes"
    "encoding/json"
    "testing"
)

// CustomJSONMarshal is our custom implementation we want to verify
func CustomJSONMarshal(v interface{}) ([]byte, error) {
    // Custom implementation
    return customMarshalImpl(v)
}

// FuzzDifferentialJSON compares custom JSON implementation against stdlib.
// Any difference in behavior indicates a potential bug.
func FuzzDifferentialJSON(f *testing.F) {
    f.Add([]byte(`{"key": "value"}`))
    f.Add([]byte(`[1, 2, 3]`))
    f.Add([]byte(`null`))

    f.Fuzz(func(t *testing.T, input []byte) {
        // Parse with standard library
        var stdResult interface{}
        stdErr := json.Unmarshal(input, &stdResult)

        // Parse with custom implementation
        var customResult interface{}
        customErr := CustomJSONUnmarshal(input, &customResult)

        // Compare error conditions
        if (stdErr == nil) != (customErr == nil) {
            t.Errorf("error mismatch: stdlib=%v, custom=%v", stdErr, customErr)
            return
        }

        if stdErr != nil {
            return // Both failed, which is fine
        }

        // Compare results by re-marshaling
        stdBytes, _ := json.Marshal(stdResult)
        customBytes, _ := json.Marshal(customResult)

        if !bytes.Equal(stdBytes, customBytes) {
            t.Errorf("result mismatch:\nstdlib:  %s\ncustom: %s", stdBytes, customBytes)
        }
    })
}
```

### Property-Based Fuzzing

Verify that invariants hold for all inputs:

```go
package crypto

import (
    "bytes"
    "testing"
)

// FuzzCompressionRoundTrip verifies compression properties.
func FuzzCompressionRoundTrip(f *testing.F) {
    f.Add([]byte("hello world"))
    f.Add([]byte(""))
    f.Add(bytes.Repeat([]byte("a"), 10000))

    f.Fuzz(func(t *testing.T, original []byte) {
        // Property 1: Compression should not panic
        compressed, err := Compress(original)
        if err != nil {
            return // Some inputs may not be compressible
        }

        // Property 2: Decompression should recover original
        decompressed, err := Decompress(compressed)
        if err != nil {
            t.Errorf("decompression failed: %v", err)
            return
        }

        if !bytes.Equal(original, decompressed) {
            t.Errorf("round-trip failed: got %d bytes, want %d bytes",
                len(decompressed), len(original))
        }

        // Property 3: Compressing twice gives same result
        compressed2, err := Compress(original)
        if err != nil {
            t.Errorf("second compression failed: %v", err)
            return
        }

        if !bytes.Equal(compressed, compressed2) {
            t.Error("compression is not deterministic")
        }
    })
}
```

### Stateful Fuzzing

Test state machines and protocols:

```go
package protocol

import (
    "testing"
)

// Session represents a stateful session
type Session struct {
    state    string
    msgCount int
}

// NewSession creates a new session
func NewSession() *Session {
    return &Session{state: "init"}
}

// ProcessMessage handles a message in the current state
func (s *Session) ProcessMessage(msg []byte) error {
    return s.processMessageImpl(msg)
}

// FuzzSessionProtocol tests session state machine with message sequences.
func FuzzSessionProtocol(f *testing.F) {
    // Add message sequence seeds
    f.Add([]byte("HELLO"), []byte("AUTH user pass"), []byte("DATA test"))
    f.Add([]byte("HELLO"), []byte("QUIT"))
    f.Add([]byte(""), []byte("HELLO"), []byte(""))

    f.Fuzz(func(t *testing.T, msg1, msg2, msg3 []byte) {
        session := NewSession()

        // Process message sequence
        messages := [][]byte{msg1, msg2, msg3}
        for i, msg := range messages {
            err := session.ProcessMessage(msg)
            if err != nil {
                // Error is fine, but state should be consistent
                if session.state == "" {
                    t.Errorf("invalid state after message %d error", i)
                }
                break
            }
        }

        // Verify session invariants
        if session.msgCount < 0 {
            t.Error("negative message count")
        }

        validStates := map[string]bool{
            "init": true, "authenticated": true, "data": true, "closed": true,
        }
        if !validStates[session.state] {
            t.Errorf("invalid session state: %q", session.state)
        }
    })
}
```

## Best Practices for Security Fuzzing

### 1. Fuzz at Trust Boundaries

Focus fuzzing on code that processes untrusted input:

```go
// Priority targets for fuzzing:
// - HTTP request handlers
// - File parsers
// - Network protocol handlers
// - Deserialization functions
// - Authentication/authorization code
// - Cryptographic operations

func FuzzHTTPHandler(f *testing.F) {
    f.Add([]byte("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"))
    f.Add([]byte("POST /api HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{}"))

    f.Fuzz(func(t *testing.T, request []byte) {
        // Test HTTP parsing at the trust boundary
        req, err := ParseHTTPRequest(request)
        if err != nil {
            return
        }

        // Validate parsed request
        if req.Method == "" {
            t.Error("empty method in parsed request")
        }
    })
}
```

### 2. Check for Resource Exhaustion

Verify that inputs cannot cause excessive resource usage:

```go
package parser

import (
    "context"
    "testing"
    "time"
)

// FuzzWithTimeout ensures parsing completes in reasonable time.
func FuzzWithTimeout(f *testing.F) {
    f.Add([]byte("normal input"))
    f.Add([]byte("a]]]]]]]]]]]]]]]]]]]]]")) // Potential regex DoS

    f.Fuzz(func(t *testing.T, input []byte) {
        ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
        defer cancel()

        done := make(chan struct{})
        var parseErr error

        go func() {
            defer close(done)
            _, parseErr = ParseWithContext(ctx, input)
        }()

        select {
        case <-done:
            // Parsing completed in time
        case <-ctx.Done():
            t.Error("parsing timed out - potential DoS vulnerability")
        }
    })
}
```

### 3. Memory Safety Checks

Use memory analysis with fuzzing:

```bash
# Run fuzzing with address sanitizer (requires CGO)
CGO_ENABLED=1 go test -fuzz=FuzzParser -fuzztime=5m -race

# Run fuzzing with memory sanitizer
CGO_ENABLED=1 CC=clang go test -fuzz=FuzzParser -fuzztime=5m -msan
```

### 4. Integrate with Continuous Fuzzing

Set up OSS-Fuzz or ClusterFuzz for continuous coverage:

```go
// +build gofuzz

package parser

// FuzzParser is compatible with OSS-Fuzz infrastructure
func FuzzParser(data []byte) int {
    _, err := Parse(data)
    if err != nil {
        return 0
    }
    return 1
}
```

## Conclusion

Go's built-in fuzzing support provides a powerful tool for finding security vulnerabilities before attackers do. By integrating fuzz testing into your development workflow, you can:

- **Discover edge cases** that manual testing would miss
- **Harden input validation** against malicious inputs
- **Prevent crashes** from unexpected data
- **Build confidence** in your security-critical code

Start by identifying your trust boundaries, writing fuzz tests for your parsers and validators, and running fuzzing regularly as part of your CI/CD pipeline. The bugs you find might otherwise have become security vulnerabilities in production.

## Additional Resources

- [Go Fuzzing Documentation](https://go.dev/doc/fuzz/)
- [Go Security Best Practices](https://go.dev/doc/security/best-practices)
- [OSS-Fuzz for Go Projects](https://google.github.io/oss-fuzz/getting-started/new-project-guide/go-lang/)
- [Effective Go Testing](https://go.dev/doc/effective_go#testing)
