# How to Build Generic Data Structures with Go 1.21+ Generics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Generics, Data Structures, Go 1.21, Type Safety

Description: Learn how to build reusable, type-safe data structures in Go using generics. This guide covers stacks, queues, linked lists, and sets with practical examples and best practices.

---

Go 1.18 introduced generics, and Go 1.21 refined them with better type inference and the `cmp` package. Before generics, building reusable data structures meant either copy-pasting code for each type or using `interface{}` and losing type safety. Now you can write a single implementation that works with any type while catching errors at compile time.

This guide walks through building the most common generic data structures from scratch.

## Why Generics Matter for Data Structures

Consider a simple stack. Before generics, you had two options:

The first option was to write a separate stack for each type - `IntStack`, `StringStack`, `UserStack`. This works but creates maintenance headaches when you need to fix bugs or add features.

The second option was to use `interface{}` and accept any value. This loses type safety since you need runtime type assertions that can panic.

Generics give you the best of both worlds: write once, use with any type, keep compile-time safety.

## The Basics: Type Parameters

Type parameters let you write functions and types that work with multiple types. The syntax uses square brackets.

This generic function returns the first element of any slice, regardless of element type:

```go
// T is a type parameter - it gets replaced with the actual type when you call the function
func First[T any](slice []T) (T, bool) {
    if len(slice) == 0 {
        var zero T  // zero value for type T
        return zero, false
    }
    return slice[0], true
}

// Usage - type is inferred from the argument
first, ok := First([]int{1, 2, 3})     // first is int
name, ok := First([]string{"a", "b"})   // name is string
```

The `any` constraint means T can be any type. For more restrictive constraints, you can use interfaces or the built-in `comparable` constraint.

## Building a Generic Stack

A stack follows Last-In-First-Out (LIFO) ordering. Push adds to the top, Pop removes from the top.

The struct uses a type parameter to make the internal slice type-safe:

```go
package collections

// Stack is a generic LIFO data structure
// T can be any type - the constraint 'any' allows all types
type Stack[T any] struct {
    items []T
}

// NewStack creates an empty stack with optional initial capacity
func NewStack[T any](capacity int) *Stack[T] {
    return &Stack[T]{
        items: make([]T, 0, capacity),
    }
}

// Push adds an element to the top of the stack
func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

// Pop removes and returns the top element
// Returns the zero value and false if the stack is empty
func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }

    // Get last element
    index := len(s.items) - 1
    item := s.items[index]

    // Remove it from the slice
    s.items = s.items[:index]

    return item, true
}

// Peek returns the top element without removing it
func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

// Len returns the number of elements
func (s *Stack[T]) Len() int {
    return len(s.items)
}

// IsEmpty checks if the stack has no elements
func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}
```

Using the stack is straightforward - the type parameter is inferred or explicit:

```go
// Type inferred from the first Push
intStack := NewStack[int](10)
intStack.Push(1)
intStack.Push(2)
intStack.Push(3)

value, ok := intStack.Pop()  // value is 3, ok is true

// Works with custom types too
type User struct {
    ID   int
    Name string
}

userStack := NewStack[User](5)
userStack.Push(User{ID: 1, Name: "Alice"})
```

## Building a Generic Queue

A queue follows First-In-First-Out (FIFO) ordering. Enqueue adds to the back, Dequeue removes from the front.

```go
package collections

// Queue is a generic FIFO data structure
type Queue[T any] struct {
    items []T
}

// NewQueue creates an empty queue
func NewQueue[T any]() *Queue[T] {
    return &Queue[T]{
        items: make([]T, 0),
    }
}

// Enqueue adds an element to the back of the queue
func (q *Queue[T]) Enqueue(item T) {
    q.items = append(q.items, item)
}

// Dequeue removes and returns the front element
func (q *Queue[T]) Dequeue() (T, bool) {
    if len(q.items) == 0 {
        var zero T
        return zero, false
    }

    // Get first element
    item := q.items[0]

    // Remove it - this is O(n) but simple
    // For high-performance, use a ring buffer instead
    q.items = q.items[1:]

    return item, true
}

// Front returns the front element without removing it
func (q *Queue[T]) Front() (T, bool) {
    if len(q.items) == 0 {
        var zero T
        return zero, false
    }
    return q.items[0], true
}

// Len returns the number of elements
func (q *Queue[T]) Len() int {
    return len(q.items)
}
```

