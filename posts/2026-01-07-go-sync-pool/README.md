# How to Use sync.Pool for Object Reuse in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Performance, Memory, Optimization, Concurrency

Description: Reduce garbage collection pressure in Go using sync.Pool for object reuse in high-throughput services with proper usage patterns.

---

In high-throughput Go services, memory allocation and garbage collection can become significant performance bottlenecks. Every time you allocate a new object, the garbage collector (GC) must eventually reclaim that memory, consuming CPU cycles that could otherwise be used for actual work. Go's `sync.Pool` provides an elegant solution: a concurrent-safe pool of reusable objects that can dramatically reduce allocation overhead.

This guide covers everything you need to know about `sync.Pool`, from basic concepts to advanced patterns used in production systems.

## Understanding sync.Pool Internals

Before diving into usage patterns, let's understand how `sync.Pool` works under the hood.

### What is sync.Pool?

`sync.Pool` is a concurrent-safe object pool that caches allocated objects for later reuse. The key insight is that creating new objects is expensive (allocation + eventual GC), while resetting and reusing existing objects is cheap.

### How sync.Pool Works Internally

The internal implementation of `sync.Pool` is sophisticated:

1. **Per-P Local Pools**: Each processor (P) in the Go runtime has its own local pool, minimizing contention
2. **Victim Cache**: Objects not used in the current GC cycle move to a victim cache, giving them one more cycle before eviction
3. **Lock-Free Fast Path**: Getting and putting objects uses atomic operations when possible
4. **GC Integration**: The pool is cleared (partially) during garbage collection

Here's a simplified view of the pool structure:

```go
// Simplified internal structure (actual implementation is more complex)
type Pool struct {
    // Per-P local pools for lock-free access
    local     unsafe.Pointer // [P]poolLocal
    localSize uintptr

    // Victim cache from previous GC cycle
    victim     unsafe.Pointer
    victimSize uintptr

    // New creates an object when pool is empty
    New func() interface{}
}
```

### The GC Connection

Understanding the relationship between `sync.Pool` and the garbage collector is crucial:

```go
// This demonstrates what happens during GC cycles
package main

import (
    "fmt"
    "runtime"
    "sync"
)

func main() {
    pool := &sync.Pool{
        New: func() interface{} {
            fmt.Println("Creating new object")
            return make([]byte, 1024)
        },
    }

    // Put 3 objects in the pool
    for i := 0; i < 3; i++ {
        pool.Put(make([]byte, 1024))
    }

    fmt.Println("Before GC: Getting from pool...")
    obj := pool.Get()
    fmt.Printf("Got object: %T\n", obj)
    pool.Put(obj)

    // Force garbage collection
    fmt.Println("\nTriggering GC...")
    runtime.GC()

    // After GC, objects move to victim cache (still available)
    fmt.Println("\nAfter 1st GC: Getting from pool...")
    obj = pool.Get()
    fmt.Printf("Got object: %T\n", obj)
    pool.Put(obj)

    // Second GC clears victim cache
    fmt.Println("\nTriggering second GC...")
    runtime.GC()
    runtime.GC()

    // Now pool may need to create new objects
    fmt.Println("\nAfter multiple GCs: Getting from pool...")
    _ = pool.Get()
}
```

## When to Use sync.Pool (and When Not To)

### Ideal Use Cases

`sync.Pool` shines in specific scenarios:

```go
// GOOD: Temporary buffers for I/O operations
// - High allocation rate
// - Short-lived objects
// - Uniform object sizes
type IOHandler struct {
    bufferPool *sync.Pool
}

func NewIOHandler() *IOHandler {
    return &IOHandler{
        bufferPool: &sync.Pool{
            New: func() interface{} {
                return make([]byte, 32*1024) // 32KB buffers
            },
        },
    }
}

// GOOD: JSON encoding/decoding in HTTP handlers
// - Frequent operations
// - Thread-safe requirement
// - Expensive initialization
type JSONProcessor struct {
    encoderPool *sync.Pool
}

// GOOD: Protobuf message pools
// - Fixed message types
// - High message throughput
// - Reset-friendly structures
type MessagePool struct {
    pool *sync.Pool
}
```

### When NOT to Use sync.Pool

