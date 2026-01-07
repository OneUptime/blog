# How to Implement Object Pooling in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Object Pooling, Performance, Memory, Optimization

Description: Implement object pooling patterns in Go to reduce memory allocations and garbage collection pressure in high-throughput services.

---

Object pooling is a design pattern that can dramatically improve the performance of high-throughput Go services by reusing objects instead of allocating new ones. When your application creates and destroys many short-lived objects, the garbage collector must work harder, leading to increased latency and CPU usage. This guide explores how to implement effective object pooling strategies in Go.

## Understanding Object Pooling

Object pooling maintains a collection of reusable objects that can be borrowed when needed and returned after use. Instead of allocating memory for each new object, the application retrieves an existing object from the pool, uses it, and returns it for future reuse.

### Benefits of Object Pooling

1. **Reduced Memory Allocations**: Fewer calls to the memory allocator
2. **Lower GC Pressure**: Less garbage means less frequent and shorter GC pauses
3. **Improved Latency**: More predictable response times
4. **Better Cache Utilization**: Reused objects may already be in CPU cache
5. **Resource Conservation**: Especially important for expensive resources like connections

### When to Use Object Pooling

Object pooling is most beneficial when:

- Objects are frequently allocated and deallocated
- Object creation is expensive (memory, CPU, or I/O)
- Objects have similar lifecycles
- High throughput is required with low latency
- GC pauses are affecting application performance

## Using sync.Pool: Go's Built-in Object Pool

Go's standard library provides `sync.Pool`, a concurrent-safe pool for temporary object reuse. It's designed for building efficient, thread-safe free lists.

### Basic sync.Pool Usage

This example demonstrates the fundamental pattern of creating, getting, and putting objects with sync.Pool:

```go
package main

import (
    "bytes"
    "fmt"
    "sync"
)

// Create a pool of byte buffers
var bufferPool = sync.Pool{
    // New specifies a function to generate a new value
    // when the pool is empty
    New: func() interface{} {
        fmt.Println("Allocating new buffer")
        return new(bytes.Buffer)
    },
}

func main() {
    // Get a buffer from the pool
    buf := bufferPool.Get().(*bytes.Buffer)

    // Use the buffer
    buf.WriteString("Hello, Object Pooling!")
    fmt.Println(buf.String())

    // Reset the buffer before returning to pool
    buf.Reset()

    // Return the buffer to the pool
    bufferPool.Put(buf)

    // Get the buffer again (should reuse the same one)
    buf2 := bufferPool.Get().(*bytes.Buffer)
    buf2.WriteString("Reused buffer!")
    fmt.Println(buf2.String())

    buf2.Reset()
    bufferPool.Put(buf2)
}
```

### Understanding sync.Pool Behavior

The `sync.Pool` has some important characteristics to understand:

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
)

// Counter tracks how many objects we create
type Counter struct {
    ID    int
    Value int
}

var (
    counterPool sync.Pool
    idCounter   int
    mu          sync.Mutex
)

func init() {
    counterPool = sync.Pool{
        New: func() interface{} {
            mu.Lock()
            idCounter++
            id := idCounter
            mu.Unlock()
            fmt.Printf("Creating new Counter with ID: %d\n", id)
            return &Counter{ID: id}
        },
    }
}

func main() {
    // Get several objects
    objects := make([]*Counter, 5)
    for i := 0; i < 5; i++ {
        objects[i] = counterPool.Get().(*Counter)
        objects[i].Value = i * 10
        fmt.Printf("Got Counter ID: %d, Value: %d\n", objects[i].ID, objects[i].Value)
    }

    // Return all objects to pool
    for _, obj := range objects {
        obj.Value = 0 // Reset before returning
        counterPool.Put(obj)
    }

    fmt.Println("\n--- After GC ---")

    // Force garbage collection
    // Note: sync.Pool may clear objects during GC
    runtime.GC()

    // Get objects again - some may be new due to GC
    for i := 0; i < 3; i++ {
        obj := counterPool.Get().(*Counter)
        fmt.Printf("Got Counter ID: %d\n", obj.ID)
        counterPool.Put(obj)
    }
}
```

### sync.Pool with Generic Types (Go 1.18+)

Using generics to create type-safe pools eliminates the need for type assertions:

```go
package main

import (
    "fmt"
    "sync"
)

// Pool is a generic wrapper around sync.Pool
type Pool[T any] struct {
    pool sync.Pool
}

// NewPool creates a new generic pool with the given constructor
func NewPool[T any](newFunc func() T) *Pool[T] {
    return &Pool[T]{
        pool: sync.Pool{
            New: func() interface{} {
                return newFunc()
            },
        },
    }
}

// Get retrieves an item from the pool
func (p *Pool[T]) Get() T {
    return p.pool.Get().(T)
}

// Put returns an item to the pool
func (p *Pool[T]) Put(x T) {
    p.pool.Put(x)
}

// Request represents an HTTP-like request object
type Request struct {
    Method  string
    Path    string
    Headers map[string]string
    Body    []byte
}

// Reset clears the request for reuse
func (r *Request) Reset() {
    r.Method = ""
    r.Path = ""
    // Reuse the map instead of creating a new one
    for k := range r.Headers {
        delete(r.Headers, k)
    }
    r.Body = r.Body[:0]
}

