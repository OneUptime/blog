# How to Test Concurrent Code in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Testing, Concurrency, Race Detection, Debugging

Description: Test concurrent Go code effectively using the race detector, synchronization testing patterns, and techniques to catch race conditions.

---

Concurrent programming in Go is powerful but comes with unique challenges. Race conditions, deadlocks, and synchronization bugs can lurk in your code, appearing only under specific timing conditions. This comprehensive guide covers how to test concurrent Go code effectively, ensuring your goroutines, channels, and shared data are working correctly.

## Understanding Race Conditions

A race condition occurs when two or more goroutines access shared data concurrently, and at least one of them modifies it. The outcome depends on the timing of the goroutines' execution, making bugs unpredictable and difficult to reproduce.

Here is a simple example demonstrating a classic race condition with a shared counter:

```go
package main

import (
    "fmt"
    "sync"
)

// Counter is a simple struct that demonstrates a race condition
// when multiple goroutines increment it without synchronization.
type Counter struct {
    value int
}

func main() {
    counter := &Counter{}
    var wg sync.WaitGroup

    // Launch 1000 goroutines that each increment the counter
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            // This read-modify-write operation is not atomic
            // Multiple goroutines may read the same value before any writes
            counter.value++
        }()
    }

    wg.Wait()
    // Expected: 1000, Actual: varies (usually less than 1000)
    fmt.Printf("Final count: %d\n", counter.value)
}
```

## The Race Detector: Your First Line of Defense

Go provides a built-in race detector that instruments your code to detect data races at runtime. It is one of the most valuable tools for concurrent programming in Go.

### Enabling the Race Detector

Enable race detection by adding the `-race` flag to your Go commands:

```bash
# Run tests with race detection
go test -race ./...

# Build with race detection
go build -race -o myapp

# Run directly with race detection
go run -race main.go
```

### How the Race Detector Works

The race detector uses a technique called "happens-before" analysis. It tracks memory accesses and synchronization events to determine if two accesses to the same memory location could race with each other.

Here is a test file that demonstrates how the race detector catches concurrent access issues:

```go
package counter_test

import (
    "sync"
    "testing"
)

// UnsafeCounter demonstrates a type with a race condition.
// The race detector will catch concurrent access to the count field.
type UnsafeCounter struct {
    count int
}

func (c *UnsafeCounter) Increment() {
    c.count++ // Race: read-modify-write is not atomic
}

func (c *UnsafeCounter) Value() int {
    return c.count // Race: unsynchronized read
}

// TestUnsafeCounter_Race will fail when run with -race flag.
// This test intentionally triggers a race condition to demonstrate detection.
func TestUnsafeCounter_Race(t *testing.T) {
    counter := &UnsafeCounter{}
    var wg sync.WaitGroup

    // Spawn multiple goroutines to increment concurrently
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < 100; j++ {
                counter.Increment()
            }
        }()
    }

    wg.Wait()

    // The value will be inconsistent due to the race condition
    t.Logf("Counter value: %d (expected 10000)", counter.Value())
}
```

### Understanding Race Detector Output

When a race is detected, the output shows detailed information about the conflicting accesses:

```
==================
WARNING: DATA RACE
Read at 0x00c0000a4010 by goroutine 8:
  example.com/myapp.(*UnsafeCounter).Increment()
      /path/to/counter.go:15 +0x3a

Previous write at 0x00c0000a4010 by goroutine 7:
  example.com/myapp.(*UnsafeCounter).Increment()
      /path/to/counter.go:15 +0x50

Goroutine 8 (running) created at:
  example.com/myapp.TestUnsafeCounter_Race()
      /path/to/counter_test.go:28 +0x7a

Goroutine 7 (running) created at:
  example.com/myapp.TestUnsafeCounter_Race()
      /path/to/counter_test.go:28 +0x7a
==================
```

## Fixing Race Conditions with Synchronization

There are several ways to fix race conditions in Go. Let's explore the most common approaches.