There are cases where `sync.Pool` adds complexity without benefit:

```go
// BAD: Long-lived objects
// sync.Pool objects can be reclaimed by GC at any time
type ConnectionPool struct {
    // Don't use sync.Pool for database connections!
    // Use a proper connection pool instead
    pool *sync.Pool // Wrong approach
}

// BAD: Objects with non-uniform sizes
// This leads to memory waste or frequent allocations
func badVariableSizePool() *sync.Pool {
    return &sync.Pool{
        New: func() interface{} {
            // Size varies - pool becomes inefficient
            return make([]byte, 1024) // But callers need 64KB?
        },
    }
}

// BAD: Infrequently allocated objects
// The overhead of pool management exceeds benefits
type RarelyUsedConfig struct {
    pool *sync.Pool // Overkill for occasional use
}

// BAD: Objects requiring complex cleanup
// If reset is expensive, pooling may not help
type ComplexState struct {
    connections []*Connection
    transactions []*Transaction
    // Cleanup is too complex for efficient pooling
}
```

### Decision Framework

Use this checklist to decide if `sync.Pool` is appropriate:

```go
/*
sync.Pool Decision Checklist:

1. Allocation Frequency
   [ ] Objects allocated more than 1000/second? -> Consider pooling
   [ ] Objects allocated less than 10/second? -> Skip pooling

2. Object Lifecycle
   [ ] Short-lived (< 1 second)? -> Good for pooling
   [ ] Long-lived (minutes/hours)? -> Use different pattern

3. Object Size
   [ ] Uniform or predictable sizes? -> Good for pooling
   [ ] Highly variable sizes? -> Consider tiered pools

4. Reset Complexity
   [ ] Simple reset (zero fields)? -> Good for pooling
   [ ] Complex cleanup required? -> Reconsider approach

5. Concurrency
   [ ] Multiple goroutines access? -> sync.Pool handles this
   [ ] Single goroutine? -> Simple slice might suffice
*/
```

## Basic Usage Patterns

### Creating and Using a Basic Pool

Let's start with the fundamental pattern:

```go
package main

import (
    "fmt"
    "sync"
)

// Buffer represents a reusable byte buffer
type Buffer struct {
    data []byte
}

// Reset clears the buffer for reuse
func (b *Buffer) Reset() {
    b.data = b.data[:0] // Reset length, keep capacity
}

func main() {
    // Create a pool with a New function that allocates fresh buffers
    bufferPool := &sync.Pool{
        New: func() interface{} {
            fmt.Println("Allocating new buffer")
            return &Buffer{
                data: make([]byte, 0, 1024),
            }
        },
    }

    // Get a buffer from the pool
    buf := bufferPool.Get().(*Buffer)

    // Use the buffer
    buf.data = append(buf.data, []byte("Hello, World!")...)
    fmt.Printf("Buffer contents: %s\n", buf.data)

    // Reset and return to pool
    buf.Reset()
    bufferPool.Put(buf)

    // Get again - likely returns the same buffer
    buf2 := bufferPool.Get().(*Buffer)
    fmt.Printf("Buffer capacity: %d\n", cap(buf2.data))
}
```

### Type-Safe Pool Wrapper

Raw `sync.Pool` returns `interface{}`, requiring type assertions. Create a wrapper for type safety:

```go
package main

import (
    "sync"
)

// ByteBufferPool provides type-safe access to pooled byte buffers
type ByteBufferPool struct {
    pool sync.Pool
    size int
}

// NewByteBufferPool creates a pool of byte slices with the given initial size
func NewByteBufferPool(size int) *ByteBufferPool {
    return &ByteBufferPool{
        pool: sync.Pool{
            New: func() interface{} {
                buf := make([]byte, size)
                return &buf
            },
        },
        size: size,
    }
}

// Get retrieves a buffer from the pool
func (p *ByteBufferPool) Get() *[]byte {
    return p.pool.Get().(*[]byte)
}

// Put returns a buffer to the pool after resetting it
func (p *ByteBufferPool) Put(buf *[]byte) {
    // Reset the slice length but keep capacity
    *buf = (*buf)[:0]

    // Only return appropriately sized buffers
    if cap(*buf) >= p.size && cap(*buf) <= p.size*2 {
        p.pool.Put(buf)
    }
    // Oversized buffers are discarded to prevent memory bloat
}

func main() {
    pool := NewByteBufferPool(4096)

    buf := pool.Get()
    *buf = append(*buf, []byte("type-safe pooling")...)

    // Use buffer...

    pool.Put(buf)
}
```