func main() {
    // Create a type-safe pool for Request objects
    requestPool := NewPool(func() *Request {
        return &Request{
            Headers: make(map[string]string),
            Body:    make([]byte, 0, 1024),
        }
    })

    // Get a request - no type assertion needed
    req := requestPool.Get()
    req.Method = "POST"
    req.Path = "/api/data"
    req.Headers["Content-Type"] = "application/json"
    req.Body = append(req.Body, `{"key": "value"}`...)

    fmt.Printf("Request: %s %s\n", req.Method, req.Path)

    // Reset and return
    req.Reset()
    requestPool.Put(req)
}
```

## Custom Pool Implementations with Size Limits

While `sync.Pool` is excellent for many use cases, it doesn't provide size limits. Here's how to build custom pools with bounded sizes.

### Bounded Pool with Channel

This implementation uses a buffered channel to create a pool with a maximum size:

```go
package main

import (
    "errors"
    "fmt"
    "sync/atomic"
    "time"
)

// BoundedPool provides a fixed-size object pool
type BoundedPool[T any] struct {
    pool     chan T
    factory  func() T
    reset    func(T)
    maxSize  int
    created  int64
    borrowed int64
    returned int64
}

// NewBoundedPool creates a pool with a maximum size
func NewBoundedPool[T any](maxSize int, factory func() T, reset func(T)) *BoundedPool[T] {
    return &BoundedPool[T]{
        pool:    make(chan T, maxSize),
        factory: factory,
        reset:   reset,
        maxSize: maxSize,
    }
}

// Get retrieves an object from the pool or creates a new one
func (p *BoundedPool[T]) Get() T {
    atomic.AddInt64(&p.borrowed, 1)

    select {
    case obj := <-p.pool:
        return obj
    default:
        // Pool is empty, create a new object
        atomic.AddInt64(&p.created, 1)
        return p.factory()
    }
}

// GetWithTimeout tries to get an object within the timeout duration
func (p *BoundedPool[T]) GetWithTimeout(timeout time.Duration) (T, error) {
    atomic.AddInt64(&p.borrowed, 1)

    select {
    case obj := <-p.pool:
        return obj, nil
    case <-time.After(timeout):
        var zero T
        return zero, errors.New("timeout waiting for pool object")
    }
}

// Put returns an object to the pool
func (p *BoundedPool[T]) Put(obj T) {
    // Reset the object before returning
    if p.reset != nil {
        p.reset(obj)
    }

    atomic.AddInt64(&p.returned, 1)

    select {
    case p.pool <- obj:
        // Object returned to pool
    default:
        // Pool is full, discard the object
    }
}

// Stats returns pool statistics
func (p *BoundedPool[T]) Stats() (created, borrowed, returned int64) {
    return atomic.LoadInt64(&p.created),
        atomic.LoadInt64(&p.borrowed),
        atomic.LoadInt64(&p.returned)
}

// Size returns the current number of objects in the pool
func (p *BoundedPool[T]) Size() int {
    return len(p.pool)
}

// Buffer is a simple buffer type for demonstration
type Buffer struct {
    Data []byte
}

func main() {
    // Create a bounded pool of buffers
    pool := NewBoundedPool(
        10, // Maximum 10 buffers in pool
        func() *Buffer {
            fmt.Println("Creating new buffer")
            return &Buffer{Data: make([]byte, 0, 4096)}
        },
        func(b *Buffer) {
            b.Data = b.Data[:0] // Reset slice but keep capacity
        },
    )

    // Pre-warm the pool
    buffers := make([]*Buffer, 5)
    for i := 0; i < 5; i++ {
        buffers[i] = pool.Get()
    }
    for _, b := range buffers {
        pool.Put(b)
    }

    fmt.Printf("Pool size after pre-warming: %d\n", pool.Size())

    // Simulate usage
    for i := 0; i < 3; i++ {
        buf := pool.Get()
        buf.Data = append(buf.Data, []byte("Hello, World!")...)
        fmt.Printf("Buffer size: %d\n", len(buf.Data))
        pool.Put(buf)
    }

    created, borrowed, returned := pool.Stats()
    fmt.Printf("Stats - Created: %d, Borrowed: %d, Returned: %d\n",
        created, borrowed, returned)
}
```

### Leaky Bucket Pool with Expiration

This implementation adds object expiration to prevent stale resources:

```go
package main

import (
    "container/list"
    "fmt"
    "sync"
    "time"
)

// poolItem wraps an object with creation time
type poolItem[T any] struct {
    value     T
    createdAt time.Time
}

// ExpiringPool is a pool that expires idle objects
type ExpiringPool[T any] struct {
    mu       sync.Mutex
    items    *list.List
    factory  func() T
    reset    func(T)
    destroy  func(T)
    maxIdle  int
    maxAge   time.Duration
    stopChan chan struct{}
}

// NewExpiringPool creates a pool with expiration
func NewExpiringPool[T any](
    maxIdle int,
    maxAge time.Duration,
    factory func() T,
    reset func(T),
    destroy func(T),
) *ExpiringPool[T] {
    p := &ExpiringPool[T]{
        items:    list.New(),
        factory:  factory,
        reset:    reset,
        destroy:  destroy,
        maxIdle:  maxIdle,
        maxAge:   maxAge,
        stopChan: make(chan struct{}),
    }

    // Start cleanup goroutine
    go p.cleanup()

    return p
}

// Get retrieves an object from the pool
func (p *ExpiringPool[T]) Get() T {
    p.mu.Lock()
    defer p.mu.Unlock()

    now := time.Now()

    // Find a non-expired item
    for p.items.Len() > 0 {
        elem := p.items.Front()
        item := elem.Value.(*poolItem[T])
        p.items.Remove(elem)

        // Check if item has expired
        if now.Sub(item.createdAt) < p.maxAge {
            return item.value
        }

        // Item expired, destroy it
        if p.destroy != nil {
            p.destroy(item.value)
        }
    }

    // No valid items, create new one
    return p.factory()
}