### Using Mutexes

Mutexes provide exclusive access to shared data. Here is a thread-safe counter implementation:

```go
package counter

import "sync"

// SafeCounter uses a mutex to protect concurrent access to the count field.
// This is the most common pattern for protecting shared mutable state.
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

// Increment safely increases the counter by acquiring the lock first.
// The mutex ensures only one goroutine can modify count at a time.
func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

// Value returns the current count safely by acquiring a read lock.
// Using defer ensures the lock is released even if a panic occurs.
func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}
```

### Using RWMutex for Read-Heavy Workloads

When reads significantly outnumber writes, RWMutex allows multiple concurrent readers:

```go
package cache

import "sync"

// Cache demonstrates using RWMutex for a read-heavy workload.
// Multiple goroutines can read simultaneously, but writes are exclusive.
type Cache struct {
    mu   sync.RWMutex
    data map[string]interface{}
}

// NewCache creates an initialized cache with an empty map.
func NewCache() *Cache {
    return &Cache{
        data: make(map[string]interface{}),
    }
}

// Get retrieves a value using a read lock, allowing concurrent reads.
// RLock allows multiple readers to proceed simultaneously.
func (c *Cache) Get(key string) (interface{}, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    return val, ok
}

// Set stores a value using a write lock, blocking all other access.
// Lock provides exclusive access, blocking both readers and writers.
func (c *Cache) Set(key string, value interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = value
}
```

### Using Atomic Operations

For simple numeric operations, the sync/atomic package provides lock-free alternatives:

```go
package counter

import "sync/atomic"

// AtomicCounter uses atomic operations for lock-free thread safety.
// This is more efficient than mutexes for simple numeric operations.
type AtomicCounter struct {
    count int64
}

// Increment atomically adds 1 to the counter.
// atomic.AddInt64 is a single CPU instruction on most architectures.
func (c *AtomicCounter) Increment() {
    atomic.AddInt64(&c.count, 1)
}

// Value atomically reads the current count.
// atomic.LoadInt64 ensures we see a consistent value.
func (c *AtomicCounter) Value() int64 {
    return atomic.LoadInt64(&c.count)
}

// Add atomically adds delta to the counter and returns the new value.
func (c *AtomicCounter) Add(delta int64) int64 {
    return atomic.AddInt64(&c.count, delta)
}
```

## Testing with sync.WaitGroup

WaitGroup is essential for testing concurrent code because it allows you to wait for all goroutines to complete before making assertions.

### Basic WaitGroup Pattern

Here is a standard pattern for testing concurrent operations with WaitGroup:

```go
package worker_test

import (
    "sync"
    "testing"
)

// Worker represents a unit that processes jobs concurrently.
type Worker struct {
    results []int
    mu      sync.Mutex
}

// Process simulates work and stores the result safely.
func (w *Worker) Process(id int) {
    // Simulate some work
    result := id * 2

    // Safely append to results
    w.mu.Lock()
    w.results = append(w.results, result)
    w.mu.Unlock()
}

// TestWorker_Concurrent verifies that concurrent processing completes correctly.
// WaitGroup ensures all goroutines finish before we check the results.
func TestWorker_Concurrent(t *testing.T) {
    worker := &Worker{}
    var wg sync.WaitGroup

    numJobs := 100

    // Launch goroutines for each job
    for i := 0; i < numJobs; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            worker.Process(id)
        }(i) // Pass i as argument to avoid closure capture issues
    }

    // Wait for all goroutines to complete
    wg.Wait()

    // Now safe to check results without synchronization
    if len(worker.results) != numJobs {
        t.Errorf("expected %d results, got %d", numJobs, len(worker.results))
    }
}
```

### Testing with Multiple WaitGroups

For complex scenarios, you may need multiple WaitGroups to coordinate different phases:

```go
package pipeline_test

import (
    "sync"
    "testing"
)

// TestPipeline_Stages demonstrates coordinating multiple concurrent stages.
// Each stage must complete before the next one begins.
func TestPipeline_Stages(t *testing.T) {
    var (
        stage1Results []int
        stage2Results []int
        mu            sync.Mutex
    )

    // Stage 1: Generate data concurrently
    var wg1 sync.WaitGroup
    for i := 0; i < 10; i++ {
        wg1.Add(1)
        go func(val int) {
            defer wg1.Done()
            mu.Lock()
            stage1Results = append(stage1Results, val)
            mu.Unlock()
        }(i)
    }
    wg1.Wait()

    // Stage 2: Process stage 1 results concurrently
    var wg2 sync.WaitGroup
    for _, val := range stage1Results {
        wg2.Add(1)
        go func(v int) {
            defer wg2.Done()
            mu.Lock()
            stage2Results = append(stage2Results, v*2)
            mu.Unlock()
        }(val)
    }
    wg2.Wait()

    // Verify final results
    if len(stage2Results) != 10 {
        t.Errorf("expected 10 stage2 results, got %d", len(stage2Results))
    }
}
```

## Testing Channels

Channels are Go's primary mechanism for communication between goroutines. Testing them requires careful attention to blocking behavior and proper cleanup.

### Basic Channel Tests

Here is a pattern for testing a function that produces values on a channel:

```go
package producer_test

import (
    "testing"
    "time"
)

// Produce sends numbers 0 to n-1 on the returned channel.
// The channel is closed when all values have been sent.
func Produce(n int) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; i < n; i++ {
            ch <- i
        }
    }()
    return ch
}

// TestProduce verifies that the producer sends the expected values.
func TestProduce(t *testing.T) {
    ch := Produce(5)

    expected := []int{0, 1, 2, 3, 4}
    received := make([]int, 0, 5)

    // Collect all values from the channel
    for val := range ch {
        received = append(received, val)
    }

    // Verify we got all expected values
    if len(received) != len(expected) {
        t.Fatalf("expected %d values, got %d", len(expected), len(received))
    }

    for i, v := range received {
        if v != expected[i] {
            t.Errorf("at index %d: expected %d, got %d", i, expected[i], v)
        }
    }
}
```

### Testing Bidirectional Communication

Testing request-response patterns requires coordinating sends and receives:

```go
package service_test

import (
    "sync"
    "testing"
)

// Request represents a request with a response channel.
type Request struct {
    Value    int
    Response chan int
}

// Server processes requests by doubling the input value.
func Server(requests <-chan Request) {
    for req := range requests {
        req.Response <- req.Value * 2
    }
}

// TestServer_RequestResponse tests the request-response pattern.
func TestServer_RequestResponse(t *testing.T) {
    requests := make(chan Request)

    // Start server in background
    go Server(requests)

    // Send multiple requests concurrently
    var wg sync.WaitGroup
    results := make(chan int, 10)

    for i := 1; i <= 10; i++ {
        wg.Add(1)
        go func(val int) {
            defer wg.Done()

            // Create response channel for this request
            resp := make(chan int)
            requests <- Request{Value: val, Response: resp}

            // Collect response
            results <- <-resp
        }(i)
    }

    // Wait for all requests to complete, then close results
    go func() {
        wg.Wait()
        close(results)
        close(requests)
    }()

    // Collect and verify results
    count := 0
    for result := range results {
        if result%2 != 0 {
            t.Errorf("expected even result, got %d", result)
        }
        count++
    }

    if count != 10 {
        t.Errorf("expected 10 results, got %d", count)
    }
}
```

## Timeout Patterns for Concurrent Tests

Concurrent tests can hang indefinitely if there's a deadlock or a goroutine never completes. Always include timeouts in your tests.

### Using time.After for Timeouts

The select statement with time.After provides a clean timeout mechanism:

```go
package async_test

import (
    "testing"
    "time"
)

// SlowOperation simulates a potentially slow operation.
func SlowOperation(delay time.Duration) <-chan string {
    ch := make(chan string)
    go func() {
        time.Sleep(delay)
        ch <- "completed"
    }()
    return ch
}

// TestSlowOperation_WithTimeout ensures the operation completes in time.
func TestSlowOperation_WithTimeout(t *testing.T) {
    result := SlowOperation(100 * time.Millisecond)

    // Use select to implement timeout
    select {
    case msg := <-result:
        if msg != "completed" {
            t.Errorf("unexpected result: %s", msg)
        }
    case <-time.After(1 * time.Second):
        t.Fatal("operation timed out")
    }
}

// TestSlowOperation_ExpectedTimeout verifies timeout detection.
func TestSlowOperation_ExpectedTimeout(t *testing.T) {
    // Operation that takes longer than our timeout
    result := SlowOperation(5 * time.Second)

    select {
    case <-result:
        t.Fatal("expected timeout, but operation completed")
    case <-time.After(100 * time.Millisecond):
        // Expected: operation should timeout
        t.Log("correctly detected slow operation")
    }
}
```

### Using Context for Timeouts

Context provides a more sophisticated approach with cancellation propagation:

```go
package fetcher_test

import (
    "context"
    "errors"
    "testing"
    "time"
)

// Fetcher simulates fetching data with context support.
type Fetcher struct{}

// Fetch retrieves data, respecting context cancellation.
func (f *Fetcher) Fetch(ctx context.Context, delay time.Duration) (string, error) {
    select {
    case <-time.After(delay):
        return "data", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

// TestFetcher_ContextTimeout tests context-based timeout handling.
func TestFetcher_ContextTimeout(t *testing.T) {
    fetcher := &Fetcher{}

    // Create a context with a short timeout
    ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
    defer cancel()

    // Try to fetch with a delay longer than the timeout
    _, err := fetcher.Fetch(ctx, 1*time.Second)

    if err == nil {
        t.Fatal("expected timeout error")
    }

    if !errors.Is(err, context.DeadlineExceeded) {
        t.Errorf("expected DeadlineExceeded, got: %v", err)
    }
}

// TestFetcher_ContextCancel tests explicit cancellation.
func TestFetcher_ContextCancel(t *testing.T) {
    fetcher := &Fetcher{}

    ctx, cancel := context.WithCancel(context.Background())

    // Cancel after a short delay
    go func() {
        time.Sleep(50 * time.Millisecond)
        cancel()
    }()

    _, err := fetcher.Fetch(ctx, 1*time.Second)

    if err == nil {
        t.Fatal("expected cancellation error")
    }

    if !errors.Is(err, context.Canceled) {
        t.Errorf("expected Canceled, got: %v", err)
    }
}
```

### Test Helper for Timeouts

Create a reusable helper for timeout handling in tests:

```go
package testutil

import (
    "testing"
    "time"
)

// WithTimeout runs a test function with a timeout.
// If the function doesn't complete in time, the test fails.
func WithTimeout(t *testing.T, timeout time.Duration, fn func()) {
    t.Helper()

    done := make(chan struct{})

    go func() {
        fn()
        close(done)
    }()

    select {
    case <-done:
        // Test completed successfully
    case <-time.After(timeout):
        t.Fatalf("test timed out after %v", timeout)
    }
}
```

Using the helper in tests:

```go
package mypackage_test

import (
    "testing"
    "time"

    "mypackage/testutil"
)

// TestWithTimeoutHelper demonstrates using the timeout helper.
func TestWithTimeoutHelper(t *testing.T) {
    testutil.WithTimeout(t, 5*time.Second, func() {
        // Your concurrent test code here
        result := make(chan int)

        go func() {
            time.Sleep(100 * time.Millisecond)
            result <- 42
        }()

        got := <-result
        if got != 42 {
            t.Errorf("expected 42, got %d", got)
        }
    })
}
```

## Common Race Condition Patterns

Understanding common race patterns helps you write better concurrent code and tests.