## Reset Objects Before Returning to Pool

One of the most common mistakes is forgetting to reset objects. Leaked data can cause bugs or security issues.

### The Reset Pattern

```go
package main

import (
    "sync"
)

// Request represents an HTTP-like request object
type Request struct {
    Method  string
    Path    string
    Headers map[string]string
    Body    []byte
    UserID  int64  // Sensitive data!
}

// Reset clears all fields for safe reuse
func (r *Request) Reset() {
    r.Method = ""
    r.Path = ""
    // Clear map without reallocating
    for k := range r.Headers {
        delete(r.Headers, k)
    }
    r.Body = r.Body[:0]
    r.UserID = 0 // Important: clear sensitive data!
}

// RequestPool manages pooled Request objects
type RequestPool struct {
    pool sync.Pool
}

func NewRequestPool() *RequestPool {
    return &RequestPool{
        pool: sync.Pool{
            New: func() interface{} {
                return &Request{
                    Headers: make(map[string]string, 8),
                    Body:    make([]byte, 0, 1024),
                }
            },
        },
    }
}

func (p *RequestPool) Get() *Request {
    return p.pool.Get().(*Request)
}

// Put ALWAYS resets before returning to pool
func (p *RequestPool) Put(r *Request) {
    r.Reset() // Critical: never skip this!
    p.pool.Put(r)
}
```

### Using defer for Guaranteed Return

Ensure objects are returned even when errors occur:

```go
package main

import (
    "errors"
    "sync"
)

type Worker struct {
    bufferPool *sync.Pool
}

// ProcessData demonstrates using defer to guarantee pool return
func (w *Worker) ProcessData(input []byte) ([]byte, error) {
    // Get buffer from pool
    buf := w.bufferPool.Get().(*[]byte)

    // Defer guarantees return even on panic or early return
    defer func() {
        *buf = (*buf)[:0] // Reset
        w.bufferPool.Put(buf)
    }()

    // Simulate processing that might fail
    if len(input) == 0 {
        return nil, errors.New("empty input")
    }

    *buf = append(*buf, input...)
    *buf = append(*buf, []byte("-processed")...)

    // Return a copy, not the pooled buffer
    result := make([]byte, len(*buf))
    copy(result, *buf)

    return result, nil
}
```

### Reset Patterns for Complex Types

Different types require different reset strategies:

```go
package main

import (
    "sync"
    "time"
)

// Metrics holds various metric types that need careful reset
type Metrics struct {
    Counters   map[string]int64
    Gauges     map[string]float64
    Timestamps []time.Time
    Labels     []string
}

// Reset demonstrates reset patterns for different field types
func (m *Metrics) Reset() {
    // Maps: delete all keys, keep allocated buckets
    for k := range m.Counters {
        delete(m.Counters, k)
    }
    for k := range m.Gauges {
        delete(m.Gauges, k)
    }

    // Slices: reset length, keep capacity
    m.Timestamps = m.Timestamps[:0]
    m.Labels = m.Labels[:0]
}

// For slices of pointers, be careful about references
type Node struct {
    Value    int
    Children []*Node
}

func (n *Node) Reset() {
    n.Value = 0
    // Clear references to allow GC of children
    for i := range n.Children {
        n.Children[i] = nil
    }
    n.Children = n.Children[:0]
}

// MetricsPool with proper initialization
func NewMetricsPool() *sync.Pool {
    return &sync.Pool{
        New: func() interface{} {
            return &Metrics{
                Counters:   make(map[string]int64, 16),
                Gauges:     make(map[string]float64, 16),
                Timestamps: make([]time.Time, 0, 32),
                Labels:     make([]string, 0, 16),
            }
        },
    }
}
```

## Buffer Pools for I/O Operations

Buffer pooling is one of the most effective uses of `sync.Pool`, especially for I/O-heavy applications.

### Standard bytes.Buffer Pool

