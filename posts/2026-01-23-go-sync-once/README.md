# How to Use sync.Once for One-Time Initialization in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, sync.Once, Singleton, Initialization, Concurrency

Description: Learn how to use sync.Once in Go for thread-safe one-time initialization, implementing singletons, and lazy loading resources.

---

`sync.Once` ensures a function is executed exactly once, even when called from multiple goroutines. It is perfect for lazy initialization, singleton patterns, and one-time setup.

---

## Basic sync.Once Usage

```go
package main

import (
    "fmt"
    "sync"
)

var once sync.Once

func initialize() {
    fmt.Println("Initializing...")
}

func main() {
    // First call executes the function
    once.Do(initialize)
    
    // Subsequent calls do nothing
    once.Do(initialize)
    once.Do(initialize)
    
    fmt.Println("Done")
}
```

**Output:**
```
Initializing...
Done
```

---

## Thread-Safe Initialization

```go
package main

import (
    "fmt"
    "sync"
)

var (
    config map[string]string
    once   sync.Once
)

func loadConfig() {
    fmt.Println("Loading configuration...")
    config = map[string]string{
        "host":     "localhost",
        "port":     "8080",
        "database": "myapp",
    }
}

func getConfig() map[string]string {
    once.Do(loadConfig)
    return config
}

func main() {
    var wg sync.WaitGroup
    
    // Multiple goroutines accessing config
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            cfg := getConfig()
            fmt.Printf("Goroutine %d: host=%s\n", id, cfg["host"])
        }(i)
    }
    
    wg.Wait()
}
```

**Output:**
```
Loading configuration...
Goroutine 0: host=localhost
Goroutine 1: host=localhost
Goroutine 2: host=localhost
Goroutine 3: host=localhost
Goroutine 4: host=localhost
```

---

## Singleton Pattern

```go
package main

import (
    "fmt"
    "sync"
)

type Database struct {
    host string
    port int
}

func (db *Database) Query(sql string) string {
    return fmt.Sprintf("Executing on %s:%d: %s", db.host, db.port, sql)
}

var (
    dbInstance *Database
    dbOnce     sync.Once
)

func GetDatabase() *Database {
    dbOnce.Do(func() {
        fmt.Println("Creating database connection...")
        dbInstance = &Database{
            host: "localhost",
            port: 5432,
        }
    })
    return dbInstance
}

func main() {
    var wg sync.WaitGroup
    
    for i := 0; i < 3; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            db := GetDatabase()
            result := db.Query(fmt.Sprintf("SELECT * FROM table_%d", id))
            fmt.Println(result)
        }(i)
    }
    
    wg.Wait()
    
    // Verify same instance
    db1 := GetDatabase()
    db2 := GetDatabase()
    fmt.Printf("Same instance: %v\n", db1 == db2)
}
```

---

## Lazy Resource Loading

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

type ExpensiveResource struct {
    data []byte
}

type LazyLoader struct {
    once     sync.Once
    resource *ExpensiveResource
}

func (l *LazyLoader) Get() *ExpensiveResource {
    l.once.Do(func() {
        fmt.Println("Loading expensive resource...")
        time.Sleep(time.Second)  // Simulate slow loading
        l.resource = &ExpensiveResource{
            data: make([]byte, 1024*1024),  // 1MB
        }
        fmt.Println("Resource loaded!")
    })
    return l.resource
}

func main() {
    loader := &LazyLoader{}
    
    fmt.Println("Program started")
    
    // Resource not loaded yet
    time.Sleep(500 * time.Millisecond)
    fmt.Println("Doing other work...")
    
    // First access triggers loading
    resource := loader.Get()
    fmt.Printf("Resource size: %d bytes\n", len(resource.data))
    
    // Subsequent access is instant
    start := time.Now()
    loader.Get()
    fmt.Printf("Second access: %v\n", time.Since(start))
}
```

---

## Multiple sync.Once for Different Operations

```go
package main

import (
    "fmt"
    "sync"
)