### Closure Variable Capture

One of the most common bugs is capturing loop variables in closures:

```go
package closure_test

import (
    "sync"
    "testing"
)

// TestClosureCapture_Bug demonstrates the incorrect pattern.
// All goroutines may see the same value of i due to closure capture.
func TestClosureCapture_Bug(t *testing.T) {
    var wg sync.WaitGroup
    results := make(chan int, 10)

    // BUG: All goroutines share the same variable i
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            results <- i // i may have changed by the time this runs
        }()
    }

    wg.Wait()
    close(results)

    // Results will likely be all 10s or unpredictable values
    for v := range results {
        t.Logf("got: %d", v)
    }
}

// TestClosureCapture_Fixed demonstrates the correct pattern.
// Each goroutine receives its own copy of the value.
func TestClosureCapture_Fixed(t *testing.T) {
    var wg sync.WaitGroup
    results := make(chan int, 10)

    for i := 0; i < 10; i++ {
        wg.Add(1)
        // FIXED: Pass i as a function argument
        go func(val int) {
            defer wg.Done()
            results <- val
        }(i)
    }

    wg.Wait()
    close(results)

    // Results will be 0-9 (in some order)
    received := make(map[int]bool)
    for v := range results {
        received[v] = true
    }

    if len(received) != 10 {
        t.Errorf("expected 10 unique values, got %d", len(received))
    }
}
```

### Check-Then-Act Race

This pattern occurs when checking a condition and acting on it are not atomic:

```go
package checkact_test

import (
    "sync"
    "testing"
)

// UnsafeMap demonstrates a check-then-act race condition.
type UnsafeMap struct {
    data map[string]int
}

// IncrementIfExists has a race: check and update are not atomic.
func (m *UnsafeMap) IncrementIfExists(key string) bool {
    // RACE: Another goroutine could delete the key between check and update
    if _, exists := m.data[key]; exists {
        m.data[key]++
        return true
    }
    return false
}

// SafeMap fixes the race with proper synchronization.
type SafeMap struct {
    mu   sync.Mutex
    data map[string]int
}

// IncrementIfExists safely checks and updates atomically.
func (m *SafeMap) IncrementIfExists(key string) bool {
    m.mu.Lock()
    defer m.mu.Unlock()

    if _, exists := m.data[key]; exists {
        m.data[key]++
        return true
    }
    return false
}

// TestSafeMap_ConcurrentAccess verifies thread-safe operations.
func TestSafeMap_ConcurrentAccess(t *testing.T) {
    m := &SafeMap{data: map[string]int{"counter": 0}}

    var wg sync.WaitGroup

    // Concurrent increments
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            m.IncrementIfExists("counter")
        }()
    }

    wg.Wait()

    m.mu.Lock()
    final := m.data["counter"]
    m.mu.Unlock()

    if final != 1000 {
        t.Errorf("expected 1000, got %d", final)
    }
}
```

### Initialization Race

Race conditions can occur during initialization of shared resources:

```go
package singleton_test

import (
    "sync"
    "testing"
)

// UnsafeSingleton demonstrates a race during lazy initialization.
type UnsafeSingleton struct {
    initialized bool
    value       string
}

// Get has a race: multiple goroutines may try to initialize.
func (s *UnsafeSingleton) Get() string {
    if !s.initialized {
        // RACE: Multiple goroutines could reach here
        s.value = "expensive computation"
        s.initialized = true
    }
    return s.value
}

// SafeSingleton uses sync.Once for race-free initialization.
type SafeSingleton struct {
    once  sync.Once
    value string
}

// Get safely initializes exactly once.
func (s *SafeSingleton) Get() string {
    s.once.Do(func() {
        s.value = "expensive computation"
    })
    return s.value
}

// TestSafeSingleton_ConcurrentInit verifies safe initialization.
func TestSafeSingleton_ConcurrentInit(t *testing.T) {
    singleton := &SafeSingleton{}

    var wg sync.WaitGroup
    results := make(chan string, 100)

    // Many goroutines trying to initialize concurrently
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            results <- singleton.Get()
        }()
    }

    wg.Wait()
    close(results)

    // All results should be identical
    for result := range results {
        if result != "expensive computation" {
            t.Errorf("unexpected result: %s", result)
        }
    }
}
```