```go
package main

import (
    "bytes"
    "io"
    "sync"
)

// BufferPool wraps sync.Pool for bytes.Buffer
type BufferPool struct {
    pool sync.Pool
}

// NewBufferPool creates a pool of bytes.Buffer with initial capacity
func NewBufferPool(initialCap int) *BufferPool {
    return &BufferPool{
        pool: sync.Pool{
            New: func() interface{} {
                return bytes.NewBuffer(make([]byte, 0, initialCap))
            },
        },
    }
}

// Get retrieves a buffer from the pool
func (p *BufferPool) Get() *bytes.Buffer {
    return p.pool.Get().(*bytes.Buffer)
}

// Put resets and returns a buffer to the pool
func (p *BufferPool) Put(buf *bytes.Buffer) {
    // Prevent memory bloat: discard oversized buffers
    if buf.Cap() > 64*1024 { // 64KB threshold
        return // Let GC reclaim this buffer
    }
    buf.Reset()
    p.pool.Put(buf)
}

// Example: Using buffer pool for HTTP response building
type ResponseBuilder struct {
    bufPool *BufferPool
}

func (rb *ResponseBuilder) BuildResponse(data []byte) []byte {
    buf := rb.bufPool.Get()
    defer rb.bufPool.Put(buf)

    buf.WriteString("HTTP/1.1 200 OK\r\n")
    buf.WriteString("Content-Type: application/json\r\n")
    buf.WriteString("\r\n")
    buf.Write(data)

    // Return a copy since we're returning buf to pool
    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())
    return result
}
```

### Tiered Buffer Pool for Variable Sizes

When buffer sizes vary significantly, use tiered pools:

```go
package main

import (
    "sync"
)

// TieredBufferPool provides buffers in different size classes
type TieredBufferPool struct {
    small  sync.Pool // 1KB
    medium sync.Pool // 8KB
    large  sync.Pool // 64KB
}

func NewTieredBufferPool() *TieredBufferPool {
    return &TieredBufferPool{
        small: sync.Pool{
            New: func() interface{} {
                buf := make([]byte, 1024)
                return &buf
            },
        },
        medium: sync.Pool{
            New: func() interface{} {
                buf := make([]byte, 8*1024)
                return &buf
            },
        },
        large: sync.Pool{
            New: func() interface{} {
                buf := make([]byte, 64*1024)
                return &buf
            },
        },
    }
}

// Get returns a buffer at least as large as the requested size
func (p *TieredBufferPool) Get(size int) *[]byte {
    switch {
    case size <= 1024:
        return p.small.Get().(*[]byte)
    case size <= 8*1024:
        return p.medium.Get().(*[]byte)
    case size <= 64*1024:
        return p.large.Get().(*[]byte)
    default:
        // Allocate directly for very large requests
        buf := make([]byte, size)
        return &buf
    }
}

// Put returns a buffer to the appropriate pool
func (p *TieredBufferPool) Put(buf *[]byte) {
    capacity := cap(*buf)
    *buf = (*buf)[:0] // Reset length

    switch {
    case capacity <= 1024:
        p.small.Put(buf)
    case capacity <= 8*1024:
        p.medium.Put(buf)
    case capacity <= 64*1024:
        p.large.Put(buf)
    // Oversized buffers are not pooled
    }
}
```

### File Copy with Pooled Buffers

Real-world example of buffer pooling for file operations:

```go
package main

import (
    "io"
    "os"
    "sync"
)

// CopyBufferPool manages buffers for file copying
var copyBufferPool = sync.Pool{
    New: func() interface{} {
        // 32KB is optimal for most file systems
        buf := make([]byte, 32*1024)
        return &buf
    },
}

// CopyFile copies src to dst using pooled buffers
func CopyFile(src, dst string) error {
    sourceFile, err := os.Open(src)
    if err != nil {
        return err
    }
    defer sourceFile.Close()

    destFile, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer destFile.Close()

    // Get buffer from pool
    buf := copyBufferPool.Get().(*[]byte)
    defer func() {
        // Reset and return to pool
        for i := range *buf {
            (*buf)[i] = 0 // Clear sensitive data
        }
        copyBufferPool.Put(buf)
    }()

    // Copy using pooled buffer
    _, err = io.CopyBuffer(destFile, sourceFile, *buf)
    return err
}
```