// Put returns an object to the pool
func (p *ExpiringPool[T]) Put(obj T) {
    if p.reset != nil {
        p.reset(obj)
    }

    p.mu.Lock()
    defer p.mu.Unlock()

    // Check if pool is full
    if p.items.Len() >= p.maxIdle {
        if p.destroy != nil {
            p.destroy(obj)
        }
        return
    }

    p.items.PushBack(&poolItem[T]{
        value:     obj,
        createdAt: time.Now(),
    })
}

// cleanup periodically removes expired items
func (p *ExpiringPool[T]) cleanup() {
    ticker := time.NewTicker(p.maxAge / 2)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            p.removeExpired()
        case <-p.stopChan:
            return
        }
    }
}

// removeExpired removes all expired items
func (p *ExpiringPool[T]) removeExpired() {
    p.mu.Lock()
    defer p.mu.Unlock()

    now := time.Now()
    var next *list.Element

    for elem := p.items.Front(); elem != nil; elem = next {
        next = elem.Next()
        item := elem.Value.(*poolItem[T])

        if now.Sub(item.createdAt) >= p.maxAge {
            p.items.Remove(elem)
            if p.destroy != nil {
                p.destroy(item.value)
            }
        }
    }
}

// Close stops the cleanup goroutine and destroys all items
func (p *ExpiringPool[T]) Close() {
    close(p.stopChan)

    p.mu.Lock()
    defer p.mu.Unlock()

    for elem := p.items.Front(); elem != nil; elem = elem.Next() {
        item := elem.Value.(*poolItem[T])
        if p.destroy != nil {
            p.destroy(item.value)
        }
    }
    p.items.Init()
}

// Size returns current pool size
func (p *ExpiringPool[T]) Size() int {
    p.mu.Lock()
    defer p.mu.Unlock()
    return p.items.Len()
}

func main() {
    pool := NewExpiringPool(
        5,              // Max 5 idle items
        5*time.Second,  // Items expire after 5 seconds
        func() *Buffer {
            fmt.Println("Creating new buffer")
            return &Buffer{Data: make([]byte, 0, 4096)}
        },
        func(b *Buffer) {
            b.Data = b.Data[:0]
        },
        func(b *Buffer) {
            fmt.Println("Destroying buffer")
        },
    )
    defer pool.Close()

    // Use the pool
    for i := 0; i < 3; i++ {
        buf := pool.Get()
        buf.Data = append(buf.Data, []byte("data")...)
        pool.Put(buf)
    }

    fmt.Printf("Pool size: %d\n", pool.Size())

    // Wait for expiration
    fmt.Println("Waiting for items to expire...")
    time.Sleep(6 * time.Second)

    fmt.Printf("Pool size after expiration: %d\n", pool.Size())
}
```

## Buffer Pools for I/O Operations

Buffer pooling is especially effective for I/O operations where temporary buffers are frequently needed.

### Sized Buffer Pool

This implementation provides buffers of different sizes to reduce memory waste:

```go
package main

import (
    "fmt"
    "sync"
)

// BufferPool provides buffers of various sizes
type BufferPool struct {
    pools []*sync.Pool
    sizes []int
}

// Common buffer sizes (powers of 2)
var defaultSizes = []int{
    64,      // 64 bytes
    256,     // 256 bytes
    1024,    // 1 KB
    4096,    // 4 KB
    16384,   // 16 KB
    65536,   // 64 KB
    262144,  // 256 KB
    1048576, // 1 MB
}

// NewBufferPool creates a new sized buffer pool
func NewBufferPool() *BufferPool {
    bp := &BufferPool{
        pools: make([]*sync.Pool, len(defaultSizes)),
        sizes: defaultSizes,
    }

    for i, size := range defaultSizes {
        size := size // Capture for closure
        bp.pools[i] = &sync.Pool{
            New: func() interface{} {
                buf := make([]byte, size)
                return &buf
            },
        }
    }

    return bp
}

// Get returns a buffer of at least the requested size
func (bp *BufferPool) Get(size int) []byte {
    for i, s := range bp.sizes {
        if s >= size {
            bufPtr := bp.pools[i].Get().(*[]byte)
            return (*bufPtr)[:size]
        }
    }

    // Size too large for pool, allocate directly
    return make([]byte, size)
}

// Put returns a buffer to the pool
func (bp *BufferPool) Put(buf []byte) {
    cap := cap(buf)

    for i, size := range bp.sizes {
        if size == cap {
            buf = buf[:cap] // Restore full capacity
            bp.pools[i].Put(&buf)
            return
        }
    }

    // Buffer doesn't match any pool size, let GC handle it
}

// GetBuffer returns a buffer and its actual capacity
func (bp *BufferPool) GetBuffer(minSize int) ([]byte, int) {
    buf := bp.Get(minSize)
    return buf, cap(buf)
}

func main() {
    pool := NewBufferPool()

    // Request various sizes
    sizes := []int{50, 100, 500, 2000, 10000, 50000}

    for _, size := range sizes {
        buf, actualCap := pool.GetBuffer(size)
        fmt.Printf("Requested: %d bytes, Got capacity: %d bytes\n",
            size, actualCap)

        // Use buffer
        for i := 0; i < len(buf); i++ {
            buf[i] = byte(i % 256)
        }

        // Return to pool
        pool.Put(buf)
    }
}
```

### Ring Buffer Pool for Streaming

This pattern is useful for streaming applications that need circular buffers:

```go
package main

import (
    "fmt"
    "io"
    "sync"
)

// RingBuffer is a circular buffer for streaming data
type RingBuffer struct {
    data     []byte
    readPos  int
    writePos int
    size     int
    full     bool
}

