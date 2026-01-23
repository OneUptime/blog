# How to Safely Type Assert Interfaces in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Type Assertion, Interfaces, Type Safety, Type Switch

Description: Master Go's type assertion syntax for safely extracting concrete types from interfaces, including the comma-ok idiom and type switches for clean polymorphic code.

---

Type assertions in Go let you access the concrete value stored in an interface. Done wrong, they panic. Done right, they enable powerful polymorphic patterns.

---

## Basic Type Assertion

Type assertions extract concrete types from interfaces:

```go
package main

import "fmt"

func main() {
    var i interface{} = "hello"
    
    // Type assertion: get string from interface
    s := i.(string)
    fmt.Println(s) // hello
    
    // DANGER: Wrong type causes panic
    // n := i.(int)  // panic: interface conversion: interface {} is string, not int
}
```

---

## The Comma-Ok Idiom (Safe Assertions)

Always use the two-value form to avoid panics:

```go
package main

import "fmt"

func main() {
    var i interface{} = "hello"
    
    // Safe type assertion with ok check
    s, ok := i.(string)
    if ok {
        fmt.Printf("String value: %s\n", s)
    } else {
        fmt.Println("Not a string")
    }
    
    // Check for int (will be false)
    n, ok := i.(int)
    if ok {
        fmt.Printf("Int value: %d\n", n)
    } else {
        fmt.Printf("Not an int, n is zero value: %d\n", n)
    }
}
```

When the assertion fails:

- `ok` is `false`
- The value is the zero value for that type
- No panic occurs

---

## Type Switches

For multiple type checks, use a type switch:

```go
package main

import "fmt"

func describe(i interface{}) {
    switch v := i.(type) {
    case string:
        fmt.Printf("String of length %d: %q\n", len(v), v)
    case int:
        fmt.Printf("Integer: %d\n", v)
    case float64:
        fmt.Printf("Float: %f\n", v)
    case bool:
        fmt.Printf("Boolean: %t\n", v)
    case nil:
        fmt.Println("Nil value")
    default:
        fmt.Printf("Unknown type: %T\n", v)
    }
}

func main() {
    describe("hello")
    describe(42)
    describe(3.14)
    describe(true)
    describe(nil)
    describe([]int{1, 2, 3})
}
```

Output:

```
String of length 5: "hello"
Integer: 42
Float: 3.140000
Boolean: true
Nil value
Unknown type: []int
```

---

## Asserting Custom Types

Type assertions work with any interface, not just `interface{}`:

```go
package main

import "fmt"

type Reader interface {
    Read() string
}

type Writer interface {
    Write(string)
}

type ReadWriter interface {
    Reader
    Writer
}

type File struct {
    name string
    data string
}

func (f *File) Read() string {
    return f.data
}

func (f *File) Write(s string) {
    f.data = s
}

func process(r Reader) {
    // Check if r also implements Writer
    if rw, ok := r.(ReadWriter); ok {
        fmt.Println("This reader is also a writer!")
        rw.Write("new data")
        fmt.Println(rw.Read())
    } else {
        fmt.Println("Read-only:", r.Read())
    }
}

func main() {
    f := &File{name: "test.txt", data: "original"}
    process(f) // File implements both Reader and Writer
}
```

---

## Common Patterns

### Pattern 1: Optional Interface Methods

```go
package main

import "fmt"

type Handler interface {
    Handle()
}

// Optional interface for handlers that support cleanup
type Closer interface {
    Close()
}

type SimpleHandler struct{}

func (h SimpleHandler) Handle() {
    fmt.Println("Handling...")
}

type ResourceHandler struct{}

func (h ResourceHandler) Handle() {
    fmt.Println("Handling with resources...")
}

func (h ResourceHandler) Close() {
    fmt.Println("Cleaning up resources...")
}

func runHandler(h Handler) {
    h.Handle()
    
    // Check if handler also implements Closer
    if closer, ok := h.(Closer); ok {
        closer.Close()
    }
}

func main() {
    runHandler(SimpleHandler{})   // Only Handle() called
    fmt.Println("---")
    runHandler(ResourceHandler{}) // Handle() and Close() called
}
```

### Pattern 2: Error Type Checking

```go
package main

import (
    "errors"
    "fmt"
    "net"
)

type TemporaryError interface {
    Temporary() bool
}

type TimeoutError interface {
    Timeout() bool
}

func handleError(err error) {
    // Check for specific error types
    if netErr, ok := err.(net.Error); ok {
        if netErr.Timeout() {
            fmt.Println("Network timeout - will retry")
            return
        }
        if netErr.Temporary() {
            fmt.Println("Temporary network error - will retry")
            return
        }
    }
    
    // Check for wrapped errors
    var pathErr *PathError
    if errors.As(err, &pathErr) {
        fmt.Printf("Path error on %s: %v\n", pathErr.Path, pathErr.Err)
        return
    }
    
    fmt.Printf("Unknown error: %v\n", err)
}

type PathError struct {
    Path string
    Err  error
}

func (e *PathError) Error() string {
    return fmt.Sprintf("path %s: %v", e.Path, e.Err)
}
```

### Pattern 3: Interface Detection

