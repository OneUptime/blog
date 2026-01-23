# How to Understand Constant Types and Untyped Constants in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Constants, Types, Untyped Constants, iota, Best Practices

Description: Master Go's unique constant system including untyped constants, default types, precision, and the iota keyword for elegant enum-like patterns.

---

Go's constant system is more sophisticated than most languages. Understanding untyped constants, type inference, and precision rules will help you write cleaner, more flexible code.

---

## Basic Constants

Constants are declared with the `const` keyword:

```go
package main

import "fmt"

const (
    AppName    = "MyApp"     // untyped string constant
    MaxRetries = 3           // untyped integer constant
    Pi         = 3.14159     // untyped floating-point constant
    Debug      = true        // untyped boolean constant
)

func main() {
    fmt.Println(AppName)
    fmt.Println(MaxRetries)
    fmt.Println(Pi)
    fmt.Println(Debug)
}
```

---

## Typed vs Untyped Constants

This is where Go gets interesting. Constants can be typed or untyped:

```go
package main

import "fmt"

const (
    // Untyped constants - flexible, adapt to context
    untypedInt   = 42
    untypedFloat = 3.14
    
    // Typed constants - fixed type
    typedInt   int     = 42
    typedFloat float64 = 3.14
)

func main() {
    // Untyped constant adapts to variable type
    var a int32 = untypedInt   // Works: 42 fits in int32
    var b int64 = untypedInt   // Works: 42 fits in int64
    var c float32 = untypedFloat // Works: adapts to float32
    
    fmt.Println(a, b, c)
    
    // Typed constant has fixed type
    // var d int32 = typedInt  // ERROR: cannot use typedInt (type int)
    var e int = typedInt       // Works: same type
    fmt.Println(e)
}
```

---

## Default Types

When an untyped constant needs a type (like in assignments to `interface{}`), Go uses default types:

| Constant Kind | Default Type |
|--------------|--------------|
| integer | `int` |
| floating-point | `float64` |
| complex | `complex128` |
| rune (character) | `rune` (int32) |
| string | `string` |
| boolean | `bool` |

```go
package main

import "fmt"

func printType(v interface{}) {
    fmt.Printf("%v is %T\n", v, v)
}

func main() {
    printType(42)        // 42 is int
    printType(3.14)      // 3.14 is float64
    printType('A')       // 65 is int32 (rune)
    printType("hello")   // hello is string
    printType(true)      // true is bool
    printType(1 + 2i)    // (1+2i) is complex128
}
```

---

## Constant Expressions and Precision

Untyped constants maintain arbitrary precision during compilation:

```go
package main

import "fmt"

const (
    // High precision during compilation
    Big = 1 << 100  // Much larger than any integer type
    
    // Can be used in expressions
    Small = Big >> 99  // Results in 2
)

func main() {
    // Big itself cannot be assigned to any variable
    // var x = Big  // ERROR: overflows
    
    // But Small is fine
    fmt.Println(Small) // 2
    
    // Floating point precision
    const precise = 0.1 + 0.2  // Exact 0.3 at compile time
    
    // Compare to runtime calculation
    var runtime = 0.1 + 0.2
    fmt.Printf("Constant: %.20f\n", precise)  // 0.30000000000000000000
    fmt.Printf("Runtime:  %.20f\n", runtime)  // 0.30000000000000004441
}
```

---

## The iota Identifier

`iota` is a special identifier for creating enumerated constants:

```go
package main

import "fmt"

const (
    Sunday    = iota // 0
    Monday           // 1
    Tuesday          // 2
    Wednesday        // 3
    Thursday         // 4
    Friday           // 5
    Saturday         // 6
)

func main() {
    fmt.Println(Wednesday) // 3
}
```

### iota Patterns

```go
package main

import "fmt"

// Skip values
const (
    _  = iota // 0 - skip
    KB = 1 << (10 * iota) // 1 << 10
    MB                     // 1 << 20
    GB                     // 1 << 30
    TB                     // 1 << 40
)

// Custom expressions
const (
    Low    = iota * 10  // 0
    Medium              // 10
    High                // 20
)

// Multiple on same line
const (
    A, B = iota, iota + 10 // 0, 10
    C, D                   // 1, 11
    E, F                   // 2, 12
)

func main() {
    fmt.Printf("KB=%d MB=%d GB=%d\n", KB, MB, GB)
    fmt.Printf("Low=%d Medium=%d High=%d\n", Low, Medium, High)
    fmt.Printf("A=%d B=%d C=%d D=%d\n", A, B, C, D)
}
```

---

## Type-Safe Enums with iota

Create type-safe enumerations:

```go
package main

import "fmt"

type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusCompleted
    StatusFailed
)

// String representation for nice output
func (s Status) String() string {
    switch s {
    case StatusPending:
        return "Pending"
    case StatusActive:
        return "Active"
    case StatusCompleted:
        return "Completed"
    case StatusFailed:
        return "Failed"
    default:
        return "Unknown"
    }
}

// Type-safe function
func processStatus(s Status) {
    fmt.Printf("Processing status: %s (%d)\n", s, s)
}

func main() {
    processStatus(StatusActive)
    // processStatus(1)  // ERROR: cannot use 1 (type int)
    
    // Explicit conversion allowed but discouraged
    processStatus(Status(2))
}
```