## CI Configuration for Race Testing

Integrating race detection into your CI pipeline is essential for catching race conditions before they reach production.

### GitHub Actions Configuration

Here is a complete GitHub Actions workflow that includes race detection:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test with Race Detector
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Run tests with race detector
        run: go test -race -v -coverprofile=coverage.out ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.out
          fail_ci_if_error: true

  race-extended:
    name: Extended Race Testing
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      # Run tests multiple times to catch intermittent races
      - name: Run race tests (iteration 1)
        run: go test -race -count=5 ./...

      - name: Run race tests with stress
        run: |
          go test -race -count=10 -parallel=4 ./...
```

### GitLab CI Configuration

Here is the equivalent GitLab CI configuration:

```yaml
# .gitlab-ci.yml
stages:
  - test

variables:
  GO_VERSION: "1.22"

test:race:
  stage: test
  image: golang:${GO_VERSION}
  script:
    - go test -race -v -coverprofile=coverage.out ./...
  coverage: '/coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.out

test:race-stress:
  stage: test
  image: golang:${GO_VERSION}
  script:
    # Run multiple iterations to catch intermittent races
    - go test -race -count=10 -parallel=4 ./...
  allow_failure: false
```

### Makefile Targets

Add convenient Makefile targets for race testing:

```makefile
# Makefile

.PHONY: test test-race test-race-verbose test-race-stress

# Standard test run
test:
	go test -v ./...

# Test with race detector
test-race:
	go test -race ./...

# Verbose race testing with coverage
test-race-verbose:
	go test -race -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Stress test for intermittent races
test-race-stress:
	go test -race -count=10 -parallel=4 ./...

# Run specific package with race detector
test-race-pkg:
	go test -race -v ./$(PKG)/...
```

## Advanced Testing Techniques

### Testing for Deadlocks

Use timeouts to detect potential deadlocks in your concurrent code:

```go
package deadlock_test

import (
    "sync"
    "testing"
    "time"
)

// ResourceManager demonstrates potential deadlock scenarios.
type ResourceManager struct {
    muA sync.Mutex
    muB sync.Mutex
}

// SafeOperation acquires locks in a consistent order to prevent deadlock.
func (rm *ResourceManager) SafeOperation() {
    rm.muA.Lock()
    defer rm.muA.Unlock()

    rm.muB.Lock()
    defer rm.muB.Unlock()

    // Perform operation with both locks held
}

// TestNoDeadlock verifies that concurrent operations don't deadlock.
func TestNoDeadlock(t *testing.T) {
    rm := &ResourceManager{}

    done := make(chan struct{})

    go func() {
        var wg sync.WaitGroup

        for i := 0; i < 100; i++ {
            wg.Add(1)
            go func() {
                defer wg.Done()
                rm.SafeOperation()
            }()
        }

        wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        // Success: no deadlock
    case <-time.After(5 * time.Second):
        t.Fatal("potential deadlock detected")
    }
}
```

### Testing Channel Behavior

Test for proper channel closure and buffering behavior:

```go
package channel_test

import (
    "testing"
    "time"
)

// TestChannelClosure verifies proper channel closure behavior.
func TestChannelClosure(t *testing.T) {
    ch := make(chan int)

    go func() {
        for i := 0; i < 5; i++ {
            ch <- i
        }
        close(ch)
    }()

    count := 0
    for range ch {
        count++
    }

    if count != 5 {
        t.Errorf("expected 5 values, got %d", count)
    }
}

