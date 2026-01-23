# How to Handle Non-Deterministic Map Iteration Order in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Maps, Iteration, Sorting, Deterministic Order

Description: Learn why Go maps have random iteration order and discover patterns to iterate maps in sorted, deterministic, or insertion order for consistent results.

---

Go maps deliberately randomize iteration order. This prevents developers from accidentally depending on implementation details. If you need consistent ordering, you must implement it yourself.

---

## The Problem

Map iteration order is randomized:

```go
package main

import "fmt"

func main() {
    m := map[string]int{
        "one":   1,
        "two":   2,
        "three": 3,
        "four":  4,
        "five":  5,
    }
    
    // Run this multiple times - order changes!
    fmt.Println("Run 1:")
    for k, v := range m {
        fmt.Printf("  %s: %d\n", k, v)
    }
    
    fmt.Println("\nRun 2:")
    for k, v := range m {
        fmt.Printf("  %s: %d\n", k, v)
    }
}
```

Output will vary between iterations:

```
Run 1:
  three: 3
  four: 4
  one: 1
  two: 2
  five: 5

Run 2:
  one: 1
  five: 5
  three: 3
  two: 2
  four: 4
```

---

## Why Random Order?

Go randomizes map iteration for good reasons:

1. **Prevents reliance on implementation details** - Hash table order depends on hash function and bucket layout
2. **Enables optimization** - Runtime can change implementation without breaking code
3. **Security** - Makes hash collision attacks harder to exploit

---

## Solution 1: Sorted Keys

The most common solution is to extract and sort keys:

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    m := map[string]int{
        "banana": 2,
        "apple":  1,
        "cherry": 3,
    }
    
    // Extract keys
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    
    // Sort keys
    sort.Strings(keys)
    
    // Iterate in sorted order
    fmt.Println("Sorted by key:")
    for _, k := range keys {
        fmt.Printf("  %s: %d\n", k, m[k])
    }
}
```

Output is always:

```
Sorted by key:
  apple: 1
  banana: 2
  cherry: 3
```

---

## Solution 2: Sort by Value

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    m := map[string]int{
        "banana": 2,
        "apple":  1,
        "cherry": 3,
    }
    
    // Extract keys
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    
    // Sort keys by their values
    sort.Slice(keys, func(i, j int) bool {
        return m[keys[i]] < m[keys[j]]
    })
    
    fmt.Println("Sorted by value:")
    for _, k := range keys {
        fmt.Printf("  %s: %d\n", k, m[k])
    }
}
```

---

## Solution 3: Generic Sorted Iteration

Create reusable functions:

```go
package main

import (
    "cmp"
    "fmt"
    "slices"
)

// SortedKeys returns map keys sorted in ascending order
func SortedKeys[K cmp.Ordered, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    slices.Sort(keys)
    return keys
}

// SortedByValue returns keys sorted by their values
func SortedByValue[K comparable, V cmp.Ordered](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    slices.SortFunc(keys, func(a, b K) int {
        return cmp.Compare(m[a], m[b])
    })
    return keys
}

// RangeSorted iterates a map in key-sorted order
func RangeSorted[K cmp.Ordered, V any](m map[K]V, fn func(K, V)) {
    for _, k := range SortedKeys(m) {
        fn(k, m[k])
    }
}

func main() {
    scores := map[string]int{
        "Charlie": 85,
        "Alice":   95,
        "Bob":     90,
    }
    
    fmt.Println("By name:")
    RangeSorted(scores, func(name string, score int) {
        fmt.Printf("  %s: %d\n", name, score)
    })
    
    fmt.Println("\nBy score:")
    for _, name := range SortedByValue(scores) {
        fmt.Printf("  %s: %d\n", name, scores[name])
    }
}
```

---

## Solution 4: Insertion Order with Linked List

When you need insertion order, use a slice alongside the map:

```go
package main

import "fmt"

type OrderedMap[K comparable, V any] struct {
    keys   []K
    values map[K]V
}

func NewOrderedMap[K comparable, V any]() *OrderedMap[K, V] {
    return &OrderedMap[K, V]{
        keys:   make([]K, 0),
        values: make(map[K]V),
    }
}

func (om *OrderedMap[K, V]) Set(key K, value V) {
    if _, exists := om.values[key]; !exists {
        om.keys = append(om.keys, key)
    }
    om.values[key] = value
}

func (om *OrderedMap[K, V]) Get(key K) (V, bool) {
    v, ok := om.values[key]
    return v, ok
}

func (om *OrderedMap[K, V]) Delete(key K) {
    if _, exists := om.values[key]; exists {
        delete(om.values, key)
        // Remove from keys slice
        for i, k := range om.keys {
            if k == key {
                om.keys = append(om.keys[:i], om.keys[i+1:]...)
                break
            }
        }
    }
}

func (om *OrderedMap[K, V]) Range(fn func(K, V)) {
    for _, k := range om.keys {
        fn(k, om.values[k])
    }
}

func (om *OrderedMap[K, V]) Len() int {
    return len(om.keys)
}

func main() {
    om := NewOrderedMap[string, int]()
    
    // Insert in specific order
    om.Set("first", 1)
    om.Set("second", 2)
    om.Set("third", 3)
    om.Set("fourth", 4)
    
    // Update existing (order preserved)
    om.Set("second", 22)
    
    fmt.Println("Insertion order preserved:")
    om.Range(func(k string, v int) {
        fmt.Printf("  %s: %d\n", k, v)
    })
    
    // Output is always:
    // first: 1
    // second: 22
    // third: 3
    // fourth: 4
}
```