## Building a Generic Set

Sets store unique elements. Go does not have a built-in set type, but you can build one using a map. The `comparable` constraint is required because map keys must be comparable.

```go
package collections

// Set stores unique elements
// The comparable constraint is required because we use T as a map key
type Set[T comparable] struct {
    items map[T]struct{}
}

// NewSet creates an empty set
func NewSet[T comparable]() *Set[T] {
    return &Set[T]{
        items: make(map[T]struct{}),
    }
}

// Add inserts an element into the set
// Returns true if the element was added, false if it already existed
func (s *Set[T]) Add(item T) bool {
    if _, exists := s.items[item]; exists {
        return false
    }
    s.items[item] = struct{}{}  // empty struct uses zero memory
    return true
}

// Remove deletes an element from the set
func (s *Set[T]) Remove(item T) bool {
    if _, exists := s.items[item]; !exists {
        return false
    }
    delete(s.items, item)
    return true
}

// Contains checks if an element exists in the set
func (s *Set[T]) Contains(item T) bool {
    _, exists := s.items[item]
    return exists
}

// Len returns the number of elements
func (s *Set[T]) Len() int {
    return len(s.items)
}

// ToSlice returns all elements as a slice
func (s *Set[T]) ToSlice() []T {
    result := make([]T, 0, len(s.items))
    for item := range s.items {
        result = append(result, item)
    }
    return result
}

// Union returns a new set with elements from both sets
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

// Intersection returns a new set with elements common to both sets
func (s *Set[T]) Intersection(other *Set[T]) *Set[T] {
    result := NewSet[T]()

    // Iterate over the smaller set for efficiency
    smaller, larger := s, other
    if s.Len() > other.Len() {
        smaller, larger = other, s
    }

    for item := range smaller.items {
        if larger.Contains(item) {
            result.Add(item)
        }
    }

    return result
}
```

## Building a Generic Linked List

A singly linked list is useful when you need O(1) insertions at the head or do not know the size in advance.

```go
package collections

// Node represents a single element in the linked list
type Node[T any] struct {
    Value T
    Next  *Node[T]
}

// LinkedList is a singly linked list
type LinkedList[T any] struct {
    head *Node[T]
    tail *Node[T]
    size int
}

// NewLinkedList creates an empty linked list
func NewLinkedList[T any]() *LinkedList[T] {
    return &LinkedList[T]{}
}

// Prepend adds an element to the front - O(1)
func (l *LinkedList[T]) Prepend(value T) {
    node := &Node[T]{Value: value, Next: l.head}
    l.head = node

    if l.tail == nil {
        l.tail = node
    }
    l.size++
}

// Append adds an element to the back - O(1)
func (l *LinkedList[T]) Append(value T) {
    node := &Node[T]{Value: value}

    if l.tail == nil {
        l.head = node
        l.tail = node
    } else {
        l.tail.Next = node
        l.tail = node
    }
    l.size++
}

// RemoveFirst removes and returns the first element - O(1)
func (l *LinkedList[T]) RemoveFirst() (T, bool) {
    if l.head == nil {
        var zero T
        return zero, false
    }

    value := l.head.Value
    l.head = l.head.Next

    if l.head == nil {
        l.tail = nil
    }
    l.size--

    return value, true
}

// First returns the first element without removing it
func (l *LinkedList[T]) First() (T, bool) {
    if l.head == nil {
        var zero T
        return zero, false
    }
    return l.head.Value, true
}

// ForEach applies a function to each element
func (l *LinkedList[T]) ForEach(fn func(T)) {
    current := l.head
    for current != nil {
        fn(current.Value)
        current = current.Next
    }
}

// Len returns the number of elements
func (l *LinkedList[T]) Len() int {
    return l.size
}
```