type Application struct {
    configOnce sync.Once
    dbOnce     sync.Once
    cacheOnce  sync.Once
    
    config map[string]string
    dbConn string
    cache  map[string]interface{}
}

func (app *Application) LoadConfig() map[string]string {
    app.configOnce.Do(func() {
        fmt.Println("Loading config...")
        app.config = map[string]string{
            "env": "production",
        }
    })
    return app.config
}

func (app *Application) ConnectDB() string {
    app.dbOnce.Do(func() {
        fmt.Println("Connecting to database...")
        app.dbConn = "postgres://localhost/mydb"
    })
    return app.dbConn
}

func (app *Application) InitCache() map[string]interface{} {
    app.cacheOnce.Do(func() {
        fmt.Println("Initializing cache...")
        app.cache = make(map[string]interface{})
    })
    return app.cache
}

func main() {
    app := &Application{}
    
    // Each initialization runs once
    app.LoadConfig()
    app.LoadConfig()  // No-op
    
    app.ConnectDB()
    app.ConnectDB()   // No-op
    
    app.InitCache()
    app.InitCache()   // No-op
    
    fmt.Println("Application initialized")
}
```

---

## Handling Errors with sync.Once

`sync.Once` runs the function only once, even if it fails. Use a custom pattern for retriable initialization:

```go
package main

import (
    "errors"
    "fmt"
    "sync"
)

type SafeInit struct {
    once    sync.Once
    value   interface{}
    initErr error
}

func (s *SafeInit) Init(initFunc func() (interface{}, error)) (interface{}, error) {
    s.once.Do(func() {
        s.value, s.initErr = initFunc()
    })
    return s.value, s.initErr
}

// For retriable initialization
type RetriableInit struct {
    mu      sync.Mutex
    done    bool
    value   interface{}
    initErr error
}

func (r *RetriableInit) Init(initFunc func() (interface{}, error)) (interface{}, error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if r.done {
        return r.value, r.initErr
    }
    
    r.value, r.initErr = initFunc()
    
    // Only mark done if successful
    if r.initErr == nil {
        r.done = true
    }
    
    return r.value, r.initErr
}

func main() {
    // Standard sync.Once - runs once even on error
    var safeInit SafeInit
    
    val, err := safeInit.Init(func() (interface{}, error) {
        return nil, errors.New("initialization failed")
    })
    fmt.Printf("First attempt: val=%v, err=%v\n", val, err)
    
    // Second attempt returns same error
    val, err = safeInit.Init(func() (interface{}, error) {
        return "success", nil
    })
    fmt.Printf("Second attempt: val=%v, err=%v\n", val, err)
    
    fmt.Println("\n--- Retriable initialization ---")
    
    // Retriable - retries until success
    var retriable RetriableInit
    attempts := 0
    
    for i := 0; i < 3; i++ {
        val, err := retriable.Init(func() (interface{}, error) {
            attempts++
            if attempts < 3 {
                return nil, errors.New("not ready")
            }
            return "success", nil
        })
        fmt.Printf("Attempt %d: val=%v, err=%v\n", i+1, val, err)
    }
}
```

---

## sync.Once with Cleanup

```go
package main

import (
    "fmt"
    "sync"
)

type Resource struct {
    name      string
    initOnce  sync.Once
    closeOnce sync.Once
}

func NewResource(name string) *Resource {
    return &Resource{name: name}
}

func (r *Resource) Init() {
    r.initOnce.Do(func() {
        fmt.Printf("[%s] Initializing...\n", r.name)
        // Perform initialization
    })
}

func (r *Resource) Close() {
    r.closeOnce.Do(func() {
        fmt.Printf("[%s] Closing...\n", r.name)
        // Perform cleanup
    })
}

func main() {
    resource := NewResource("MyResource")
    
    // Multiple init calls
    resource.Init()
    resource.Init()
    resource.Init()
    
    // Use resource...
    
    // Multiple close calls
    resource.Close()
    resource.Close()
    resource.Close()
    
    fmt.Println("Done")
}
```

---

## Package-Level Initialization

```go
package main