// NewRingBuffer creates a new ring buffer with the given size
func NewRingBuffer(size int) *RingBuffer {
    return &RingBuffer{
        data: make([]byte, size),
        size: size,
    }
}

// Write implements io.Writer
func (rb *RingBuffer) Write(p []byte) (n int, err error) {
    for _, b := range p {
        if rb.full {
            // Overwrite oldest data
            rb.readPos = (rb.readPos + 1) % rb.size
        }
        rb.data[rb.writePos] = b
        rb.writePos = (rb.writePos + 1) % rb.size
        if rb.writePos == rb.readPos {
            rb.full = true
        }
        n++
    }
    return n, nil
}

// Read implements io.Reader
func (rb *RingBuffer) Read(p []byte) (n int, err error) {
    if rb.readPos == rb.writePos && !rb.full {
        return 0, io.EOF
    }

    for n < len(p) {
        if rb.readPos == rb.writePos && !rb.full {
            break
        }
        p[n] = rb.data[rb.readPos]
        rb.readPos = (rb.readPos + 1) % rb.size
        rb.full = false
        n++
    }

    return n, nil
}

// Reset clears the buffer
func (rb *RingBuffer) Reset() {
    rb.readPos = 0
    rb.writePos = 0
    rb.full = false
}

// Len returns the number of bytes available to read
func (rb *RingBuffer) Len() int {
    if rb.full {
        return rb.size
    }
    if rb.writePos >= rb.readPos {
        return rb.writePos - rb.readPos
    }
    return rb.size - rb.readPos + rb.writePos
}

// RingBufferPool manages a pool of ring buffers
type RingBufferPool struct {
    pool       sync.Pool
    bufferSize int
}

// NewRingBufferPool creates a pool of ring buffers
func NewRingBufferPool(bufferSize int) *RingBufferPool {
    return &RingBufferPool{
        bufferSize: bufferSize,
        pool: sync.Pool{
            New: func() interface{} {
                return NewRingBuffer(bufferSize)
            },
        },
    }
}

// Get retrieves a ring buffer from the pool
func (p *RingBufferPool) Get() *RingBuffer {
    return p.pool.Get().(*RingBuffer)
}

// Put returns a ring buffer to the pool
func (p *RingBufferPool) Put(rb *RingBuffer) {
    rb.Reset()
    p.pool.Put(rb)
}

func main() {
    pool := NewRingBufferPool(1024)

    // Get a ring buffer
    rb := pool.Get()

    // Write some data
    rb.Write([]byte("Hello, Ring Buffer! "))
    rb.Write([]byte("This is streaming data."))

    fmt.Printf("Buffer length: %d\n", rb.Len())

    // Read the data
    data := make([]byte, 100)
    n, _ := rb.Read(data)
    fmt.Printf("Read: %s\n", string(data[:n]))

    // Return to pool
    pool.Put(rb)

    // Reuse
    rb2 := pool.Get()
    rb2.Write([]byte("Reused buffer!"))

    n, _ = rb2.Read(data)
    fmt.Printf("Read from reused: %s\n", string(data[:n]))

    pool.Put(rb2)
}
```

## Connection Pool Pattern

Connection pooling is critical for database and network connections. Here's a robust implementation:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

// Connection represents a generic connection
type Connection struct {
    ID        int
    CreatedAt time.Time
    LastUsed  time.Time
    inUse     bool
}

// IsHealthy checks if the connection is still valid
func (c *Connection) IsHealthy() bool {
    // Simulate health check
    return time.Since(c.CreatedAt) < 30*time.Minute
}

// Close closes the connection
func (c *Connection) Close() error {
    fmt.Printf("Closing connection %d\n", c.ID)
    return nil
}

// ConnectionPool manages a pool of connections
type ConnectionPool struct {
    mu          sync.Mutex
    connections []*Connection
    factory     func() (*Connection, error)

    maxOpen     int
    maxIdle     int
    maxLifetime time.Duration

    numOpen     int64
    numIdle     int64
    waitCount   int64
    waitDone    chan struct{}

    closed bool
}

// PoolConfig holds pool configuration
type PoolConfig struct {
    MaxOpen     int
    MaxIdle     int
    MaxLifetime time.Duration
}

// NewConnectionPool creates a new connection pool
func NewConnectionPool(factory func() (*Connection, error), config PoolConfig) *ConnectionPool {
    return &ConnectionPool{
        connections: make([]*Connection, 0, config.MaxIdle),
        factory:     factory,
        maxOpen:     config.MaxOpen,
        maxIdle:     config.MaxIdle,
        maxLifetime: config.MaxLifetime,
        waitDone:    make(chan struct{}, 100),
    }
}

// Get retrieves a connection from the pool
func (p *ConnectionPool) Get(ctx context.Context) (*Connection, error) {
    p.mu.Lock()

    if p.closed {
        p.mu.Unlock()
        return nil, errors.New("pool is closed")
    }

    // Try to get an idle connection
    for len(p.connections) > 0 {
        // Get the last connection (LIFO for better cache locality)
        n := len(p.connections)
        conn := p.connections[n-1]
        p.connections = p.connections[:n-1]
        p.numIdle--

        // Check if connection is still healthy
        if !conn.IsHealthy() ||
           (p.maxLifetime > 0 && time.Since(conn.CreatedAt) > p.maxLifetime) {
            conn.Close()
            p.numOpen--
            continue
        }

        conn.inUse = true
        conn.LastUsed = time.Now()
        p.mu.Unlock()
        return conn, nil
    }

    // Check if we can create a new connection
    if p.maxOpen > 0 && int(p.numOpen) >= p.maxOpen {
        // Wait for a connection to be returned
        p.waitCount++
        p.mu.Unlock()

        select {
        case <-p.waitDone:
            // Someone returned a connection, try again
            return p.Get(ctx)
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    // Create a new connection
    p.numOpen++
    p.mu.Unlock()

    conn, err := p.factory()
    if err != nil {
        p.mu.Lock()
        p.numOpen--
        p.mu.Unlock()
        return nil, err
    }

    conn.inUse = true
    return conn, nil
}

// Put returns a connection to the pool
func (p *ConnectionPool) Put(conn *Connection) error {
    if conn == nil {
        return nil
    }

    p.mu.Lock()
    defer p.mu.Unlock()

    if p.closed {
        conn.Close()
        p.numOpen--
        return nil
    }

    conn.inUse = false
    conn.LastUsed = time.Now()

    // Check if we have waiters
    if p.waitCount > 0 {
        p.waitCount--
        p.connections = append(p.connections, conn)
        p.numIdle++

        select {
        case p.waitDone <- struct{}{}:
        default:
        }
        return nil
    }

    // Check if we should keep this connection
    if int(p.numIdle) >= p.maxIdle {
        conn.Close()
        p.numOpen--
        return nil
    }

    // Return to pool
    p.connections = append(p.connections, conn)
    p.numIdle++
    return nil
}

// Close closes all connections in the pool
func (p *ConnectionPool) Close() error {
    p.mu.Lock()
    defer p.mu.Unlock()

    if p.closed {
        return nil
    }

    p.closed = true

    for _, conn := range p.connections {
        conn.Close()
    }
    p.connections = nil
    p.numOpen = 0
    p.numIdle = 0

    close(p.waitDone)
    return nil
}

// Stats returns pool statistics
func (p *ConnectionPool) Stats() (open, idle, waiting int64) {
    p.mu.Lock()
    defer p.mu.Unlock()
    return atomic.LoadInt64(&p.numOpen),
           atomic.LoadInt64(&p.numIdle),
           int64(p.waitCount)
}

var connectionID int32

func main() {
    pool := NewConnectionPool(
        func() (*Connection, error) {
            id := atomic.AddInt32(&connectionID, 1)
            fmt.Printf("Creating connection %d\n", id)
            return &Connection{
                ID:        int(id),
                CreatedAt: time.Now(),
            }, nil
        },
        PoolConfig{
            MaxOpen:     10,
            MaxIdle:     5,
            MaxLifetime: 30 * time.Minute,
        },
    )
    defer pool.Close()

    // Simulate concurrent usage
    var wg sync.WaitGroup

    for i := 0; i < 20; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()

            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()

            conn, err := pool.Get(ctx)
            if err != nil {
                fmt.Printf("Worker %d: Error getting connection: %v\n", id, err)
                return
            }

            // Simulate work
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("Worker %d: Using connection %d\n", id, conn.ID)

            pool.Put(conn)
        }(i)
    }

    wg.Wait()

    open, idle, waiting := pool.Stats()
    fmt.Printf("Final stats - Open: %d, Idle: %d, Waiting: %d\n",
        open, idle, waiting)
}
```