## JSON Encoder/Decoder Pools

JSON processing is CPU-intensive. Pooling encoders and decoders significantly improves performance.

### Basic JSON Encoder Pool

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "sync"
)

// JSONEncoderPool pools JSON encoders with their buffers
type JSONEncoderPool struct {
    pool sync.Pool
}

type encoderWrapper struct {
    buf     *bytes.Buffer
    encoder *json.Encoder
}

func NewJSONEncoderPool() *JSONEncoderPool {
    return &JSONEncoderPool{
        pool: sync.Pool{
            New: func() interface{} {
                buf := bytes.NewBuffer(make([]byte, 0, 1024))
                return &encoderWrapper{
                    buf:     buf,
                    encoder: json.NewEncoder(buf),
                }
            },
        },
    }
}

// Encode marshals v to JSON using a pooled encoder
func (p *JSONEncoderPool) Encode(v interface{}) ([]byte, error) {
    w := p.pool.Get().(*encoderWrapper)
    defer func() {
        w.buf.Reset()
        p.pool.Put(w)
    }()

    if err := w.encoder.Encode(v); err != nil {
        return nil, err
    }

    // Remove trailing newline that Encode adds
    b := w.buf.Bytes()
    if len(b) > 0 && b[len(b)-1] == '\n' {
        b = b[:len(b)-1]
    }

    // Return a copy
    result := make([]byte, len(b))
    copy(result, b)
    return result, nil
}
```

### JSON Decoder Pool with Buffer Reuse

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "sync"
)

// JSONDecoderPool pools JSON decoders
type JSONDecoderPool struct {
    pool sync.Pool
}

type decoderWrapper struct {
    reader  *bytes.Reader
    decoder *json.Decoder
}

func NewJSONDecoderPool() *JSONDecoderPool {
    return &JSONDecoderPool{
        pool: sync.Pool{
            New: func() interface{} {
                reader := bytes.NewReader(nil)
                return &decoderWrapper{
                    reader:  reader,
                    decoder: json.NewDecoder(reader),
                }
            },
        },
    }
}

// Decode unmarshals JSON data into v using a pooled decoder
func (p *JSONDecoderPool) Decode(data []byte, v interface{}) error {
    w := p.pool.Get().(*decoderWrapper)
    defer p.pool.Put(w)

    // Reset reader with new data
    w.reader.Reset(data)

    // Create new decoder for the reset reader
    // (json.Decoder caches state, so we need a fresh one)
    w.decoder = json.NewDecoder(w.reader)

    return w.decoder.Decode(v)
}
```

### Production-Ready JSON Processor

A complete JSON processor with both encoding and decoding:

```go
package main

import (
    "bytes"
    "encoding/json"
    "sync"
)

// JSONProcessor provides high-performance JSON operations
type JSONProcessor struct {
    bufferPool sync.Pool
}

func NewJSONProcessor() *JSONProcessor {
    return &JSONProcessor{
        bufferPool: sync.Pool{
            New: func() interface{} {
                return bytes.NewBuffer(make([]byte, 0, 4096))
            },
        },
    }
}

// Marshal encodes v to JSON bytes using pooled buffers
func (jp *JSONProcessor) Marshal(v interface{}) ([]byte, error) {
    buf := jp.bufferPool.Get().(*bytes.Buffer)
    defer func() {
        if buf.Cap() <= 64*1024 { // Only pool reasonable sizes
            buf.Reset()
            jp.bufferPool.Put(buf)
        }
    }()

    enc := json.NewEncoder(buf)
    enc.SetEscapeHTML(false) // Faster, but be careful with HTML

    if err := enc.Encode(v); err != nil {
        return nil, err
    }

    // Copy result (buffer returns to pool)
    data := buf.Bytes()
    result := make([]byte, len(data)-1) // Exclude trailing newline
    copy(result, data)

    return result, nil
}

// Unmarshal decodes JSON data into v
func (jp *JSONProcessor) Unmarshal(data []byte, v interface{}) error {
    return json.Unmarshal(data, v)
}

// MarshalIndent produces formatted JSON
func (jp *JSONProcessor) MarshalIndent(v interface{}, prefix, indent string) ([]byte, error) {
    buf := jp.bufferPool.Get().(*bytes.Buffer)
    defer func() {
        if buf.Cap() <= 64*1024 {
            buf.Reset()
            jp.bufferPool.Put(buf)
        }
    }()

    enc := json.NewEncoder(buf)
    enc.SetIndent(prefix, indent)
    enc.SetEscapeHTML(false)

    if err := enc.Encode(v); err != nil {
        return nil, err
    }

    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())
    return result, nil
}
```

