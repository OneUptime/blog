# How to Fix 'invalid operation' Errors in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Errors, Types, Operations, Compiler

Description: Learn how to fix 'invalid operation' errors in Go, including type mismatches, unsupported operators, and interface assertions.

---

The "invalid operation" error occurs when you try to perform an operation that is not supported for the given types. This includes arithmetic on incompatible types, comparisons, and interface operations.

---

## Common Invalid Operation Errors

```go
package main

func main() {
    // Error: invalid operation: mismatched types int and string
    x := 5 + "hello"
    
    // Error: invalid operation: cannot compare slice with nil
    var s []int
    if s == []int{} {}
    
    // Error: invalid operation: x < y (operator < not defined on []int)
    a := []int{1, 2}
    b := []int{3, 4}
    if a < b {}
}
```

---

## Type Mismatch in Arithmetic

**Problem:**

```go
package main

func main() {
    var a int = 5
    var b int64 = 10
    
    // Error: invalid operation: a + b (mismatched types int and int64)
    sum := a + b
}
```

**Solution - Explicit Conversion:**

```go
package main

import "fmt"

func main() {
    var a int = 5
    var b int64 = 10
    
    // Convert to same type
    sum := int64(a) + b
    // Or
    sum2 := a + int(b)
    
    fmt.Println(sum, sum2)
}
```

---

## Comparing Incompatible Types

**Problem:**

```go
package main

func main() {
    var a int32 = 5
    var b int64 = 5
    
    // Error: invalid operation: a == b (mismatched types int32 and int64)
    if a == b {
        fmt.Println("equal")
    }
}
```

**Solution:**

```go
package main

import "fmt"

func main() {
    var a int32 = 5
    var b int64 = 5
    
    // Convert to same type for comparison
    if int64(a) == b {
        fmt.Println("equal")
    }
}
```

---

## Slice Comparison

Slices cannot be compared directly:

**Problem:**

```go
package main

func main() {
    a := []int{1, 2, 3}
    b := []int{1, 2, 3}
    
    // Error: invalid operation: a == b (slice can only be compared to nil)
    if a == b {
        fmt.Println("equal")
    }
}
```

**Solution - Compare to nil or use reflect:**

```go
package main

import (
    "fmt"
    "reflect"
    "slices"
)

func main() {
    a := []int{1, 2, 3}
    b := []int{1, 2, 3}
    var c []int
    
    // Comparing to nil is valid
    if c == nil {
        fmt.Println("c is nil")
    }
    
    // Use reflect.DeepEqual for general comparison
    if reflect.DeepEqual(a, b) {
        fmt.Println("a and b are equal")
    }
    
    // Use slices.Equal (Go 1.21+)
    if slices.Equal(a, b) {
        fmt.Println("a and b are equal (slices)")
    }
}
```

---

## Map Comparison

Maps also cannot be compared:

**Problem:**

```go
package main

func main() {
    a := map[string]int{"x": 1}
    b := map[string]int{"x": 1}
    
    // Error: invalid operation: a == b (map can only be compared to nil)
    if a == b {}
}
```

**Solution:**

```go
package main

import (
    "fmt"
    "maps"
    "reflect"
)

func main() {
    a := map[string]int{"x": 1}
    b := map[string]int{"x": 1}
    var c map[string]int
    
    // Compare to nil
    if c == nil {
        fmt.Println("c is nil")
    }
    
    // Use reflect.DeepEqual
    if reflect.DeepEqual(a, b) {
        fmt.Println("maps are equal")
    }
    
    // Use maps.Equal (Go 1.21+)
    if maps.Equal(a, b) {
        fmt.Println("maps are equal (maps pkg)")
    }
}
```

---

## Invalid Operators for Types

**Problem:**

```go
package main

func main() {
    a := "hello"
    b := "world"
    
    // Error: invalid operation: a - b (operator - not defined on string)
    result := a - b
    
    // Error: invalid operation: a / b (operator / not defined on string)
    result2 := a / b
}
```

**Solution - Use appropriate operations:**

```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    a := "hello"
    b := "world"
    
    // String concatenation uses +
    result := a + " " + b
    
    // For other operations, use string functions
    contains := strings.Contains(a, "ell")
    
    fmt.Println(result, contains)
}
```

---

## Interface Type Assertion Errors

**Problem:**

```go
package main

func main() {
    var i interface{} = "hello"
    
    // Error: invalid operation: i + " world" (mismatched types interface{} and string)
    result := i + " world"
}
```