## Reset and Cleanup Patterns

Proper object cleanup is crucial for safe object reuse. Here are patterns for different scenarios.

### Interface-Based Reset Pattern

Define a Resettable interface for consistent cleanup across types:

```go
package main

import (
    "fmt"
    "sync"
)

// Resettable interface for objects that can be reset
type Resettable interface {
    Reset()
}

// ResettablePool is a generic pool that auto-resets objects
type ResettablePool[T Resettable] struct {
    pool sync.Pool
}

// NewResettablePool creates a new pool for resettable objects
func NewResettablePool[T Resettable](factory func() T) *ResettablePool[T] {
    return &ResettablePool[T]{
        pool: sync.Pool{
            New: func() interface{} {
                return factory()
            },
        },
    }
}

// Get retrieves an object from the pool
func (p *ResettablePool[T]) Get() T {
    return p.pool.Get().(T)
}

// Put resets and returns an object to the pool
func (p *ResettablePool[T]) Put(obj T) {
    obj.Reset()
    p.pool.Put(obj)
}

// Message represents a message with metadata
type Message struct {
    ID      string
    Type    string
    Payload []byte
    Headers map[string]string
    sent    bool
}

// Reset implements Resettable
func (m *Message) Reset() {
    m.ID = ""
    m.Type = ""
    m.Payload = m.Payload[:0]
    for k := range m.Headers {
        delete(m.Headers, k)
    }
    m.sent = false
}

// HTTPRequest represents an HTTP request
type HTTPRequest struct {
    Method      string
    URL         string
    Headers     map[string][]string
    Body        []byte
    QueryParams map[string]string
}

// Reset implements Resettable
func (r *HTTPRequest) Reset() {
    r.Method = ""
    r.URL = ""
    r.Body = r.Body[:0]

    for k := range r.Headers {
        delete(r.Headers, k)
    }
    for k := range r.QueryParams {
        delete(r.QueryParams, k)
    }
}

func main() {
    // Pool for messages
    messagePool := NewResettablePool(func() *Message {
        return &Message{
            Payload: make([]byte, 0, 1024),
            Headers: make(map[string]string),
        }
    })

    // Pool for HTTP requests
    requestPool := NewResettablePool(func() *HTTPRequest {
        return &HTTPRequest{
            Headers:     make(map[string][]string),
            QueryParams: make(map[string]string),
            Body:        make([]byte, 0, 4096),
        }
    })

    // Use message pool
    msg := messagePool.Get()
    msg.ID = "msg-123"
    msg.Type = "notification"
    msg.Headers["priority"] = "high"
    msg.Payload = append(msg.Payload, []byte(`{"event": "alert"}`)...)

    fmt.Printf("Message: %+v\n", msg)
    messagePool.Put(msg)

    // Use request pool
    req := requestPool.Get()
    req.Method = "POST"
    req.URL = "/api/webhook"
    req.Headers["Content-Type"] = []string{"application/json"}
    req.Body = append(req.Body, []byte(`{"data": "test"}`)...)

    fmt.Printf("Request: %s %s\n", req.Method, req.URL)
    requestPool.Put(req)

    // Verify reset worked
    msg2 := messagePool.Get()
    fmt.Printf("Reused message (should be empty): ID=%q, Payload=%q\n",
        msg2.ID, string(msg2.Payload))
    messagePool.Put(msg2)
}
```