### HTTP Handler with JSON Pooling

Practical example in an HTTP context:

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "sync"
)

// APIHandler demonstrates pooling in HTTP handlers
type APIHandler struct {
    bufferPool sync.Pool
}

func NewAPIHandler() *APIHandler {
    return &APIHandler{
        bufferPool: sync.Pool{
            New: func() interface{} {
                return bytes.NewBuffer(make([]byte, 0, 4096))
            },
        },
    }
}

// Response is a generic API response
type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// WriteJSON writes a JSON response using pooled buffers
func (h *APIHandler) WriteJSON(w http.ResponseWriter, status int, data interface{}) {
    buf := h.bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        h.bufferPool.Put(buf)
    }()

    resp := Response{
        Success: status < 400,
        Data:    data,
    }

    enc := json.NewEncoder(buf)
    if err := enc.Encode(resp); err != nil {
        http.Error(w, "Internal Server Error", 500)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    w.Write(buf.Bytes())
}
```

## Benchmarking Pool Benefits

Let's measure the actual benefits of using `sync.Pool`.

### Basic Benchmark Setup

```go
package main

import (
    "bytes"
    "sync"
    "testing"
)

// BenchmarkWithoutPool measures allocation without pooling
func BenchmarkWithoutPool(b *testing.B) {
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        buf := bytes.NewBuffer(make([]byte, 0, 4096))
        buf.WriteString("Hello, World!")
        _ = buf.Bytes()
    }
}

// BenchmarkWithPool measures allocation with pooling
func BenchmarkWithPool(b *testing.B) {
    pool := sync.Pool{
        New: func() interface{} {
            return bytes.NewBuffer(make([]byte, 0, 4096))
        },
    }

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        buf := pool.Get().(*bytes.Buffer)
        buf.WriteString("Hello, World!")
        _ = buf.Bytes()
        buf.Reset()
        pool.Put(buf)
    }
}
```

### Concurrent Benchmark

Test pool performance under concurrent load:

```go
package main

import (
    "bytes"
    "sync"
    "testing"
)

// BenchmarkPoolConcurrent tests pool under concurrent access
func BenchmarkPoolConcurrent(b *testing.B) {
    pool := sync.Pool{
        New: func() interface{} {
            return bytes.NewBuffer(make([]byte, 0, 4096))
        },
    }

    b.ReportAllocs()
    b.ResetTimer()

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            buf := pool.Get().(*bytes.Buffer)
            buf.WriteString("Concurrent test data")
            _ = buf.Bytes()
            buf.Reset()
            pool.Put(buf)
        }
    })
}

// BenchmarkNonPoolConcurrent tests without pool under concurrent access
func BenchmarkNonPoolConcurrent(b *testing.B) {
    b.ReportAllocs()

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            buf := bytes.NewBuffer(make([]byte, 0, 4096))
            buf.WriteString("Concurrent test data")
            _ = buf.Bytes()
        }
    })
}
```

### Real-World JSON Benchmark

```go
package main

import (
    "bytes"
    "encoding/json"
    "sync"
    "testing"
)

type TestPayload struct {
    ID      int64             `json:"id"`
    Name    string            `json:"name"`
    Tags    []string          `json:"tags"`
    Meta    map[string]string `json:"meta"`
}

var testData = TestPayload{
    ID:   12345,
    Name: "Test Object",
    Tags: []string{"tag1", "tag2", "tag3"},
    Meta: map[string]string{
        "key1": "value1",
        "key2": "value2",
    },
}

// BenchmarkJSONWithoutPool benchmarks JSON encoding without pooling
func BenchmarkJSONWithoutPool(b *testing.B) {
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        data, _ := json.Marshal(testData)
        _ = data
    }
}

