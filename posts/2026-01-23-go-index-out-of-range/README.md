# How to Fix 'index out of range' Panics in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Errors, Panic, Arrays, Slices, Bounds Checking

Description: Learn how to prevent and fix 'index out of range' panics in Go when accessing arrays, slices, and strings with invalid indices.

---

The "index out of range" panic occurs when you try to access an array, slice, or string element at an index that doesn't exist. Go performs bounds checking at runtime and panics when indices are out of bounds.

---

## The Panic

```go
package main

func main() {
    nums := []int{1, 2, 3}
    
    // panic: runtime error: index out of range [5] with length 3
    _ = nums[5]
    
    // panic: runtime error: index out of range [-1]
    _ = nums[-1]
}
```

---

## Solution 1: Check Length Before Access

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3}
    index := 5
    
    // Always check bounds
    if index >= 0 && index < len(nums) {
        fmt.Println("Value:", nums[index])
    } else {
        fmt.Println("Index out of range")
    }
}
```

---

## Solution 2: Safe Access Function

```go
package main

import "fmt"

func safeGet[T any](slice []T, index int) (T, bool) {
    var zero T
    if index < 0 || index >= len(slice) {
        return zero, false
    }
    return slice[index], true
}

func safeGetWithDefault[T any](slice []T, index int, defaultVal T) T {
    if index < 0 || index >= len(slice) {
        return defaultVal
    }
    return slice[index]
}

func main() {
    nums := []int{10, 20, 30}
    
    // Safe get with ok pattern
    if val, ok := safeGet(nums, 5); ok {
        fmt.Println("Value:", val)
    } else {
        fmt.Println("Index not found")
    }
    
    // Safe get with default
    val := safeGetWithDefault(nums, 5, -1)
    fmt.Println("Value or default:", val)
}
```

---

## Solution 3: Use Range for Iteration

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3, 4, 5}
    
    // Safe: range handles bounds automatically
    for i, v := range nums {
        fmt.Printf("Index %d: %d\n", i, v)
    }
    
    // Unsafe: manual indexing can go wrong
    // for i := 0; i <= len(nums); i++ {  // Bug: <= instead of <
    //     fmt.Println(nums[i])  // Panic on last iteration
    // }
    
    // Safe: correct bounds
    for i := 0; i < len(nums); i++ {
        fmt.Println(nums[i])
    }
}
```

---

## Common Scenarios

### Empty Slice Access

```go
package main

import "fmt"

func main() {
    var nums []int  // nil slice
    
    // Panic!
    // _ = nums[0]
    
    // Safe
    if len(nums) > 0 {
        fmt.Println("First:", nums[0])
    } else {
        fmt.Println("Slice is empty")
    }
}
```

### Off-by-One Errors

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3, 4, 5}
    
    // Bug: accessing nums[len(nums)]
    // last := nums[len(nums)]  // Panic!
    
    // Correct: last element
    last := nums[len(nums)-1]
    fmt.Println("Last:", last)
    
    // Safe first and last
    if len(nums) > 0 {
        first := nums[0]
        last := nums[len(nums)-1]
        fmt.Println("First:", first, "Last:", last)
    }
}
```

### Slice Operations

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3}
    
    // Safe slicing (end can equal length)
    sub := nums[0:len(nums)]  // OK
    fmt.Println(sub)
    
    // But index access cannot
    // _ = nums[len(nums)]  // Panic!
    
    // Safe slice bounds checking
    start, end := 1, 5
    if start < 0 {
        start = 0
    }
    if end > len(nums) {
        end = len(nums)
    }
    if start > end {
        start = end
    }
    
    safe := nums[start:end]
    fmt.Println("Safe slice:", safe)
}
```

### String Indexing

```go
package main

import "fmt"

func main() {
    s := "hello"
    
    // Panic if string is shorter
    // char := s[10]  // Panic!
    
    // Safe access
    index := 10
    if index >= 0 && index < len(s) {
        fmt.Printf("Char at %d: %c\n", index, s[index])
    } else {
        fmt.Println("Index out of range")
    }
    
    // For runes (Unicode-safe)
    runes := []rune(s)
    if index < len(runes) {
        fmt.Printf("Rune at %d: %c\n", index, runes[index])
    }
}
```

