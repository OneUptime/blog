# How to Use Generics Effectively in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Generics, Type Parameters, Constraints, Go 1.18

Description: Learn how to use generics effectively in Go including type parameters, constraints, generic data structures, and best practices.

---

Go 1.18 introduced generics, enabling you to write functions and data structures that work with multiple types while maintaining type safety. This guide covers practical patterns for effective generic code.

---

## Basic Generic Functions

```go
package main

import "fmt"

// Generic function with type parameter T
func Print[T any](value T) {
    fmt.Println(value)
}

// Multiple type parameters
func Pair[T, U any](first T, second U) (T, U) {
    return first, second
}

// Generic with constraint
func Max[T comparable](a, b T) T {
    if a > b {  // Error: cannot compare with >
        return a
    }
    return b
}

func main() {
    Print(42)
    Print("hello")
    Print([]int{1, 2, 3})
    
    a, b := Pair("name", 25)
    fmt.Println(a, b)
}
```

---

## Type Constraints

### Built-in Constraints

```go
package main

import (
    "cmp"
    "fmt"
)

// any - allows any type
func Identity[T any](v T) T {
    return v
}

// comparable - allows == and !=
func Equal[T comparable](a, b T) bool {
    return a == b
}

// cmp.Ordered - allows <, >, <=, >=
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Identity("hello"))
    fmt.Println(Equal(1, 1))
    fmt.Println(Max(10, 20))
}
```

---

### Custom Constraints

```go
package main

import "fmt"

// Interface constraint - must have method
type Stringer interface {
    String() string
}

func PrintString[T Stringer](v T) {
    fmt.Println(v.String())
}

// Union constraint - specific types only
type Number interface {
    int | int32 | int64 | float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// Approximate constraint with ~
type Integer interface {
    ~int | ~int32 | ~int64
}

type MyInt int

func Double[T Integer](v T) T {
    return v * 2
}

func main() {
    fmt.Println(Sum([]int{1, 2, 3, 4, 5}))
    fmt.Println(Sum([]float64{1.1, 2.2, 3.3}))
    
    var mi MyInt = 5
    fmt.Println(Double(mi))  // Works due to ~int
}
```

---

## Generic Data Structures

### Generic Stack

```go
package main

import "fmt"

type Stack[T any] struct {
    items []T
}

func NewStack[T any]() *Stack[T] {
    return &Stack[T]{
        items: make([]T, 0),
    }
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    
    index := len(s.items) - 1
    item := s.items[index]
    s.items = s.items[:index]
    return item, true
}

func (s *Stack[T]) Peek() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

func main() {
    // Integer stack
    intStack := NewStack[int]()
    intStack.Push(1)
    intStack.Push(2)
    intStack.Push(3)
    
    for intStack.Len() > 0 {
        val, _ := intStack.Pop()
        fmt.Println(val)
    }
    
    // String stack
    strStack := NewStack[string]()
    strStack.Push("hello")
    strStack.Push("world")
    
    top, _ := strStack.Peek()
    fmt.Println("Top:", top)
}
```

---

### Generic Map with Default

```go
package main

import "fmt"

type SafeMap[K comparable, V any] struct {
    data         map[K]V
    defaultValue V
}

func NewSafeMap[K comparable, V any](defaultVal V) *SafeMap[K, V] {
    return &SafeMap[K, V]{
        data:         make(map[K]V),
        defaultValue: defaultVal,
    }
}

func (m *SafeMap[K, V]) Set(key K, value V) {
    m.data[key] = value
}

func (m *SafeMap[K, V]) Get(key K) V {
    if val, ok := m.data[key]; ok {
        return val
    }
    return m.defaultValue
}

func (m *SafeMap[K, V]) Has(key K) bool {
    _, ok := m.data[key]
    return ok
}

func main() {
    // Map with default value 0
    counts := NewSafeMap[string, int](0)
    counts.Set("apples", 5)
    
    fmt.Println(counts.Get("apples"))   // 5
    fmt.Println(counts.Get("oranges"))  // 0 (default)
    
    // Map with default empty string
    names := NewSafeMap[int, string]("unknown")
    names.Set(1, "Alice")
    
    fmt.Println(names.Get(1))  // Alice
    fmt.Println(names.Get(2))  // unknown (default)
}
```

---

### Generic Set

```go
package main

import "fmt"

type Set[T comparable] struct {
    items map[T]struct{}
}

func NewSet[T comparable]() *Set[T] {
    return &Set[T]{
        items: make(map[T]struct{}),
    }
}

func (s *Set[T]) Add(item T) {
    s.items[item] = struct{}{}
}

func (s *Set[T]) Remove(item T) {
    delete(s.items, item)
}

func (s *Set[T]) Contains(item T) bool {
    _, ok := s.items[item]
    return ok
}

func (s *Set[T]) Len() int {
    return len(s.items)
}

func (s *Set[T]) ToSlice() []T {
    result := make([]T, 0, len(s.items))
    for item := range s.items {
        result = append(result, item)
    }
    return result
}

func (s *Set[T]) Union(other *Set[T]) *Set[T] {
    result := NewSet[T]()
    for item := range s.items {
        result.Add(item)
    }
    for item := range other.items {
        result.Add(item)
    }
    return result
}

func (s *Set[T]) Intersection(other *Set[T]) *Set[T] {
    result := NewSet[T]()
    for item := range s.items {
        if other.Contains(item) {
            result.Add(item)
        }
    }
    return result
}

func main() {
    set1 := NewSet[int]()
    set1.Add(1)
    set1.Add(2)
    set1.Add(3)
    
    set2 := NewSet[int]()
    set2.Add(2)
    set2.Add(3)
    set2.Add(4)
    
    union := set1.Union(set2)
    fmt.Println("Union:", union.ToSlice())
    
    intersection := set1.Intersection(set2)
    fmt.Println("Intersection:", intersection.ToSlice())
}
```