// BenchmarkJSONWithPool benchmarks JSON encoding with pooling
func BenchmarkJSONWithPool(b *testing.B) {
    pool := sync.Pool{
        New: func() interface{} {
            return bytes.NewBuffer(make([]byte, 0, 512))
        },
    }

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        buf := pool.Get().(*bytes.Buffer)

        enc := json.NewEncoder(buf)
        _ = enc.Encode(testData)

        data := make([]byte, buf.Len())
        copy(data, buf.Bytes())

        buf.Reset()
        pool.Put(buf)

        _ = data
    }
}
```

### Interpreting Benchmark Results

When you run these benchmarks, you'll typically see results like:

```
BenchmarkWithoutPool-8     5000000    320 ns/op    4224 B/op    2 allocs/op
BenchmarkWithPool-8       20000000     85 ns/op       0 B/op    0 allocs/op

BenchmarkJSONWithoutPool-8   1000000   1200 ns/op     384 B/op    4 allocs/op
BenchmarkJSONWithPool-8      2000000    650 ns/op     128 B/op    1 allocs/op
```

Key metrics to analyze:

```go
/*
Benchmark Analysis Guide:

1. ns/op (nanoseconds per operation)
   - Lower is better
   - Pool typically shows 2-5x improvement

2. B/op (bytes allocated per operation)
   - Pool should show significant reduction
   - Target: 0 or near-zero for hot paths

3. allocs/op (allocations per operation)
   - Pool should reduce this to 0 or 1
   - Each allocation adds GC pressure

4. Throughput calculation:
   ops/second = 1,000,000,000 / ns/op

   Without pool: 1B / 320 = 3.1M ops/sec
   With pool:    1B / 85  = 11.7M ops/sec

   Improvement: 3.8x throughput increase!
*/
```

## Advanced Patterns and Best Practices

### Pool Size Monitoring

Track pool effectiveness with metrics:

```go
package main

import (
    "sync"
    "sync/atomic"
)

// MonitoredPool tracks pool statistics
type MonitoredPool struct {
    pool     sync.Pool
    hits     uint64
    misses   uint64
    puts     uint64
    discards uint64
    maxSize  int
}

func NewMonitoredPool(maxSize int, newFunc func() interface{}) *MonitoredPool {
    mp := &MonitoredPool{maxSize: maxSize}
    mp.pool.New = func() interface{} {
        atomic.AddUint64(&mp.misses, 1)
        return newFunc()
    }
    return mp
}

func (mp *MonitoredPool) Get() interface{} {
    obj := mp.pool.Get()
    if obj != nil {
        atomic.AddUint64(&mp.hits, 1)
    }
    return obj
}

func (mp *MonitoredPool) Put(obj interface{}) {
    atomic.AddUint64(&mp.puts, 1)
    mp.pool.Put(obj)
}

// Stats returns current pool statistics
func (mp *MonitoredPool) Stats() (hits, misses, puts, discards uint64) {
    return atomic.LoadUint64(&mp.hits),
        atomic.LoadUint64(&mp.misses),
        atomic.LoadUint64(&mp.puts),
        atomic.LoadUint64(&mp.discards)
}

// HitRate returns the cache hit rate
func (mp *MonitoredPool) HitRate() float64 {
    hits := atomic.LoadUint64(&mp.hits)
    misses := atomic.LoadUint64(&mp.misses)
    total := hits + misses
    if total == 0 {
        return 0
    }
    return float64(hits) / float64(total)
}
```

### Graceful Pool Warming

Pre-populate pools to avoid cold-start latency:

```go
package main

import (
    "sync"
)

// WarmPool pre-populates a pool with objects
func WarmPool(pool *sync.Pool, count int) {
    objects := make([]interface{}, count)

    // Allocate objects
    for i := 0; i < count; i++ {
        objects[i] = pool.Get()
    }

    // Return them to pool
    for _, obj := range objects {
        pool.Put(obj)
    }
}

// Example: Warming a buffer pool at startup
func initBufferPool() *sync.Pool {
    pool := &sync.Pool{
        New: func() interface{} {
            return make([]byte, 4096)
        },
    }

    // Pre-warm with 100 buffers
    WarmPool(pool, 100)

    return pool
}
```

### Pool with Size Limits

Prevent unbounded memory growth:

```go
package main