**Solution - Type assert first:**

```go
package main

import "fmt"

func main() {
    var i interface{} = "hello"
    
    // Type assert to string
    s := i.(string)
    result := s + " world"
    
    // Or with type switch
    switch v := i.(type) {
    case string:
        result := v + " world"
        fmt.Println(result)
    case int:
        result := v + 1
        fmt.Println(result)
    }
    
    fmt.Println(result)
}
```

---

## Bitwise Operations on Wrong Types

**Problem:**

```go
package main

func main() {
    a := 1.5
    
    // Error: invalid operation: a & 1 (operator & not defined on float64)
    result := a & 1
    
    // Error: invalid operation: a << 2 (operator << not defined on float64)
    shifted := a << 2
}
```

**Solution - Use integer types:**

```go
package main

import "fmt"

func main() {
    // Bitwise operations require integers
    a := 5
    
    result := a & 1     // AND
    shifted := a << 2   // Left shift
    
    fmt.Println(result, shifted)  // 1, 20
}
```

---

## Comparison with Uncomparable Types

**Problem:**

```go
package main

type MyStruct struct {
    data []int  // Slice makes struct uncomparable
}

func main() {
    a := MyStruct{data: []int{1, 2}}
    b := MyStruct{data: []int{1, 2}}
    
    // Error: invalid operation: a == b (struct containing []int cannot be compared)
    if a == b {}
}
```

**Solution:**

```go
package main

import (
    "fmt"
    "reflect"
)

type MyStruct struct {
    data []int
}

func (m MyStruct) Equal(other MyStruct) bool {
    if len(m.data) != len(other.data) {
        return false
    }
    for i := range m.data {
        if m.data[i] != other.data[i] {
            return false
        }
    }
    return true
}

func main() {
    a := MyStruct{data: []int{1, 2}}
    b := MyStruct{data: []int{1, 2}}
    
    // Use custom method
    if a.Equal(b) {
        fmt.Println("equal via method")
    }
    
    // Or reflect.DeepEqual
    if reflect.DeepEqual(a, b) {
        fmt.Println("equal via reflect")
    }
}
```

---

## Invalid Index Operation

**Problem:**

```go
package main

func main() {
    m := map[string]int{"a": 1}
    
    // Error: invalid operation: cannot index m (map[string]int) with [int]
    val := m[0]
    
    s := "hello"
    // Error: invalid operation: cannot slice s (strings are immutable)
    // This is actually valid, but assignment isn't
    // s[0] = 'H'  // Cannot assign to s[0]
}
```

**Solution:**

```go
package main

import "fmt"

func main() {
    m := map[string]int{"a": 1}
    
    // Use correct key type
    val := m["a"]
    fmt.Println(val)
    
    s := "hello"
    // Convert to []byte to modify
    b := []byte(s)
    b[0] = 'H'
    s = string(b)
    fmt.Println(s)
}
```

---

## Operator Summary

| Type | Supported Operators |
|------|---------------------|
| Integers | `+`, `-`, `*`, `/`, `%`, `&`, `\|`, `^`, `<<`, `>>`, `==`, `<`, etc. |
| Floats | `+`, `-`, `*`, `/`, `==`, `<`, `>`, etc. |
| Strings | `+`, `==`, `<`, `>` |
| Booleans | `&&`, `\|\|`, `!`, `==` |
| Pointers | `==`, `!=` |
| Channels | `==`, `!=`, `<-` |
| Slices | `==` (only nil) |
| Maps | `==` (only nil) |

---

## Summary

| Error | Cause | Solution |
|-------|-------|----------|
| Mismatched types | Different numeric types | Explicit conversion |
| Cannot compare slice | Direct slice comparison | Use `reflect.DeepEqual` or `slices.Equal` |
| Operator not defined | Wrong operator for type | Use appropriate operation |
| Cannot index | Wrong key/index type | Use correct type |
| Struct cannot be compared | Contains uncomparable field | Custom Equal method |

**Quick Fixes:**

1. Convert numeric types explicitly
2. Use `reflect.DeepEqual` for complex comparisons
3. Type assert interfaces before operations
4. Check operator compatibility with types
5. Use built-in packages (`slices`, `maps`) for Go 1.21+

---

*Debugging Go type errors? [OneUptime](https://oneuptime.com) helps you monitor your applications and catch runtime errors before they impact users.*
