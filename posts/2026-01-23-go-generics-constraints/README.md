# How to Use Generics with Type Constraints in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Generics, Type Constraints, Type Parameters, Go 1.18

Description: Learn how to use Go generics effectively with type constraints including any, comparable, custom constraints, and the constraints package.

---

Go 1.18 introduced generics, allowing you to write functions and types that work with multiple types while maintaining type safety. Type constraints specify what operations are allowed on type parameters.

---

## Basic Generic Function

```go
package main

import "fmt"

// T is a type parameter constrained by 'any'
func Print[T any](value T) {
    fmt.Println(value)
}

func main() {
    Print(42)        // int
    Print("hello")   // string
    Print(3.14)      // float64
    Print([]int{1, 2, 3})  // slice
}
```

---

## Type Constraints

### The `any` Constraint

`any` is an alias for `interface{}` - allows any type:

```go
func Identity[T any](v T) T {
    return v
}
```

### The `comparable` Constraint

Allows types that support `==` and `!=`:

```go
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}

func main() {
    fmt.Println(Contains([]int{1, 2, 3}, 2))        // true
    fmt.Println(Contains([]string{"a", "b"}, "c"))  // false
}
```

### Custom Interface Constraints

```go
// Constraint that requires a String() method
type Stringer interface {
    String() string
}

func Stringify[T Stringer](items []T) []string {
    result := make([]string, len(items))
    for i, item := range items {
        result[i] = item.String()
    }
    return result
}
```

---

## Type Sets (Union Constraints)

Define constraints that allow specific types:

```go
// Only allows int, int32, int64
type Integer interface {
    int | int32 | int64
}

func Sum[T Integer](numbers []T) T {
    var sum T
    for _, n := range numbers {
        sum += n
    }
    return sum
}

func main() {
    ints := []int{1, 2, 3}
    fmt.Println(Sum(ints))  // 6
    
    int64s := []int64{10, 20, 30}
    fmt.Println(Sum(int64s))  // 60
}
```

---

## The ~T Approximation Constraint

`~T` matches type T and any type with T as its underlying type:

```go
type MyInt int

// Without ~: only accepts int
type IntOnly interface {
    int
}

// With ~: accepts int AND types based on int
type IntLike interface {
    ~int
}

func Double[T IntLike](v T) T {
    return v * 2
}

func main() {
    var x MyInt = 5
    fmt.Println(Double(x))  // 10 - works because MyInt's underlying type is int
}
```

---

## Ordered Constraint

For types that support `<`, `>`, `<=`, `>=`:

```go
import "golang.org/x/exp/constraints"

// Or define your own:
type Ordered interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64 |
    ~string
}

func Max[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func Min[T Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Max(3, 5))           // 5
    fmt.Println(Max(3.14, 2.71))     // 3.14
    fmt.Println(Max("apple", "zoo")) // zoo
}
```

---

## Multiple Type Parameters

```go
// Two different type parameters
func Map[T, U any](items []T, f func(T) U) []U {
    result := make([]U, len(items))
    for i, item := range items {
        result[i] = f(item)
    }
    return result
}

func main() {
    ints := []int{1, 2, 3}
    strings := Map(ints, func(i int) string {
        return fmt.Sprintf("num:%d", i)
    })
    fmt.Println(strings)  // [num:1 num:2 num:3]
}
```

---

## Generic Types

### Generic Struct

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

func main() {
    intStack := &Stack[int]{}
    intStack.Push(1)
    intStack.Push(2)
    
    val, _ := intStack.Pop()
    fmt.Println(val)  // 2
    
    stringStack := &Stack[string]{}
    stringStack.Push("hello")
}
```

### Generic Map Type

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](items ...T) Set[T] {
    s := make(Set[T])
    for _, item := range items {
        s[item] = struct{}{}
    }
    return s
}

func (s Set[T]) Add(item T) {
    s[item] = struct{}{}
}

func (s Set[T]) Contains(item T) bool {
    _, ok := s[item]
    return ok
}

func (s Set[T]) Remove(item T) {
    delete(s, item)
}

func main() {
    set := NewSet(1, 2, 3)
    set.Add(4)
    fmt.Println(set.Contains(3))  // true
    fmt.Println(set.Contains(5))  // false
}
```

---

## Combining Constraints

```go
// Must be both comparable AND have String method
type ComparableStringer interface {
    comparable
    String() string
}

// Union with method requirement
type Number interface {
    ~int | ~float64
    Abs() float64
}
```

---

## Type Inference

Go can often infer type parameters:

```go
func First[T any](slice []T) T {
    return slice[0]
}

func main() {
    // Explicit type parameter
    result1 := First[int]([]int{1, 2, 3})
    
    // Inferred type parameter
    result2 := First([]int{1, 2, 3})  // T inferred as int
    
    fmt.Println(result1, result2)
}
```

---

## Real-World Examples

### Generic Filter

```go
func Filter[T any](items []T, predicate func(T) bool) []T {
    var result []T
    for _, item := range items {
        if predicate(item) {
            result = append(result, item)
        }
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4, 5, 6}
    evens := Filter(nums, func(n int) bool {
        return n%2 == 0
    })
    fmt.Println(evens)  // [2 4 6]
}
```

### Generic Reduce

```go
func Reduce[T, U any](items []T, initial U, f func(U, T) U) U {
    result := initial
    for _, item := range items {
        result = f(result, item)
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4}
    sum := Reduce(nums, 0, func(acc, n int) int {
        return acc + n
    })
    fmt.Println(sum)  // 10
}
```

### Generic Result Type

```go
type Result[T any] struct {
    Value T
    Error error
}

func (r Result[T]) Unwrap() (T, error) {
    return r.Value, r.Error
}

func (r Result[T]) UnwrapOr(defaultValue T) T {
    if r.Error != nil {
        return defaultValue
    }
    return r.Value
}

func Fetch[T any](url string) Result[T] {
    // Implementation
    return Result[T]{}
}
```

---

## Constraints Package

Use `golang.org/x/exp/constraints` for common constraints:

```go
import "golang.org/x/exp/constraints"

func Abs[T constraints.Signed](n T) T {
    if n < 0 {
        return -n
    }
    return n
}

func Clamp[T constraints.Ordered](value, min, max T) T {
    if value < min {
        return min
    }
    if value > max {
        return max
    }
    return value
}
```

Available constraints:
- `constraints.Signed` - signed integers
- `constraints.Unsigned` - unsigned integers
- `constraints.Integer` - all integers
- `constraints.Float` - float32, float64
- `constraints.Complex` - complex64, complex128
- `constraints.Ordered` - types supporting `<`

---

## Summary

| Constraint | Description |
|------------|-------------|
| `any` | Any type (alias for `interface{}`) |
| `comparable` | Types supporting `==` and `!=` |
| `~T` | T and types with T as underlying type |
| `A \| B` | Type union (A or B) |
| `constraints.Ordered` | Types supporting `<`, `>` |

**Best Practices:**

1. Use generics when you'd otherwise duplicate code
2. Prefer specific constraints over `any`
3. Use `comparable` for map keys and equality checks
4. Use `~T` to accept custom types
5. Keep constraint definitions simple and readable
6. Document complex constraints

---

*Building Go applications with generics? [OneUptime](https://oneuptime.com) provides monitoring and observability for your Go services, helping you track performance regardless of how your code is structured.*