import (
    "sync"
    "sync/atomic"
)

// LimitedPool prevents unbounded pool growth
type LimitedPool struct {
    pool      sync.Pool
    allocated int64
    maxSize   int64
    objSize   int64
}

func NewLimitedPool(maxSize, objSize int64, newFunc func() interface{}) *LimitedPool {
    lp := &LimitedPool{
        maxSize: maxSize,
        objSize: objSize,
    }
    lp.pool.New = func() interface{} {
        atomic.AddInt64(&lp.allocated, objSize)
        return newFunc()
    }
    return lp
}

func (lp *LimitedPool) Get() interface{} {
    return lp.pool.Get()
}

func (lp *LimitedPool) Put(obj interface{}) {
    // Check if we're over limit
    if atomic.LoadInt64(&lp.allocated) > lp.maxSize {
        // Don't return to pool, let GC reclaim
        atomic.AddInt64(&lp.allocated, -lp.objSize)
        return
    }
    lp.pool.Put(obj)
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Storing Pointers to Pooled Objects

```go
// BAD: Storing reference to pooled object
type BadCache struct {
    lastResult *bytes.Buffer // Danger! This may point to reused buffer
    pool       sync.Pool
}

func (c *BadCache) Process() {
    buf := c.pool.Get().(*bytes.Buffer)
    // Work with buf...
    c.lastResult = buf // BAD: Storing pointer to pooled object
    c.pool.Put(buf)    // Another goroutine might now modify lastResult!
}

// GOOD: Copy data before returning to pool
type GoodCache struct {
    lastResult []byte
    pool       sync.Pool
}

func (c *GoodCache) Process() {
    buf := c.pool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        c.pool.Put(buf)
    }()

    // Work with buf...

    // Copy data before returning buffer
    c.lastResult = make([]byte, buf.Len())
    copy(c.lastResult, buf.Bytes())
}
```

### Pitfall 2: Forgetting the New Function

```go
// BAD: No New function - Get() returns nil when pool is empty
var badPool = sync.Pool{}

func useBadPool() {
    obj := badPool.Get()
    if obj == nil {
        // Have to handle nil case everywhere
        obj = createNewObject()
    }
    // Use obj...
}

// GOOD: Always provide New function
var goodPool = sync.Pool{
    New: func() interface{} {
        return createNewObject()
    },
}

func useGoodPool() {
    obj := goodPool.Get() // Never nil!
    // Use obj...
}
```

### Pitfall 3: Not Resetting Objects

```go
// BAD: Data leak between requests
type UserRequest struct {
    UserID   int64
    APIKey   string // Sensitive!
    Payload  []byte
}

func handleRequestBad(pool *sync.Pool) {
    req := pool.Get().(*UserRequest)
    defer pool.Put(req) // BAD: Not resetting!

    req.UserID = 123
    req.APIKey = "secret-key"
    // Process...
    // Next user might see previous user's APIKey!
}

// GOOD: Always reset before returning
func handleRequestGood(pool *sync.Pool) {
    req := pool.Get().(*UserRequest)
    defer func() {
        req.UserID = 0
        req.APIKey = ""
        req.Payload = req.Payload[:0]
        pool.Put(req)
    }()

    req.UserID = 123
    req.APIKey = "secret-key"
    // Process...
}
```

## Summary

`sync.Pool` is a powerful tool for reducing garbage collection pressure in high-throughput Go applications. Here are the key takeaways:

1. **When to Use**: High-frequency allocations of short-lived, uniform objects
2. **When to Avoid**: Long-lived objects, variable sizes, complex cleanup requirements
3. **Always Reset**: Clear all fields before returning objects to the pool
4. **Use defer**: Guarantee objects are returned even on error paths
5. **Copy Before Return**: Never store references to pooled objects
6. **Provide New Function**: Always define how to create new objects
7. **Benchmark**: Measure actual benefits in your specific use case
8. **Monitor**: Track hit rates and memory usage in production

By following these patterns, you can achieve significant performance improvements in memory-intensive applications while maintaining code safety and correctness.
