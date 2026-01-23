# How to Type Convert Slices in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Slices, Type Conversion, Arrays

Description: Learn how to convert between slice types in Go, understand why direct conversion doesn't work, and explore practical patterns for safely transforming slice data.

---

Go's type system is strict about slice types, which often surprises developers coming from other languages. You cannot directly convert a `[]int` to `[]float64` or a `[]string` to `[]interface{}`. This post explains why and shows you the correct patterns for slice type conversion.

---

## Why Direct Slice Conversion Fails

In Go, slices of different types have incompatible memory layouts. Even though the syntax looks like it should work, this code fails:

```go
// This does NOT compile
ints := []int{1, 2, 3}
floats := []float64(ints)  // Error: cannot convert ints (type []int) to type []float64
```

The reason is that `int` and `float64` have different sizes in memory. Go slices are backed by arrays, and the underlying memory layout differs between types.

---

## The Standard Approach: Iterative Conversion

The idiomatic way to convert slices in Go is to create a new slice and copy each element with the appropriate conversion:

```go
package main

import "fmt"

func main() {
    // Original slice of integers
    ints := []int{1, 2, 3, 4, 5}
    
    // Create a new float64 slice with the same length
    floats := make([]float64, len(ints))
    
    // Convert each element individually
    for i, v := range ints {
        floats[i] = float64(v)
    }
    
    fmt.Println("Ints:", ints)     // Ints: [1 2 3 4 5]
    fmt.Println("Floats:", floats) // Floats: [1 2 3 4 5]
}
```

---

## Converting to []interface{}

A common need is converting a typed slice to `[]interface{}` for functions that accept variadic interface arguments. The same pattern applies:

```go
package main

import "fmt"

// convertToInterfaceSlice converts any typed slice to []interface{}
func convertToInterfaceSlice(strings []string) []interface{} {
    // Preallocate the result slice for efficiency
    result := make([]interface{}, len(strings))
    
    for i, v := range strings {
        result[i] = v
    }
    
    return result
}

func main() {
    names := []string{"Alice", "Bob", "Charlie"}
    
    // Convert to interface slice
    interfaces := convertToInterfaceSlice(names)
    
    // Now we can use it with fmt.Println's variadic arguments
    fmt.Println(interfaces...)
}
```

---

## Generic Slice Conversion (Go 1.18+)

With Go generics, you can create reusable conversion functions. This example shows a generic approach for numeric conversions:

```go
package main

import (
    "fmt"
    "golang.org/x/exp/constraints"
)

// Number is a constraint that includes all numeric types
type Number interface {
    constraints.Integer | constraints.Float
}

// ConvertSlice converts a slice of one numeric type to another
func ConvertSlice[From Number, To Number](input []From) []To {
    result := make([]To, len(input))
    for i, v := range input {
        result[i] = To(v)
    }
    return result
}

func main() {
    ints := []int{1, 2, 3, 4, 5}
    
    // Convert int slice to float64 slice using generics
    floats := ConvertSlice[int, float64](ints)
    
    fmt.Printf("Ints: %v (type: %T)\n", ints, ints)
    fmt.Printf("Floats: %v (type: %T)\n", floats, floats)
    
    // Convert to int32
    int32s := ConvertSlice[int, int32](ints)
    fmt.Printf("Int32s: %v (type: %T)\n", int32s, int32s)
}
```

---

## Converting Slices with a Transform Function

Sometimes you need to apply a transformation during conversion. Here's a generic approach:

```go
package main

import (
    "fmt"
    "strings"
)

// Map applies a transformation function to each element of a slice
func Map[T any, U any](input []T, transform func(T) U) []U {
    result := make([]U, len(input))
    for i, v := range input {
        result[i] = transform(v)
    }
    return result
}

func main() {
    // Convert strings to their lengths
    names := []string{"Alice", "Bob", "Charlie"}
    lengths := Map(names, func(s string) int {
        return len(s)
    })
    fmt.Println("Lengths:", lengths) // [5 3 7]
    
    // Convert to uppercase
    upper := Map(names, strings.ToUpper)
    fmt.Println("Upper:", upper) // [ALICE BOB CHARLIE]
    
    // Convert integers to their squares
    numbers := []int{1, 2, 3, 4, 5}
    squares := Map(numbers, func(n int) int {
        return n * n
    })
    fmt.Println("Squares:", squares) // [1 4 9 16 25]
}
```

---

## Converting Struct Slices

When converting between struct types with similar fields, you need to handle each field:

```go
package main

import "fmt"

// Database model
type UserDB struct {
    ID       int64
    Username string
    Email    string
    Password string // sensitive, shouldn't be exposed
}

// API response model
type UserResponse struct {
    ID       int64  `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
}

// ConvertUsers transforms database models to API response models
func ConvertUsers(dbUsers []UserDB) []UserResponse {
    result := make([]UserResponse, len(dbUsers))
    
    for i, u := range dbUsers {
        result[i] = UserResponse{
            ID:       u.ID,
            Username: u.Username,
            Email:    u.Email,
            // Password is intentionally not copied
        }
    }
    
    return result
}