---

## Defensive Programming Pattern

```go
package main

import "fmt"

type SafeSlice[T any] struct {
    data []T
}

func NewSafeSlice[T any](data []T) *SafeSlice[T] {
    return &SafeSlice[T]{data: data}
}

func (s *SafeSlice[T]) Get(index int) (T, error) {
    var zero T
    if index < 0 || index >= len(s.data) {
        return zero, fmt.Errorf("index %d out of range [0, %d)", index, len(s.data))
    }
    return s.data[index], nil
}

func (s *SafeSlice[T]) Set(index int, value T) error {
    if index < 0 || index >= len(s.data) {
        return fmt.Errorf("index %d out of range [0, %d)", index, len(s.data))
    }
    s.data[index] = value
    return nil
}

func (s *SafeSlice[T]) First() (T, bool) {
    var zero T
    if len(s.data) == 0 {
        return zero, false
    }
    return s.data[0], true
}

func (s *SafeSlice[T]) Last() (T, bool) {
    var zero T
    if len(s.data) == 0 {
        return zero, false
    }
    return s.data[len(s.data)-1], true
}

func main() {
    s := NewSafeSlice([]int{10, 20, 30})
    
    val, err := s.Get(5)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Value:", val)
    }
    
    if first, ok := s.First(); ok {
        fmt.Println("First:", first)
    }
    
    if last, ok := s.Last(); ok {
        fmt.Println("Last:", last)
    }
}
```

---

## Recover from Panic

```go
package main

import "fmt"

func safeAccess(slice []int, index int) (value int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic recovered: %v", r)
        }
    }()
    
    return slice[index], nil
}

func main() {
    nums := []int{1, 2, 3}
    
    val, err := safeAccess(nums, 10)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Value:", val)
    }
}
```

Note: Using recover for bounds checking is not recommended. Always prefer explicit bounds checking.

---

## Common Patterns

### Pop from Slice

```go
package main

import "fmt"

func pop[T any](slice *[]T) (T, bool) {
    var zero T
    if len(*slice) == 0 {
        return zero, false
    }
    
    last := len(*slice) - 1
    value := (*slice)[last]
    *slice = (*slice)[:last]
    return value, true
}

func main() {
    nums := []int{1, 2, 3, 4, 5}
    
    for len(nums) > 0 {
        val, _ := pop(&nums)
        fmt.Println("Popped:", val)
    }
    
    // Safe on empty slice
    _, ok := pop(&nums)
    fmt.Println("Pop on empty:", ok)
}
```

### Queue Operations

```go
package main

import "fmt"

type Queue[T any] struct {
    items []T
}

func (q *Queue[T]) Enqueue(item T) {
    q.items = append(q.items, item)
}

func (q *Queue[T]) Dequeue() (T, bool) {
    var zero T
    if len(q.items) == 0 {
        return zero, false
    }
    
    item := q.items[0]
    q.items = q.items[1:]
    return item, true
}

func (q *Queue[T]) Peek() (T, bool) {
    var zero T
    if len(q.items) == 0 {
        return zero, false
    }
    return q.items[0], true
}

func main() {
    q := &Queue[string]{}
    
    q.Enqueue("first")
    q.Enqueue("second")
    
    if val, ok := q.Dequeue(); ok {
        fmt.Println("Dequeued:", val)
    }
}
```

---

## Summary

| Scenario | Prevention |
|----------|------------|
| Empty slice | Check `len(s) > 0` |
| Last element | Use `s[len(s)-1]` with length check |
| Loop bounds | Use `<` not `<=` |
| User input | Validate index range |
| Concurrent access | Use mutex or safe data structure |

**Best Practices:**

1. Always check slice length before indexing
2. Use `range` for iteration when possible
3. Create safe accessor functions
4. Validate indices from external input
5. Use the ok pattern for optional access
6. Avoid using recover for bounds checking

---

*Tracking panics in production? [OneUptime](https://oneuptime.com) helps you monitor Go applications, capture panic stack traces, and alert you to issues before they impact users.*