---

## Solution 5: Using Container/List for O(1) Delete

For frequent deletions, use `container/list`:

```go
package main

import (
    "container/list"
    "fmt"
)

type OrderedMapList[K comparable, V any] struct {
    list     *list.List
    elements map[K]*list.Element
}

type entry[K comparable, V any] struct {
    key   K
    value V
}

func NewOrderedMapList[K comparable, V any]() *OrderedMapList[K, V] {
    return &OrderedMapList[K, V]{
        list:     list.New(),
        elements: make(map[K]*list.Element),
    }
}

func (om *OrderedMapList[K, V]) Set(key K, value V) {
    if elem, exists := om.elements[key]; exists {
        elem.Value.(*entry[K, V]).value = value
        return
    }
    elem := om.list.PushBack(&entry[K, V]{key: key, value: value})
    om.elements[key] = elem
}

func (om *OrderedMapList[K, V]) Get(key K) (V, bool) {
    if elem, exists := om.elements[key]; exists {
        return elem.Value.(*entry[K, V]).value, true
    }
    var zero V
    return zero, false
}

func (om *OrderedMapList[K, V]) Delete(key K) {
    if elem, exists := om.elements[key]; exists {
        om.list.Remove(elem)
        delete(om.elements, key)
    }
}

func (om *OrderedMapList[K, V]) Range(fn func(K, V)) {
    for elem := om.list.Front(); elem != nil; elem = elem.Next() {
        e := elem.Value.(*entry[K, V])
        fn(e.key, e.value)
    }
}

func main() {
    om := NewOrderedMapList[string, int]()
    
    om.Set("a", 1)
    om.Set("b", 2)
    om.Set("c", 3)
    om.Delete("b")
    om.Set("d", 4)
    
    om.Range(func(k string, v int) {
        fmt.Printf("%s: %d\n", k, v)
    })
    // Output: a: 1, c: 3, d: 4
}
```

---

## Common Use Cases

### JSON Output with Consistent Order

```go
package main

import (
    "encoding/json"
    "fmt"
    "sort"
)

type SortedMap map[string]interface{}

func (sm SortedMap) MarshalJSON() ([]byte, error) {
    // Get sorted keys
    keys := make([]string, 0, len(sm))
    for k := range sm {
        keys = append(keys, k)
    }
    sort.Strings(keys)
    
    // Build JSON manually
    result := "{"
    for i, k := range keys {
        if i > 0 {
            result += ","
        }
        keyJSON, _ := json.Marshal(k)
        valJSON, _ := json.Marshal(sm[k])
        result += string(keyJSON) + ":" + string(valJSON)
    }
    result += "}"
    
    return []byte(result), nil
}

func main() {
    data := SortedMap{
        "zebra": 1,
        "apple": 2,
        "mango": 3,
    }
    
    output, _ := json.Marshal(data)
    fmt.Println(string(output))
    // Always: {"apple":2,"mango":3,"zebra":1}
}
```

### Deterministic Configuration Output

```go
package main

import (
    "fmt"
    "sort"
    "strings"
)

func formatConfig(config map[string]string) string {
    keys := make([]string, 0, len(config))
    for k := range config {
        keys = append(keys, k)
    }
    sort.Strings(keys)
    
    var lines []string
    for _, k := range keys {
        lines = append(lines, fmt.Sprintf("%s=%s", k, config[k]))
    }
    
    return strings.Join(lines, "\n")
}

func main() {
    config := map[string]string{
        "PORT":     "8080",
        "HOST":     "localhost",
        "DEBUG":    "true",
        "APP_NAME": "myapp",
    }
    
    fmt.Println(formatConfig(config))
    // Always outputs in same order:
    // APP_NAME=myapp
    // DEBUG=true
    // HOST=localhost
    // PORT=8080
}
```

---

## Performance Comparison

| Method | Lookup | Insert | Delete | Memory |
|--------|--------|--------|--------|--------|
| Standard map | O(1) | O(1) | O(1) | Low |
| Sorted keys each time | O(n log n) | O(1) | O(1) | Low |
| OrderedMap (slice) | O(1) | O(1) | O(n) | Medium |
| OrderedMap (list) | O(1) | O(1) | O(1) | Higher |

Choose based on your needs:

- **Read-heavy, sorted output**: Sort keys when needed
- **Insert-heavy, insertion order**: OrderedMap with slice
- **Delete-heavy, insertion order**: OrderedMap with list

---

## Summary

Map iteration order solutions:

| Need | Solution |
|------|----------|
| Alphabetical order | Sort keys, iterate |
| Numeric order | Sort keys, iterate |
| By value | Sort keys by value comparison |
| Insertion order | OrderedMap (slice or list) |
| Consistent JSON | Custom MarshalJSON |

**Key Points:**

1. Go intentionally randomizes map iteration
2. Extract keys to slice for sorting
3. Use generics for reusable sorted iteration
4. OrderedMap pattern for insertion order
5. `container/list` for O(1) deletion needs

---

*Building Go applications with predictable output? [OneUptime](https://oneuptime.com) provides comprehensive monitoring and observability for your services.*