---

## Generic Utility Functions

```go
package main

import (
    "cmp"
    "fmt"
)

// Filter elements
func Filter[T any](slice []T, predicate func(T) bool) []T {
    result := make([]T, 0)
    for _, v := range slice {
        if predicate(v) {
            result = append(result, v)
        }
    }
    return result
}

// Map/transform elements
func Map[T, U any](slice []T, transform func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = transform(v)
    }
    return result
}

// Reduce elements
func Reduce[T, U any](slice []T, initial U, reducer func(U, T) U) U {
    result := initial
    for _, v := range slice {
        result = reducer(result, v)
    }
    return result
}

// Find first matching element
func Find[T any](slice []T, predicate func(T) bool) (T, bool) {
    var zero T
    for _, v := range slice {
        if predicate(v) {
            return v, true
        }
    }
    return zero, false
}

// Group by key
func GroupBy[T any, K comparable](slice []T, keyFunc func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, v := range slice {
        key := keyFunc(v)
        result[key] = append(result[key], v)
    }
    return result
}

// Sort slice (Go 1.21+ slices package)
func SortSlice[T cmp.Ordered](slice []T) []T {
    result := make([]T, len(slice))
    copy(result, slice)
    
    // Simple bubble sort for demonstration
    for i := 0; i < len(result)-1; i++ {
        for j := 0; j < len(result)-i-1; j++ {
            if result[j] > result[j+1] {
                result[j], result[j+1] = result[j+1], result[j]
            }
        }
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    
    // Filter even numbers
    evens := Filter(nums, func(n int) bool { return n%2 == 0 })
    fmt.Println("Evens:", evens)
    
    // Double all numbers
    doubled := Map(nums, func(n int) int { return n * 2 })
    fmt.Println("Doubled:", doubled)
    
    // Sum all numbers
    sum := Reduce(nums, 0, func(acc, n int) int { return acc + n })
    fmt.Println("Sum:", sum)
    
    // Convert to strings
    strs := Map(nums, func(n int) string { return fmt.Sprintf("%d", n) })
    fmt.Println("Strings:", strs)
    
    // Group by even/odd
    type Person struct {
        Name string
        Age  int
    }
    people := []Person{
        {"Alice", 30},
        {"Bob", 25},
        {"Charlie", 30},
    }
    
    byAge := GroupBy(people, func(p Person) int { return p.Age })
    fmt.Println("By age:", byAge)
}
```

---

## Generic Result Type

```go
package main

import "fmt"

type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) IsErr() bool {
    return r.err != nil
}

func (r Result[T]) Unwrap() T {
    if r.err != nil {
        panic(r.err)
    }
    return r.value
}

func (r Result[T]) UnwrapOr(defaultVal T) T {
    if r.err != nil {
        return defaultVal
    }
    return r.value
}

func (r Result[T]) Map(fn func(T) T) Result[T] {
    if r.err != nil {
        return r
    }
    return Ok(fn(r.value))
}

func divide(a, b int) Result[int] {
    if b == 0 {
        return Err[int](fmt.Errorf("division by zero"))
    }
    return Ok(a / b)
}

func main() {
    result := divide(10, 2)
    if result.IsOk() {
        fmt.Println("Result:", result.Unwrap())
    }
    
    result2 := divide(10, 0)
    fmt.Println("With default:", result2.UnwrapOr(-1))
    
    // Chaining
    result3 := divide(100, 5).Map(func(n int) int { return n * 2 })
    fmt.Println("Mapped:", result3.UnwrapOr(0))
}
```

---

## When to Use Generics

```mermaid
graph TD
    A[Need Generic Code?] --> B{Same logic, different types?}
    B -->|Yes| C{Type-safe operations?}
    B -->|No| D[Use specific types]
    C -->|Yes| E[Use Generics]
    C -->|No| F[Consider interface{}]
    E --> G[Data structures]
    E --> H[Utility functions]
    E --> I[Algorithm implementations]
```

---

## Summary

| Feature | Syntax | Use Case |
|---------|--------|----------|
| Type parameter | `[T any]` | Any type |
| Comparable | `[T comparable]` | Map keys, equality |
| Ordered | `[T cmp.Ordered]` | Sorting, comparison |
| Union | `int \| string` | Specific types |
| Approximate | `~int` | Underlying types |

**Best Practices:**

1. Use the most restrictive constraint possible
2. Prefer standard constraints (`any`, `comparable`, `cmp.Ordered`)
3. Don't overuse generics - concrete types are often simpler
4. Use generics for data structures and algorithms
5. Avoid generics when `interface{}` suffices
6. Test with multiple type arguments

**When Not to Use Generics:**

1. Single type implementation
2. Simple interface polymorphism
3. When it reduces readability
4. For runtime type switching

---

*Building generic Go libraries? [OneUptime](https://oneuptime.com) helps you monitor your applications, track performance, and ensure type safety doesn't come at a cost.*