import (
    "fmt"
    "sync"
)

// logger package simulation
var (
    logger     *Logger
    loggerOnce sync.Once
)

type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

func GetLogger() *Logger {
    loggerOnce.Do(func() {
        logger = &Logger{prefix: "APP"}
    })
    return logger
}

// cache package simulation
var (
    cacheClient *CacheClient
    cacheOnce   sync.Once
)

type CacheClient struct {
    address string
}

func (c *CacheClient) Get(key string) string {
    return "cached-" + key
}

func GetCacheClient() *CacheClient {
    cacheOnce.Do(func() {
        cacheClient = &CacheClient{address: "redis://localhost:6379"}
    })
    return cacheClient
}

func main() {
    // Services are lazily initialized on first use
    log := GetLogger()
    cache := GetCacheClient()
    
    log.Log("Application started")
    log.Log(fmt.Sprintf("Cache value: %s", cache.Get("key")))
}
```

---

## OnceFunc (Go 1.21+)

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    // OnceFunc returns a function that runs f only once
    expensiveComputation := sync.OnceFunc(func() {
        fmt.Println("Computing...")
        // Expensive operation
    })
    
    // Call multiple times - only runs once
    expensiveComputation()
    expensiveComputation()
    expensiveComputation()
    
    // OnceValue returns a function that returns a value
    getValue := sync.OnceValue(func() int {
        fmt.Println("Calculating value...")
        return 42
    })
    
    fmt.Println("Value:", getValue())
    fmt.Println("Value:", getValue())  // Cached, no recalculation
    
    // OnceValues for value and error
    getResource := sync.OnceValues(func() (string, error) {
        fmt.Println("Fetching resource...")
        return "resource-data", nil
    })
    
    val, err := getResource()
    fmt.Printf("Resource: %s, Error: %v\n", val, err)
    
    val, err = getResource()  // Cached
    fmt.Printf("Resource: %s, Error: %v\n", val, err)
}
```

---

## Comparison: sync.Once vs Other Patterns

```go
package main

import (
    "fmt"
    "sync"
)

// Pattern 1: sync.Once (recommended)
var (
    instance1 *Service
    once1     sync.Once
)

func GetService1() *Service {
    once1.Do(func() {
        instance1 = &Service{name: "sync.Once"}
    })
    return instance1
}

// Pattern 2: init() function
var instance2 = &Service{name: "init"}

// Pattern 3: Check-lock-check (double-checked locking)
var (
    instance3 *Service
    mu3       sync.Mutex
)

func GetService3() *Service {
    if instance3 == nil {
        mu3.Lock()
        defer mu3.Unlock()
        if instance3 == nil {
            instance3 = &Service{name: "check-lock-check"}
        }
    }
    return instance3
}

type Service struct {
    name string
}

func main() {
    fmt.Println(GetService1().name)  // Lazy, thread-safe
    fmt.Println(instance2.name)       // Eager, always loaded
    fmt.Println(GetService3().name)   // Manual, error-prone
}
```

---

## Summary

| Use Case | Pattern |
|----------|---------|
| One-time init | `sync.Once.Do()` |
| Singleton | `sync.Once` + global var |
| Lazy loading | `sync.Once` in getter |
| Retriable init | Custom mutex pattern |
| Cleanup | Separate `sync.Once` for close |

**Best Practices:**

1. Use `sync.Once` for thread-safe lazy initialization
2. One `sync.Once` per operation
3. Remember: runs exactly once, even on panic
4. For retriable operations, use custom pattern
5. Prefer `sync.OnceValue` (Go 1.21+) for value returns
6. Don't store `sync.Once` by value - use pointer or embed

**Common Mistakes:**

1. Reusing `sync.Once` for multiple operations
2. Expecting retry on error
3. Copying `sync.Once` by value

---

*Building reliable Go applications? [OneUptime](https://oneuptime.com) helps you monitor initialization times, track singleton instances, and ensure service health.*