---

## Bitwise Flags with iota

```go
package main

import "fmt"

type Permission uint

const (
    PermRead Permission = 1 << iota  // 1
    PermWrite                         // 2
    PermExecute                       // 4
    PermDelete                        // 8
)

func (p Permission) Has(flag Permission) bool {
    return p&flag != 0
}

func (p Permission) String() string {
    result := ""
    if p.Has(PermRead) {
        result += "r"
    } else {
        result += "-"
    }
    if p.Has(PermWrite) {
        result += "w"
    } else {
        result += "-"
    }
    if p.Has(PermExecute) {
        result += "x"
    } else {
        result += "-"
    }
    if p.Has(PermDelete) {
        result += "d"
    } else {
        result += "-"
    }
    return result
}

func main() {
    // Combine permissions
    userPerm := PermRead | PermWrite | PermExecute
    guestPerm := PermRead
    
    fmt.Printf("User: %s\n", userPerm)    // rwx-
    fmt.Printf("Guest: %s\n", guestPerm)  // r---
    
    fmt.Printf("User can write: %v\n", userPerm.Has(PermWrite))    // true
    fmt.Printf("Guest can write: %v\n", guestPerm.Has(PermWrite))  // false
}
```

---

## Constant Rules and Limitations

### What Can Be Constants

```go
const (
    // Basic types
    integer = 42
    float   = 3.14
    str     = "hello"
    boolean = true
    char    = 'A'
    
    // Expressions of constants
    sum     = 1 + 2
    product = 3 * 4
    concat  = "Hello, " + "World"
)
```

### What Cannot Be Constants

```go
// Function calls (even standard library)
// const now = time.Now()  // ERROR

// Variables
// var x = 1
// const y = x  // ERROR

// Pointers, slices, maps, channels
// const p = &x         // ERROR
// const s = []int{1}   // ERROR
// const m = map[string]int{}  // ERROR

// Struct literals
// const st = struct{}{}  // ERROR
```

---

## Numeric Conversions

Untyped constants convert automatically, typed constants require explicit conversion:

```go
package main

import "fmt"

func main() {
    const untyped = 100
    const typed int = 100
    
    // Untyped works everywhere it fits
    var a int8 = untyped   // OK
    var b int16 = untyped  // OK
    var c int32 = untyped  // OK
    var d float64 = untyped // OK
    
    // Typed requires conversion
    // var e int8 = typed   // ERROR
    var e int8 = int8(typed) // OK with explicit conversion
    
    fmt.Println(a, b, c, d, e)
}
```

---

## Overflow Detection

Typed constants catch overflow at compile time:

```go
package main

const (
    // Untyped - overflow detected when used
    big = 1 << 100
    
    // Typed - overflow detected immediately
    // typedBig int64 = 1 << 100  // ERROR: overflow
)

func main() {
    // Using untyped constant that overflows
    // var x int = big  // ERROR: overflow
    
    // Safe use
    var y = big >> 90  // Now fits
    println(y)         // 1024
}
```

---

## Real-World Patterns

### HTTP Status Codes

```go
type HTTPStatus int

const (
    StatusOK                  HTTPStatus = 200
    StatusCreated             HTTPStatus = 201
    StatusBadRequest          HTTPStatus = 400
    StatusUnauthorized        HTTPStatus = 401
    StatusNotFound            HTTPStatus = 404
    StatusInternalServerError HTTPStatus = 500
)

func (s HTTPStatus) IsSuccess() bool {
    return s >= 200 && s < 300
}

func (s HTTPStatus) IsClientError() bool {
    return s >= 400 && s < 500
}
```

### Time Durations

```go
package main

import (
    "fmt"
    "time"
)

const (
    Second = time.Second
    Minute = 60 * Second
    Hour   = 60 * Minute
    Day    = 24 * Hour
    Week   = 7 * Day
)

func main() {
    fmt.Printf("Timeout: %v\n", 30*Second)
    fmt.Printf("Session: %v\n", 2*Hour)
    fmt.Printf("Cache TTL: %v\n", 1*Week)
}
```

### Configuration Defaults

```go
package config

const (
    DefaultPort        = 8080
    DefaultHost        = "localhost"
    DefaultTimeout     = 30
    DefaultMaxRetries  = 3
    DefaultBufferSize  = 4096
    DefaultConcurrency = 10
)
```

---

## Summary

Key concepts for Go constants:

| Feature | Description |
|---------|-------------|
| Untyped constants | Flexible, adapt to context |
| Typed constants | Fixed type, safer |
| `iota` | Auto-incrementing values |
| Default types | `int`, `float64`, etc. |
| Compile-time precision | Arbitrary precision until used |

**Best Practices:**

1. Use untyped constants for flexibility when possible
2. Use typed constants for type safety with custom types
3. Use `iota` for enumerations
4. Create `String()` methods for readable enum output
5. Use bitwise `iota` patterns for flags
6. Prefer constants over variables for immutable values

---

*Building robust Go applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with distributed tracing to help you debug issues in production.*