## Using Type Constraints

Go 1.21 added the `cmp` package with useful constraints. Use these when your data structure needs ordering or comparison.

This example shows a sorted set that maintains elements in order:

```go
package collections

import "cmp"

// SortedSet maintains elements in sorted order
// cmp.Ordered constraint allows <, >, <= comparisons
type SortedSet[T cmp.Ordered] struct {
    items []T
}

// NewSortedSet creates an empty sorted set
func NewSortedSet[T cmp.Ordered]() *SortedSet[T] {
    return &SortedSet[T]{
        items: make([]T, 0),
    }
}

// Add inserts an element maintaining sorted order
func (s *SortedSet[T]) Add(item T) bool {
    // Binary search to find insertion point
    index := s.searchIndex(item)

    // Check if element already exists
    if index < len(s.items) && s.items[index] == item {
        return false
    }

    // Insert at the correct position
    s.items = append(s.items, item)  // grow slice
    copy(s.items[index+1:], s.items[index:])  // shift elements
    s.items[index] = item

    return true
}

// searchIndex finds where an item should be inserted using binary search
func (s *SortedSet[T]) searchIndex(item T) int {
    low, high := 0, len(s.items)

    for low < high {
        mid := (low + high) / 2
        if s.items[mid] < item {
            low = mid + 1
        } else {
            high = mid
        }
    }

    return low
}

// Contains checks if an element exists - O(log n)
func (s *SortedSet[T]) Contains(item T) bool {
    index := s.searchIndex(item)
    return index < len(s.items) && s.items[index] == item
}

// Min returns the smallest element
func (s *SortedSet[T]) Min() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[0], true
}

// Max returns the largest element
func (s *SortedSet[T]) Max() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}
```

## Common Pitfalls

**1. Using pointers with comparable constraint**

The `comparable` constraint works with pointer types, but comparison is by address, not value. Two pointers to identical structs are not equal.

```go
// This compares pointer addresses, not struct contents
set := NewSet[*User]()
set.Add(&User{ID: 1})
set.Add(&User{ID: 1})  // Added - different pointer addresses
// set.Len() is 2, not 1
```

**2. Forgetting zero values**

When returning "not found", you need to return the zero value for type T. Declare a variable without assignment to get the zero value.

```go
func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T  // zero value: 0 for int, "" for string, nil for pointers
        return zero, false
    }
    // ...
}
```

**3. Method receivers with type parameters**

The type parameter must be included in the receiver, but do not repeat the constraint.

```go
// Correct - type parameter in receiver
func (s *Stack[T]) Push(item T) { }

// Wrong - constraint repeated in receiver
func (s *Stack[T any]) Push(item T) { }  // compilation error
```

**4. Interfaces with generics**

If you want an interface that your generic types implement, define it without type parameters.

```go
// Interface for any collection
type Collection interface {
    Len() int
    IsEmpty() bool
}

// Stack[T] implements Collection because it has these methods
var _ Collection = (*Stack[int])(nil)  // compile-time check
```

## Best Practices

**Keep constraints minimal.** Use `any` when possible. Only use `comparable` when you need map keys or equality checks. Only use `cmp.Ordered` when you need ordering.

**Document behavior with zero values.** Make it clear what happens when operations fail. Return `(T, bool)` pairs or use the `ok` idiom.

**Consider thread safety separately.** The examples here are not thread-safe. For concurrent access, wrap with a mutex or use channels.

**Test with multiple types.** Generic code should be tested with various types to catch constraint issues.

## Summary

Go generics let you build reusable data structures without sacrificing type safety. The key concepts are:

- Type parameters with constraints define what types are allowed
- `any` allows all types, `comparable` allows equality and map keys, `cmp.Ordered` allows ordering
- Zero values handle the "not found" case cleanly
- Methods include the type parameter in the receiver

Start with simple structures like Stack and Queue, then build more complex ones as you get comfortable with the syntax. The compiler catches type mismatches at build time, so you can refactor confidently.