func main() {
    // Simulated database results
    dbUsers := []UserDB{
        {ID: 1, Username: "alice", Email: "alice@example.com", Password: "hashed123"},
        {ID: 2, Username: "bob", Email: "bob@example.com", Password: "hashed456"},
    }
    
    // Convert to API response format
    apiUsers := ConvertUsers(dbUsers)
    
    fmt.Printf("API Users: %+v\n", apiUsers)
}
```

---

## Performance Considerations

When converting large slices, preallocating the result slice is important for performance. Compare these two approaches:

```go
package main

import (
    "fmt"
    "time"
)

func convertWithAppend(ints []int) []float64 {
    // Less efficient: append causes multiple allocations
    var result []float64
    for _, v := range ints {
        result = append(result, float64(v))
    }
    return result
}

func convertWithMake(ints []int) []float64 {
    // More efficient: single allocation
    result := make([]float64, len(ints))
    for i, v := range ints {
        result[i] = float64(v)
    }
    return result
}

func main() {
    // Create a large slice for benchmarking
    size := 1000000
    ints := make([]int, size)
    for i := range ints {
        ints[i] = i
    }
    
    // Benchmark append approach
    start := time.Now()
    _ = convertWithAppend(ints)
    appendDuration := time.Since(start)
    
    // Benchmark make approach
    start = time.Now()
    _ = convertWithMake(ints)
    makeDuration := time.Since(start)
    
    fmt.Printf("Append approach: %v\n", appendDuration)
    fmt.Printf("Make approach: %v\n", makeDuration)
    fmt.Printf("Make is %.2fx faster\n", float64(appendDuration)/float64(makeDuration))
}
```

---

## Converting Between Underlying Types

If two types share the same underlying type, you can convert between them directly without iteration:

```go
package main

import "fmt"

// UserID is a custom type based on int64
type UserID int64

// OrderID is another custom type based on int64
type OrderID int64

func main() {
    // Direct conversion works for single values with same underlying type
    userID := UserID(42)
    orderID := OrderID(userID) // This works!
    
    fmt.Println("UserID:", userID)
    fmt.Println("OrderID:", orderID)
    
    // But slices still need iteration
    userIDs := []UserID{1, 2, 3}
    orderIDs := make([]OrderID, len(userIDs))
    for i, id := range userIDs {
        orderIDs[i] = OrderID(id)
    }
    
    fmt.Println("Order IDs:", orderIDs)
}
```

---

## Filtering During Conversion

Often you want to filter and convert at the same time. Here's a pattern for that:

```go
package main

import "fmt"

// FilterMap combines filtering and transformation
func FilterMap[T any, U any](input []T, fn func(T) (U, bool)) []U {
    // Start with empty slice since we don't know the final size
    result := make([]U, 0, len(input)) // capacity hint
    
    for _, v := range input {
        if converted, ok := fn(v); ok {
            result = append(result, converted)
        }
    }
    
    return result
}

func main() {
    numbers := []int{-2, -1, 0, 1, 2, 3, 4, 5}
    
    // Filter for positive numbers and convert to float64
    positiveFloats := FilterMap(numbers, func(n int) (float64, bool) {
        if n > 0 {
            return float64(n), true
        }
        return 0, false
    })
    
    fmt.Println("Positive floats:", positiveFloats) // [1 2 3 4 5]
}
```

---

## Unsafe Conversion (Advanced)

In rare cases where performance is critical and types have identical memory layouts, you can use unsafe conversion. This is generally not recommended:

```go
package main

import (
    "fmt"
    "unsafe"
)

type Int32Alias int32

func main() {
    // Original slice
    original := []int32{1, 2, 3, 4, 5}
    
    // Unsafe conversion - ONLY works because Int32Alias has
    // exactly the same memory layout as int32
    // WARNING: This is dangerous and should be avoided in most cases
    converted := *(*[]Int32Alias)(unsafe.Pointer(&original))
    
    fmt.Println("Original:", original)
    fmt.Println("Converted:", converted)
    
    // Modifying converted affects original (they share memory)
    converted[0] = 100
    fmt.Println("After modification:")
    fmt.Println("Original:", original)   // [100 2 3 4 5]
    fmt.Println("Converted:", converted) // [100 2 3 4 5]
}
```

This technique should only be used when:
1. You've profiled and confirmed it's a bottleneck
2. The types have identical memory layouts
3. You understand the shared memory implications

---

## Summary

Key takeaways for slice type conversion in Go:

1. **Direct conversion doesn't work** because different types have different memory layouts
2. **Use iteration** with `make()` for efficient conversion
3. **Generics** (Go 1.18+) make reusable conversion functions practical
4. **Preallocate** with `make()` instead of using `append` for better performance
5. **Avoid unsafe** unless absolutely necessary and you understand the risks

The explicit iteration requirement might feel verbose, but it makes the cost of conversion visible and gives you control over the transformation process.

---

*Working with Go in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Go applications with OpenTelemetry integration, helping you track performance and catch issues before they affect users.*