### Slice and Map Cleanup Patterns

Different strategies for cleaning slices and maps efficiently:

```go
package main

import (
    "fmt"
)

// SliceCleanupDemo shows different slice reset strategies
func SliceCleanupDemo() {
    fmt.Println("=== Slice Cleanup Patterns ===")

    // Pattern 1: Reset length, keep capacity
    // Best for: Byte slices, frequently reused slices
    slice1 := make([]byte, 0, 1024)
    slice1 = append(slice1, []byte("Hello, World!")...)
    fmt.Printf("Before reset: len=%d, cap=%d\n", len(slice1), cap(slice1))

    slice1 = slice1[:0] // Keep capacity, reset length
    fmt.Printf("After reset: len=%d, cap=%d\n", len(slice1), cap(slice1))

    // Pattern 2: Clear elements for GC, keep capacity
    // Best for: Slices of pointers or interfaces
    type Item struct {
        Name string
        Data []byte
    }

    slice2 := make([]*Item, 0, 10)
    slice2 = append(slice2, &Item{Name: "Item1", Data: make([]byte, 1024)})
    slice2 = append(slice2, &Item{Name: "Item2", Data: make([]byte, 1024)})

    // Clear elements to allow GC of pointed objects
    for i := range slice2 {
        slice2[i] = nil
    }
    slice2 = slice2[:0]
    fmt.Printf("Slice2 after clear: len=%d, cap=%d\n", len(slice2), cap(slice2))

    // Pattern 3: Complete reset with new slice
    // Best for: Security-sensitive data, unpredictable sizes
    slice3 := make([]byte, 1024)
    copy(slice3, []byte("Sensitive data here"))

    // Clear all bytes (for security)
    for i := range slice3 {
        slice3[i] = 0
    }
    slice3 = slice3[:0]
    fmt.Printf("Slice3 after secure clear: len=%d, cap=%d\n", len(slice3), cap(slice3))
}

// MapCleanupDemo shows different map reset strategies
func MapCleanupDemo() {
    fmt.Println("\n=== Map Cleanup Patterns ===")

    // Pattern 1: Delete all keys, keep map
    // Best for: Small maps, frequent reuse
    map1 := make(map[string]int)
    map1["a"] = 1
    map1["b"] = 2
    map1["c"] = 3

    fmt.Printf("Before reset: %v\n", map1)

    for k := range map1 {
        delete(map1, k)
    }
    fmt.Printf("After delete loop: %v (len=%d)\n", map1, len(map1))

    // Pattern 2: Clear with clear() built-in (Go 1.21+)
    // Best for: Simple clearing, modern Go
    map2 := make(map[string]string)
    map2["key1"] = "value1"
    map2["key2"] = "value2"

    clear(map2) // Built-in since Go 1.21
    fmt.Printf("After clear(): %v (len=%d)\n", map2, len(map2))

    // Pattern 3: Create new map
    // Best for: Large maps, security-sensitive data
    map3 := make(map[string][]byte, 100)
    for i := 0; i < 100; i++ {
        map3[fmt.Sprintf("key%d", i)] = make([]byte, 1024)
    }

    // Replace with new map of same capacity
    map3 = make(map[string][]byte, 100)
    fmt.Printf("After new map: len=%d\n", len(map3))
}

// StructCleanupDemo shows struct reset patterns
func StructCleanupDemo() {
    fmt.Println("\n=== Struct Cleanup Patterns ===")

    type ComplexStruct struct {
        ID        int
        Name      string
        Data      []byte
        Tags      []string
        Metadata  map[string]string
        processed bool
    }

    // Create and populate
    s := &ComplexStruct{
        ID:        123,
        Name:      "Example",
        Data:      make([]byte, 0, 1024),
        Tags:      make([]string, 0, 10),
        Metadata:  make(map[string]string),
        processed: true,
    }
    s.Data = append(s.Data, []byte("Some data")...)
    s.Tags = append(s.Tags, "tag1", "tag2")
    s.Metadata["key"] = "value"

    fmt.Printf("Before reset: %+v\n", s)

    // Pattern: Field-by-field reset preserving allocations
    s.ID = 0
    s.Name = ""
    s.Data = s.Data[:0]       // Keep capacity
    s.Tags = s.Tags[:0]       // Keep capacity
    clear(s.Metadata)         // Keep map, clear entries
    s.processed = false

    fmt.Printf("After reset: %+v\n", s)
    fmt.Printf("Data capacity preserved: %d\n", cap(s.Data))
    fmt.Printf("Tags capacity preserved: %d\n", cap(s.Tags))
}

func main() {
    SliceCleanupDemo()
    MapCleanupDemo()
    StructCleanupDemo()
}
```

## Benchmarking Pool Effectiveness

Proper benchmarking is essential to validate that pooling improves performance.

### Basic Pool Benchmark

This benchmark compares allocation performance with and without pooling:

```go
package main

import (
    "bytes"
    "sync"
    "testing"
)

// BenchmarkWithoutPool measures performance without pooling
func BenchmarkWithoutPool(b *testing.B) {
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        buf := new(bytes.Buffer)
        buf.Grow(1024)
        buf.WriteString("Hello, World! This is a test message.")
        _ = buf.String()
    }
}

// BenchmarkWithPool measures performance with sync.Pool
func BenchmarkWithPool(b *testing.B) {
    pool := sync.Pool{
        New: func() interface{} {
            buf := new(bytes.Buffer)
            buf.Grow(1024)
            return buf
        },
    }

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        buf := pool.Get().(*bytes.Buffer)
        buf.WriteString("Hello, World! This is a test message.")
        _ = buf.String()
        buf.Reset()
        pool.Put(buf)
    }
}

// BenchmarkParallelWithoutPool measures parallel performance without pooling
func BenchmarkParallelWithoutPool(b *testing.B) {
    b.ReportAllocs()

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            buf := new(bytes.Buffer)
            buf.Grow(1024)
            buf.WriteString("Hello, World! This is a test message.")
            _ = buf.String()
        }
    })
}

// BenchmarkParallelWithPool measures parallel performance with sync.Pool
func BenchmarkParallelWithPool(b *testing.B) {
    pool := sync.Pool{
        New: func() interface{} {
            buf := new(bytes.Buffer)
            buf.Grow(1024)
            return buf
        },
    }

    b.ReportAllocs()
    b.ResetTimer()

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            buf := pool.Get().(*bytes.Buffer)
            buf.WriteString("Hello, World! This is a test message.")
            _ = buf.String()
            buf.Reset()
            pool.Put(buf)
        }
    })
}
```

### Comprehensive Pool Analysis

A more detailed benchmark that measures GC impact and memory usage:

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
    "time"
)

// LargeObject represents an object with significant allocation
type LargeObject struct {
    ID      int
    Data    []byte
    Strings []string
    Map     map[string]int
}

// NewLargeObject creates a new large object
func NewLargeObject() *LargeObject {
    return &LargeObject{
        Data:    make([]byte, 4096),
        Strings: make([]string, 0, 100),
        Map:     make(map[string]int, 100),
    }
}

// Reset clears the object for reuse
func (o *LargeObject) Reset() {
    o.ID = 0
    o.Data = o.Data[:0]
    o.Strings = o.Strings[:0]
    clear(o.Map)
}

// PoolBenchmark runs a comprehensive benchmark
func PoolBenchmark(iterations int, usePool bool) BenchmarkResult {
    var pool *sync.Pool
    if usePool {
        pool = &sync.Pool{
            New: func() interface{} {
                return NewLargeObject()
            },
        }
    }

    // Force GC before starting
    runtime.GC()

    var m1, m2 runtime.MemStats
    runtime.ReadMemStats(&m1)

    start := time.Now()
    gcStart := m1.NumGC

    for i := 0; i < iterations; i++ {
        var obj *LargeObject

        if usePool {
            obj = pool.Get().(*LargeObject)
        } else {
            obj = NewLargeObject()
        }

        // Simulate work
        obj.ID = i
        obj.Data = append(obj.Data, byte(i%256))
        obj.Strings = append(obj.Strings, fmt.Sprintf("item-%d", i))
        obj.Map[fmt.Sprintf("key-%d", i%100)] = i

        if usePool {
            obj.Reset()
            pool.Put(obj)
        }
    }

    elapsed := time.Since(start)

    runtime.GC()
    runtime.ReadMemStats(&m2)

    return BenchmarkResult{
        Duration:     elapsed,
        Allocations:  m2.Mallocs - m1.Mallocs,
        TotalAlloc:   m2.TotalAlloc - m1.TotalAlloc,
        GCCycles:     m2.NumGC - gcStart,
        HeapInUse:    m2.HeapInuse,
    }
}

// BenchmarkResult holds benchmark results
type BenchmarkResult struct {
    Duration     time.Duration
    Allocations  uint64
    TotalAlloc   uint64
    GCCycles     uint32
    HeapInUse    uint64
}

func (r BenchmarkResult) String() string {
    return fmt.Sprintf(
        "Duration: %v\n"+
            "Allocations: %d\n"+
            "Total Allocated: %.2f MB\n"+
            "GC Cycles: %d\n"+
            "Heap In Use: %.2f MB",
        r.Duration,
        r.Allocations,
        float64(r.TotalAlloc)/(1024*1024),
        r.GCCycles,
        float64(r.HeapInUse)/(1024*1024),
    )
}