// TestBufferedChannel tests buffered channel capacity.
func TestBufferedChannel(t *testing.T) {
    ch := make(chan int, 3)

    // Should not block for first 3 sends
    done := make(chan bool)

    go func() {
        ch <- 1
        ch <- 2
        ch <- 3
        done <- true
        ch <- 4 // This will block until someone receives
        done <- true
    }()

    // First 3 sends should complete immediately
    select {
    case <-done:
        // Good: first 3 sends completed
    case <-time.After(100 * time.Millisecond):
        t.Fatal("buffered sends should not block")
    }

    // Fourth send should block
    select {
    case <-done:
        t.Fatal("fourth send should block")
    case <-time.After(50 * time.Millisecond):
        // Expected: fourth send is blocking
    }

    // Receive one value to unblock
    <-ch

    // Now fourth send should complete
    select {
    case <-done:
        // Good
    case <-time.After(100 * time.Millisecond):
        t.Fatal("fourth send should complete after receive")
    }
}
```

### Using testing.T Parallel

Go's testing package supports parallel test execution with t.Parallel():

```go
package parallel_test

import (
    "testing"
    "time"
)

// TestParallelExecution demonstrates parallel test execution.
func TestParallelExecution(t *testing.T) {
    // Tests that call t.Parallel will run concurrently
    t.Run("SubTest1", func(t *testing.T) {
        t.Parallel()
        time.Sleep(100 * time.Millisecond)
        t.Log("SubTest1 completed")
    })

    t.Run("SubTest2", func(t *testing.T) {
        t.Parallel()
        time.Sleep(100 * time.Millisecond)
        t.Log("SubTest2 completed")
    })

    t.Run("SubTest3", func(t *testing.T) {
        t.Parallel()
        time.Sleep(100 * time.Millisecond)
        t.Log("SubTest3 completed")
    })
}

// TestTableDriven_Parallel shows parallel execution with table-driven tests.
func TestTableDriven_Parallel(t *testing.T) {
    testCases := []struct {
        name     string
        input    int
        expected int
    }{
        {"double 1", 1, 2},
        {"double 2", 2, 4},
        {"double 3", 3, 6},
        {"double 10", 10, 20},
    }

    for _, tc := range testCases {
        // Capture range variable
        tc := tc

        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()

            result := tc.input * 2
            if result != tc.expected {
                t.Errorf("expected %d, got %d", tc.expected, result)
            }
        })
    }
}
```

## Best Practices Summary

When testing concurrent Go code, follow these best practices:

1. **Always use -race in CI**: Make race detection a mandatory part of your test pipeline. Run tests with `-race` on every commit.

2. **Use timeouts**: Every concurrent test should have a timeout to prevent hanging tests. Use select with time.After or context.WithTimeout.

3. **Avoid shared state**: Prefer passing data through channels over sharing memory. When you must share state, use proper synchronization.

4. **Run tests multiple times**: Race conditions are often intermittent. Run tests with `-count=N` to increase the chance of catching races.

5. **Use WaitGroups correctly**: Always call wg.Add before launching goroutines, and use defer wg.Done to ensure completion.

6. **Capture loop variables**: Pass loop variables as function arguments to avoid closure capture bugs.

7. **Test edge cases**: Include tests for empty channels, closed channels, and zero-length operations.

8. **Document synchronization**: Make your synchronization strategy clear through comments and consistent patterns.

## Conclusion

Testing concurrent code in Go requires a methodical approach combining the race detector, proper synchronization, and defensive testing patterns. The `-race` flag is your first line of defense, catching many race conditions at runtime. Combined with well-structured tests using WaitGroups, channels, and timeouts, you can build confidence in your concurrent code's correctness.

Remember that the absence of race detector warnings doesn't guarantee correctness - it only means no races were detected during that particular execution. Running tests multiple times, stress testing, and careful code review remain important practices for building robust concurrent systems.

By integrating race detection into your CI pipeline and following the patterns outlined in this guide, you'll catch concurrency bugs early and ship more reliable Go applications.