```go
package main

import "fmt"

type Stringer interface {
    String() string
}

type GoStringer interface {
    GoString() string
}

func smartPrint(v interface{}) {
    switch val := v.(type) {
    case GoStringer:
        // GoStringer is more detailed, prefer it
        fmt.Println(val.GoString())
    case Stringer:
        fmt.Println(val.String())
    case string:
        fmt.Println(val)
    default:
        fmt.Printf("%v\n", val)
    }
}

type Point struct {
    X, Y int
}

func (p Point) String() string {
    return fmt.Sprintf("(%d, %d)", p.X, p.Y)
}

func (p Point) GoString() string {
    return fmt.Sprintf("Point{X: %d, Y: %d}", p.X, p.Y)
}

func main() {
    smartPrint(Point{1, 2})
    smartPrint("hello")
    smartPrint(42)
}
```

---

## Type Assertion vs Type Conversion

Don't confuse these two:

```go
package main

import "fmt"

func main() {
    // TYPE CONVERSION: Changes type of a value
    var x int = 42
    var y float64 = float64(x)  // Convert int to float64
    fmt.Println(y)
    
    // TYPE ASSERTION: Extracts concrete type from interface
    var i interface{} = 42
    n := i.(int)  // Assert that interface contains int
    fmt.Println(n)
    
    // You CANNOT type assert between concrete types
    // wrong := x.(float64)  // Compile error: x is not an interface
    
    // You CANNOT type convert from interface
    // wrong := float64(i)   // Compile error: cannot convert interface
}
```

---

## Asserting to Pointer Types

Be careful with pointers:

```go
package main

import "fmt"

type Data struct {
    Value int
}

func main() {
    var i interface{} = &Data{Value: 42}
    
    // Correct: assert to pointer type
    d, ok := i.(*Data)
    if ok {
        fmt.Printf("Got *Data: %+v\n", d)
    }
    
    // Wrong: asserting to value type fails
    dVal, ok := i.(Data)
    if !ok {
        fmt.Printf("Not a Data value, got zero: %+v\n", dVal)
    }
}
```

---

## Multiple Type Cases

Group related types in switch cases:

```go
package main

import "fmt"

func printNumeric(i interface{}) {
    switch v := i.(type) {
    case int, int8, int16, int32, int64:
        fmt.Printf("Signed integer: %v\n", v)
    case uint, uint8, uint16, uint32, uint64:
        fmt.Printf("Unsigned integer: %v\n", v)
    case float32, float64:
        fmt.Printf("Floating point: %v\n", v)
    case complex64, complex128:
        fmt.Printf("Complex number: %v\n", v)
    default:
        fmt.Printf("Not a number: %T\n", v)
    }
}

func main() {
    printNumeric(42)
    printNumeric(uint(42))
    printNumeric(3.14)
    printNumeric(1 + 2i)
    printNumeric("hello")
}
```

Note: When grouping cases, `v` has type `interface{}`, not the specific type.

---

## Asserting Slice and Map Types

```go
package main

import "fmt"

func processCollection(i interface{}) {
    switch v := i.(type) {
    case []int:
        sum := 0
        for _, n := range v {
            sum += n
        }
        fmt.Printf("Int slice with sum: %d\n", sum)
        
    case []string:
        fmt.Printf("String slice with %d elements\n", len(v))
        
    case map[string]int:
        fmt.Printf("String-int map with %d entries\n", len(v))
        
    case map[string]interface{}:
        fmt.Println("JSON-like map:")
        for k, val := range v {
            fmt.Printf("  %s: %v\n", k, val)
        }
        
    default:
        fmt.Printf("Unknown collection type: %T\n", v)
    }
}

func main() {
    processCollection([]int{1, 2, 3, 4, 5})
    processCollection([]string{"a", "b", "c"})
    processCollection(map[string]int{"one": 1, "two": 2})
    processCollection(map[string]interface{}{
        "name": "Alice",
        "age":  30,
    })
}
```

---

## Performance Considerations

Type assertions are fast, but type switches have some overhead:

```go
package main

import "testing"

var result int

func BenchmarkTypeAssertion(b *testing.B) {
    var i interface{} = 42
    for n := 0; n < b.N; n++ {
        result = i.(int)
    }
}

func BenchmarkTypeSwitch(b *testing.B) {
    var i interface{} = 42
    for n := 0; n < b.N; n++ {
        switch v := i.(type) {
        case int:
            result = v
        }
    }
}

func BenchmarkCommaOk(b *testing.B) {
    var i interface{} = 42
    for n := 0; n < b.N; n++ {
        if v, ok := i.(int); ok {
            result = v
        }
    }
}
```

In practice, the difference is negligible. Prioritize safety and readability.

---

## Summary

| Pattern | Use Case | Safe? |
|---------|----------|-------|
| `x.(T)` | When you're certain of type | No (panics) |
| `x, ok := x.(T)` | When type is uncertain | Yes |
| `switch x.(type)` | Multiple possible types | Yes |

**Best Practices:**

1. Always use comma-ok form unless you're absolutely certain of the type
2. Use type switches for multiple type checks
3. Check for interfaces, not concrete types when possible
4. Use `errors.As()` for error type checking (Go 1.13+)
5. Remember: type assertion is NOT type conversion

---

*Building complex Go applications? [OneUptime](https://oneuptime.com) provides distributed tracing and monitoring to help you debug production issues quickly.*