func main() {
    iterations := 100000

    fmt.Println("=== Without Pool ===")
    noPoolResult := PoolBenchmark(iterations, false)
    fmt.Println(noPoolResult)

    fmt.Println("\n=== With Pool ===")
    withPoolResult := PoolBenchmark(iterations, true)
    fmt.Println(withPoolResult)

    fmt.Println("\n=== Comparison ===")
    fmt.Printf("Time Improvement: %.2fx faster\n",
        float64(noPoolResult.Duration)/float64(withPoolResult.Duration))
    fmt.Printf("Allocation Reduction: %.2fx fewer\n",
        float64(noPoolResult.Allocations)/float64(withPoolResult.Allocations))
    fmt.Printf("Memory Reduction: %.2fx less\n",
        float64(noPoolResult.TotalAlloc)/float64(withPoolResult.TotalAlloc))
    fmt.Printf("GC Cycles Reduction: %d fewer\n",
        noPoolResult.GCCycles-withPoolResult.GCCycles)
}
```

### Real-World HTTP Handler Benchmark

This example shows pooling in a realistic HTTP server context:

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "sync"
    "testing"
)

// Response represents an API response
type Response struct {
    Status  string         `json:"status"`
    Data    interface{}    `json:"data,omitempty"`
    Error   string         `json:"error,omitempty"`
    buffer  *bytes.Buffer  `json:"-"`
}

// Reset clears the response for reuse
func (r *Response) Reset() {
    r.Status = ""
    r.Data = nil
    r.Error = ""
    if r.buffer != nil {
        r.buffer.Reset()
    }
}

var responsePool = sync.Pool{
    New: func() interface{} {
        return &Response{
            buffer: bytes.NewBuffer(make([]byte, 0, 1024)),
        }
    },
}

// handlerWithPool uses object pooling
func handlerWithPool(w http.ResponseWriter, r *http.Request) {
    resp := responsePool.Get().(*Response)
    defer func() {
        resp.Reset()
        responsePool.Put(resp)
    }()

    resp.Status = "success"
    resp.Data = map[string]interface{}{
        "message": "Hello, World!",
        "count":   42,
    }

    resp.buffer.Reset()
    json.NewEncoder(resp.buffer).Encode(resp)
    w.Header().Set("Content-Type", "application/json")
    w.Write(resp.buffer.Bytes())
}

// handlerWithoutPool creates new objects each time
func handlerWithoutPool(w http.ResponseWriter, r *http.Request) {
    resp := &Response{
        Status: "success",
        Data: map[string]interface{}{
            "message": "Hello, World!",
            "count":   42,
        },
        buffer: bytes.NewBuffer(make([]byte, 0, 1024)),
    }

    json.NewEncoder(resp.buffer).Encode(resp)
    w.Header().Set("Content-Type", "application/json")
    w.Write(resp.buffer.Bytes())
}

func BenchmarkHandlerWithoutPool(b *testing.B) {
    req := httptest.NewRequest("GET", "/api/test", nil)

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        w := httptest.NewRecorder()
        handlerWithoutPool(w, req)
    }
}

func BenchmarkHandlerWithPool(b *testing.B) {
    req := httptest.NewRequest("GET", "/api/test", nil)

    b.ReportAllocs()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        w := httptest.NewRecorder()
        handlerWithPool(w, req)
    }
}

func BenchmarkHandlerParallelWithoutPool(b *testing.B) {
    b.ReportAllocs()

    b.RunParallel(func(pb *testing.PB) {
        req := httptest.NewRequest("GET", "/api/test", nil)
        for pb.Next() {
            w := httptest.NewRecorder()
            handlerWithoutPool(w, req)
        }
    })
}

func BenchmarkHandlerParallelWithPool(b *testing.B) {
    b.ReportAllocs()

    b.RunParallel(func(pb *testing.PB) {
        req := httptest.NewRequest("GET", "/api/test", nil)
        for pb.Next() {
            w := httptest.NewRecorder()
            handlerWithPool(w, req)
        }
    })
}
```

## Best Practices and Common Pitfalls

### Best Practices

1. **Always Reset Objects**: Clear all fields before returning to the pool to prevent data leaks.

2. **Use Appropriate Pool Size**: For bounded pools, size based on expected concurrency.

3. **Benchmark First**: Verify that pooling actually improves your specific workload.

4. **Consider Object Lifetime**: Pools work best for short-lived, frequently created objects.

5. **Handle Pool Exhaustion Gracefully**: For bounded pools, implement timeouts or fallback creation.

### Common Pitfalls to Avoid

Pitfall 1: Forgetting to reset objects can lead to data corruption or leaks.

```go
// BAD: Not resetting before return
pool.Put(obj)

// GOOD: Always reset before return
obj.Reset()
pool.Put(obj)
```

Pitfall 2: Using pools for long-lived objects defeats the purpose.

```go
// BAD: Object lives for entire request lifecycle
obj := pool.Get()
// ... long operation ...
time.Sleep(10 * time.Second)
pool.Put(obj)

// GOOD: Get, use briefly, return quickly
obj := pool.Get()
result := obj.Process(data)
pool.Put(obj)
// Continue with result
```

Pitfall 3: Storing pointers in pooled objects without clearing them.

```go
// BAD: Pointer not cleared, prevents GC of referenced object
type Holder struct {
    Ref *LargeData
}
func (h *Holder) Reset() {
    // Ref still points to LargeData!
}

// GOOD: Clear all references
func (h *Holder) Reset() {
    h.Ref = nil // Allow GC of LargeData
}
```

Pitfall 4: Relying on sync.Pool for resource limiting.

```go
// BAD: sync.Pool doesn't guarantee limits
// Objects may be cleared during GC

// GOOD: Use bounded pool for resource limiting
pool := NewBoundedPool(maxSize, factory, reset)
```

## Conclusion

Object pooling is a powerful optimization technique for high-throughput Go services. By reusing objects instead of constantly allocating new ones, you can significantly reduce memory pressure and GC overhead.

Key takeaways:

1. **Start with sync.Pool** for most use cases - it's simple, concurrent-safe, and works well with Go's GC.

2. **Implement custom pools** when you need bounded sizes, expiration, or specific behaviors.

3. **Always reset objects** properly before returning them to the pool to prevent bugs and data leaks.

4. **Benchmark your specific workload** to ensure pooling provides real benefits.

5. **Use appropriate cleanup patterns** for slices, maps, and structs to maximize memory reuse.

Object pooling is particularly effective for:

- Buffer management in I/O operations
- HTTP request/response handling
- Connection management
- Message processing in event-driven systems
- Any scenario with high allocation rates of similar objects

Remember that premature optimization is the root of all evil. Profile your application first, identify allocation hotspots, and then apply pooling where it provides measurable benefits.
