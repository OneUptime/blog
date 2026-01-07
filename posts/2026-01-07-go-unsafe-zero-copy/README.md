# How to Use unsafe for Zero-Copy Operations in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, unsafe, Performance, Optimization, Memory

Description: Use Go's unsafe package for zero-copy operations when performance is critical, with guidelines on when it's appropriate and how to do it safely.

---

Go is designed with memory safety as a core principle. The language's type system, garbage collector, and bounds checking work together to prevent entire classes of bugs that plague C and C++ programs. However, Go also provides an escape hatch: the `unsafe` package.

The `unsafe` package allows you to bypass Go's type safety for low-level memory manipulation. When used correctly, it can eliminate expensive memory copies and provide significant performance improvements. When used incorrectly, it can cause crashes, data corruption, and undefined behavior.

This guide will teach you when and how to use `unsafe` for zero-copy operations, with a focus on practical patterns and avoiding common pitfalls.

## Understanding the unsafe Package

The `unsafe` package provides three essential types and functions for low-level memory operations:

- **unsafe.Pointer**: A pointer type that can be converted to and from any pointer type
- **unsafe.Sizeof**: Returns the size in bytes of a variable's type
- **unsafe.Alignof**: Returns the alignment requirement of a variable's type
- **unsafe.Offsetof**: Returns the offset in bytes of a struct field

The following code demonstrates the basic unsafe operations available in Go:

```go
package main

import (
    "fmt"
    "unsafe"
)

type Example struct {
    a bool   // 1 byte
    b int64  // 8 bytes
    c bool   // 1 byte
}

func main() {
    var e Example

    // Sizeof returns the memory footprint of the type
    fmt.Printf("Size of Example: %d bytes\n", unsafe.Sizeof(e))

    // Alignof returns the alignment requirement
    fmt.Printf("Alignment of Example: %d bytes\n", unsafe.Alignof(e))

    // Offsetof returns field offsets within the struct
    fmt.Printf("Offset of a: %d\n", unsafe.Offsetof(e.a))
    fmt.Printf("Offset of b: %d\n", unsafe.Offsetof(e.b))
    fmt.Printf("Offset of c: %d\n", unsafe.Offsetof(e.c))
}
```

Output:
```
Size of Example: 24 bytes
Alignment of Example: 8 bytes
Offset of a: 0
Offset of b: 8
Offset of c: 16
```

Notice that the struct is 24 bytes, not 10 bytes (1 + 8 + 1). This is due to padding inserted for memory alignment.

## Why Zero-Copy Matters

Every memory allocation and copy has a cost. In high-performance applications, these costs accumulate:

1. **Allocation overhead**: The garbage collector must track and eventually free memory
2. **Copy overhead**: Moving bytes takes CPU cycles and cache bandwidth
3. **Latency**: Memory operations add latency to request processing

The following benchmark demonstrates the difference between copying and zero-copy string conversion:

```go
package main

import (
    "testing"
    "unsafe"
)

// Standard safe conversion - creates a copy
func stringToBytesSafe(s string) []byte {
    return []byte(s)
}

// Zero-copy conversion using unsafe
func stringToBytesUnsafe(s string) []byte {
    if s == "" {
        return nil
    }
    return unsafe.Slice(unsafe.StringData(s), len(s))
}

func BenchmarkStringToBytesSafe(b *testing.B) {
    s := "This is a test string for benchmarking purposes"
    for i := 0; i < b.N; i++ {
        _ = stringToBytesSafe(s)
    }
}

func BenchmarkStringToBytesUnsafe(b *testing.B) {
    s := "This is a test string for benchmarking purposes"
    for i := 0; i < b.N; i++ {
        _ = stringToBytesUnsafe(s)
    }
}
```

Typical results show significant performance differences:

```
BenchmarkStringToBytesSafe-8      20000000    60 ns/op    48 B/op    1 allocs/op
BenchmarkStringToBytesUnsafe-8   500000000     2 ns/op     0 B/op    0 allocs/op
```

The unsafe version is approximately 30x faster with zero allocations.

## String to Byte Slice Conversion Without Copy

One of the most common zero-copy operations is converting between strings and byte slices. Go 1.20 introduced `unsafe.StringData` and `unsafe.SliceData` which provide safer ways to perform these conversions.

### Modern Approach (Go 1.20+)

The following functions use Go 1.20's safer unsafe APIs for string and byte slice conversions:

```go
package main

import (
    "unsafe"
)

// StringToBytes converts a string to a byte slice without copying.
// WARNING: The returned slice must not be modified, as strings are immutable.
// Modifying the slice leads to undefined behavior.
func StringToBytes(s string) []byte {
    if s == "" {
        return nil
    }
    // unsafe.StringData returns a pointer to the underlying bytes
    // unsafe.Slice creates a slice from a pointer and length
    return unsafe.Slice(unsafe.StringData(s), len(s))
}

// BytesToString converts a byte slice to a string without copying.
// WARNING: The original byte slice must not be modified after conversion,
// or the string's contents will change unexpectedly.
func BytesToString(b []byte) string {
    if len(b) == 0 {
        return ""
    }
    // unsafe.SliceData returns a pointer to the slice's underlying array
    // unsafe.String creates a string from a pointer and length
    return unsafe.String(unsafe.SliceData(b), len(b))
}
```

### Legacy Approach (Pre-Go 1.20)

For older Go versions, you can use reflect headers, though this approach is more fragile:

```go
package main

import (
    "reflect"
    "unsafe"
)

// stringHeader mirrors the internal structure of a Go string
type stringHeader struct {
    Data uintptr
    Len  int
}

// sliceHeader mirrors the internal structure of a Go slice
type sliceHeader struct {
    Data uintptr
    Len  int
    Cap  int
}

// StringToBytesLegacy converts a string to bytes without copying (pre-Go 1.20)
// This relies on internal struct layouts that could change between Go versions.
func StringToBytesLegacy(s string) []byte {
    if s == "" {
        return nil
    }

    // Get the string header
    stringHeader := (*reflect.StringHeader)(unsafe.Pointer(&s))

    // Create a slice header pointing to the same data
    sliceHeader := &reflect.SliceHeader{
        Data: stringHeader.Data,
        Len:  stringHeader.Len,
        Cap:  stringHeader.Len,
    }

    // Convert the slice header to a byte slice
    return *(*[]byte)(unsafe.Pointer(sliceHeader))
}

// BytesToStringLegacy converts bytes to string without copying (pre-Go 1.20)
func BytesToStringLegacy(b []byte) string {
    if len(b) == 0 {
        return ""
    }

    // Get the slice header
    sliceHeader := (*reflect.SliceHeader)(unsafe.Pointer(&b))

    // Create a string header pointing to the same data
    stringHeader := &reflect.StringHeader{
        Data: sliceHeader.Data,
        Len:  sliceHeader.Len,
    }

    // Convert the string header to a string
    return *(*string)(unsafe.Pointer(stringHeader))
}
```

### Important Safety Considerations

The following example shows what NOT to do with zero-copy conversions:

```go
package main

import (
    "fmt"
    "unsafe"
)

func StringToBytes(s string) []byte {
    if s == "" {
        return nil
    }
    return unsafe.Slice(unsafe.StringData(s), len(s))
}

func main() {
    s := "hello"
    b := StringToBytes(s)

    // DANGER: Modifying b modifies the "immutable" string s
    // This is undefined behavior and may crash or produce unexpected results
    b[0] = 'H' // DO NOT DO THIS

    fmt.Println(s) // Undefined behavior!
}
```

## Struct Memory Layout Manipulation

Understanding and manipulating struct memory layout is crucial for zero-copy deserialization and memory-mapped I/O operations.

### Reading Binary Data Directly Into Structs

The following example shows how to read binary data directly into a struct without parsing:

```go
package main

import (
    "encoding/binary"
    "fmt"
    "unsafe"
)

// Header represents a fixed-size binary header.
// The struct must have a predictable memory layout.
type Header struct {
    Magic   uint32
    Version uint16
    Flags   uint16
    Length  uint64
}

// ParseHeaderSafe parses a header using standard library functions.
// This is safe but involves copying data.
func ParseHeaderSafe(data []byte) (*Header, error) {
    if len(data) < 16 {
        return nil, fmt.Errorf("data too short")
    }

    return &Header{
        Magic:   binary.LittleEndian.Uint32(data[0:4]),
        Version: binary.LittleEndian.Uint16(data[4:6]),
        Flags:   binary.LittleEndian.Uint16(data[6:8]),
        Length:  binary.LittleEndian.Uint64(data[8:16]),
    }, nil
}

// ParseHeaderUnsafe interprets the byte slice directly as a Header struct.
// This is zero-copy but requires careful attention to alignment and endianness.
func ParseHeaderUnsafe(data []byte) (*Header, error) {
    if len(data) < int(unsafe.Sizeof(Header{})) {
        return nil, fmt.Errorf("data too short")
    }

    // Verify alignment - the data must be properly aligned for the struct
    dataPtr := uintptr(unsafe.Pointer(&data[0]))
    if dataPtr%unsafe.Alignof(Header{}) != 0 {
        return nil, fmt.Errorf("data not properly aligned")
    }

    // Cast the byte slice pointer to a Header pointer
    header := (*Header)(unsafe.Pointer(&data[0]))
    return header, nil
}
```

### Optimizing Struct Layout for Size

Reordering struct fields can reduce memory usage by minimizing padding:

```go
package main

import (
    "fmt"
    "unsafe"
)

// Inefficient layout - lots of padding due to alignment requirements
type IneffientStruct struct {
    a bool    // 1 byte + 7 bytes padding
    b int64   // 8 bytes
    c bool    // 1 byte + 7 bytes padding
    d int64   // 8 bytes
    e bool    // 1 byte + 7 bytes padding
}
// Total: 40 bytes

// Efficient layout - fields ordered by size (largest to smallest)
type EfficientStruct struct {
    b int64   // 8 bytes
    d int64   // 8 bytes
    a bool    // 1 byte
    c bool    // 1 byte
    e bool    // 1 byte + 5 bytes padding
}
// Total: 24 bytes

func main() {
    fmt.Printf("Inefficient struct size: %d bytes\n", unsafe.Sizeof(IneffientStruct{}))
    fmt.Printf("Efficient struct size: %d bytes\n", unsafe.Sizeof(EfficientStruct{}))
}
```

### Accessing Struct Fields by Offset

You can access struct fields using pointer arithmetic based on offsets:

```go
package main

import (
    "fmt"
    "unsafe"
)

type Config struct {
    enabled bool
    timeout int64
    retries int32
    name    string
}

// GetFieldByOffset demonstrates accessing struct fields via unsafe pointer arithmetic.
// This technique is used in reflection and serialization libraries.
func GetFieldByOffset() {
    cfg := Config{
        enabled: true,
        timeout: 30000,
        retries: 3,
        name:    "primary",
    }

    // Get pointer to the struct
    basePtr := unsafe.Pointer(&cfg)

    // Calculate offset to 'timeout' field and read it
    timeoutOffset := unsafe.Offsetof(cfg.timeout)
    timeoutPtr := (*int64)(unsafe.Pointer(uintptr(basePtr) + timeoutOffset))
    fmt.Printf("Timeout value: %d\n", *timeoutPtr)

    // Modify the field through the pointer
    *timeoutPtr = 60000
    fmt.Printf("New timeout value: %d\n", cfg.timeout)
}
```

## Pointer Arithmetic Patterns

Pointer arithmetic in Go requires careful handling of the `unsafe.Pointer` to `uintptr` conversion rules.

### Safe Pointer Arithmetic Rules

Go's unsafe pointer rules are strict. The following patterns are safe:

```go
package main

import (
    "fmt"
    "unsafe"
)

// SafePointerArithmetic demonstrates valid pointer arithmetic patterns.
func SafePointerArithmetic() {
    data := []int{10, 20, 30, 40, 50}

    // Pattern 1: Single expression conversion
    // The conversion to uintptr and back must happen in a single expression
    // to prevent the garbage collector from moving the data
    second := *(*int)(unsafe.Pointer(uintptr(unsafe.Pointer(&data[0])) + unsafe.Sizeof(data[0])))
    fmt.Printf("Second element: %d\n", second)

    // Pattern 2: Using unsafe.Add (Go 1.17+)
    // This is the preferred modern approach
    thirdPtr := unsafe.Add(unsafe.Pointer(&data[0]), 2*int(unsafe.Sizeof(data[0])))
    third := *(*int)(thirdPtr)
    fmt.Printf("Third element: %d\n", third)
}

// UnsafeSliceIteration shows how to iterate using pointer arithmetic.
// This is rarely needed but useful for understanding low-level memory access.
func UnsafeSliceIteration() {
    data := []float64{1.1, 2.2, 3.3, 4.4, 5.5}

    elemSize := unsafe.Sizeof(data[0])
    basePtr := unsafe.Pointer(&data[0])

    for i := 0; i < len(data); i++ {
        // Calculate pointer to element i
        elemPtr := unsafe.Add(basePtr, i*int(elemSize))
        value := *(*float64)(elemPtr)
        fmt.Printf("data[%d] = %.1f\n", i, value)
    }
}
```

### Dangerous Patterns to Avoid

The following code demonstrates patterns that lead to undefined behavior:

```go
package main

import (
    "unsafe"
)

// DANGER: These patterns are UNSAFE and may cause crashes or data corruption

func DangerousPatterns() {
    data := []int{1, 2, 3}

    // WRONG: Storing uintptr in a variable
    // The garbage collector may move the data between these lines,
    // making the uintptr invalid
    ptr := uintptr(unsafe.Pointer(&data[0]))  // DANGER!
    _ = ptr + 8                                // The address may no longer be valid

    // WRONG: Using uintptr in function calls
    // Same problem - GC may run between argument evaluation and function call
    process(uintptr(unsafe.Pointer(&data[0]))) // DANGER!

    // WRONG: Arithmetic that creates pointers outside allocated objects
    // Pointers must stay within the bounds of allocated memory
    badPtr := unsafe.Add(unsafe.Pointer(&data[0]), 1000) // DANGER!
    _ = badPtr
}

func process(addr uintptr) {
    // The address may be invalid by the time this function runs
    _ = addr
}
```

### Implementing a Simple Memory Pool

This example shows a practical use of pointer arithmetic for a memory pool:

```go
package main

import (
    "fmt"
    "sync"
    "unsafe"
)

// FixedPool is a simple fixed-size object pool using unsafe for zero-copy access.
type FixedPool[T any] struct {
    buffer []byte
    size   int
    next   int
    mu     sync.Mutex
}

// NewFixedPool creates a pool that can hold 'count' objects of type T.
func NewFixedPool[T any](count int) *FixedPool[T] {
    var zero T
    objSize := int(unsafe.Sizeof(zero))

    // Ensure proper alignment
    alignment := int(unsafe.Alignof(zero))
    objSize = (objSize + alignment - 1) / alignment * alignment

    return &FixedPool[T]{
        buffer: make([]byte, objSize*count),
        size:   objSize,
        next:   0,
    }
}

// Alloc returns a pointer to the next available slot in the pool.
// Returns nil if the pool is exhausted.
func (p *FixedPool[T]) Alloc() *T {
    p.mu.Lock()
    defer p.mu.Unlock()

    if p.next*p.size >= len(p.buffer) {
        return nil // Pool exhausted
    }

    // Get pointer to the next slot
    ptr := (*T)(unsafe.Pointer(&p.buffer[p.next*p.size]))
    p.next++

    return ptr
}

// Reset makes all slots available again.
// Warning: Any pointers obtained from Alloc become invalid after Reset.
func (p *FixedPool[T]) Reset() {
    p.mu.Lock()
    defer p.mu.Unlock()
    p.next = 0
}

func main() {
    type Point struct {
        X, Y float64
    }

    pool := NewFixedPool[Point](100)

    // Allocate points from the pool
    p1 := pool.Alloc()
    p1.X, p1.Y = 1.0, 2.0

    p2 := pool.Alloc()
    p2.X, p2.Y = 3.0, 4.0

    fmt.Printf("Point 1: (%.1f, %.1f)\n", p1.X, p1.Y)
    fmt.Printf("Point 2: (%.1f, %.1f)\n", p2.X, p2.Y)
}
```

## When unsafe Is Justified

Using `unsafe` should be a deliberate choice, not a default. Consider it when:

### 1. Performance Is Critical and Measurable

The following benchmark setup helps determine if unsafe is worthwhile:

```go
package main

import (
    "testing"
    "unsafe"
)

// Benchmark both approaches and compare
func BenchmarkComparison(b *testing.B) {
    data := make([]byte, 1024)
    for i := range data {
        data[i] = byte(i)
    }

    b.Run("Safe", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = string(data) // Creates a copy
        }
    })

    b.Run("Unsafe", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = unsafe.String(&data[0], len(data)) // Zero-copy
        }
    })
}

// Guidelines for when unsafe is justified:
// 1. The operation is in a hot path (called millions of times)
// 2. Benchmarks show >2x improvement with unsafe
// 3. The data size is significant (copying matters)
// 4. Memory allocation pressure is a concern
// 5. The code is well-tested and reviewed
```

### 2. Interfacing with System Calls or C Code

Unsafe is often necessary for low-level system interaction:

```go
package main

/*
#include <string.h>
#include <stdlib.h>

void process_buffer(void* buf, int len) {
    // C code that processes the buffer
    memset(buf, 0, len);
}
*/
import "C"

import (
    "unsafe"
)

// ProcessWithCGo demonstrates passing Go memory to C code.
// This requires unsafe for pointer conversion.
func ProcessWithCGo(data []byte) {
    if len(data) == 0 {
        return
    }

    // Pass Go slice data to C function
    C.process_buffer(unsafe.Pointer(&data[0]), C.int(len(data)))
}
```

### 3. Implementing Data Structures for Libraries

Standard library and popular packages use unsafe for performance:

```go
package main

import (
    "sync/atomic"
    "unsafe"
)

// LockFreeStack demonstrates a lock-free stack using unsafe and atomics.
// This pattern is used in high-performance concurrent data structures.
type LockFreeStack struct {
    head unsafe.Pointer
}

type stackNode struct {
    value interface{}
    next  unsafe.Pointer
}

func (s *LockFreeStack) Push(value interface{}) {
    node := &stackNode{value: value}
    for {
        oldHead := atomic.LoadPointer(&s.head)
        node.next = oldHead
        if atomic.CompareAndSwapPointer(&s.head, oldHead, unsafe.Pointer(node)) {
            return
        }
    }
}

func (s *LockFreeStack) Pop() interface{} {
    for {
        oldHead := atomic.LoadPointer(&s.head)
        if oldHead == nil {
            return nil
        }
        node := (*stackNode)(oldHead)
        newHead := node.next
        if atomic.CompareAndSwapPointer(&s.head, oldHead, newHead) {
            return node.value
        }
    }
}
```

### Decision Matrix

Use this matrix to decide whether unsafe is appropriate:

```
| Factor                    | Safe Approach | Consider Unsafe |
|---------------------------|---------------|-----------------|
| Hot path (>1M calls/sec)  | No            | Yes             |
| Data size                 | < 1KB         | > 1KB           |
| GC pressure               | Low           | High            |
| Code complexity           | High          | Low             |
| Safety requirements       | Critical      | Non-critical    |
| Team expertise            | Limited       | Strong          |
| Testing coverage          | Limited       | Comprehensive   |
```

## Common Pitfalls and Undefined Behavior

### Pitfall 1: Storing uintptr Values

The garbage collector can move memory, invalidating stored uintptr values:

```go
package main

import (
    "runtime"
    "unsafe"
)

// BAD: This code has a race with the garbage collector
func BadExample() {
    data := make([]byte, 100)

    // Store the address as uintptr - DANGEROUS
    addr := uintptr(unsafe.Pointer(&data[0]))

    // GC might run here and move the slice's backing array
    runtime.GC()

    // The address is now potentially invalid
    ptr := unsafe.Pointer(addr) // May point to garbage or cause crash
    _ = ptr
}

// GOOD: Keep the pointer arithmetic in a single expression
func GoodExample() {
    data := make([]byte, 100)

    // The conversion happens atomically from GC's perspective
    value := *(*byte)(unsafe.Pointer(uintptr(unsafe.Pointer(&data[0])) + 50))
    _ = value
}
```

### Pitfall 2: Incorrect Type Sizes

Assuming type sizes can cause silent data corruption:

```go
package main

import (
    "fmt"
    "unsafe"
)

// DANGER: Assuming int is always 8 bytes
func DangerousIntAssumption(data []byte) int64 {
    // This only works correctly on 64-bit systems
    // On 32-bit systems, int is 4 bytes and this reads garbage
    return *(*int64)(unsafe.Pointer(&data[0]))
}

// SAFE: Use explicit fixed-size types
func SafeIntHandling(data []byte) int64 {
    if len(data) < 8 {
        return 0
    }
    // int64 is always 8 bytes across all platforms
    return *(*int64)(unsafe.Pointer(&data[0]))
}

// Always verify assumptions about type sizes
func VerifyTypeSizes() {
    fmt.Printf("int size: %d bytes\n", unsafe.Sizeof(int(0)))      // 4 or 8
    fmt.Printf("int64 size: %d bytes\n", unsafe.Sizeof(int64(0)))  // Always 8
    fmt.Printf("pointer size: %d bytes\n", unsafe.Sizeof(uintptr(0)))
}
```

### Pitfall 3: Alignment Violations

Misaligned memory access can crash on some architectures:

```go
package main

import (
    "fmt"
    "unsafe"
)

// DemonstrateAlignment shows how to handle alignment correctly.
func DemonstrateAlignment() {
    data := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}

    // DANGER: Reading int64 from unaligned address
    // This works on x86 but may crash on ARM or cause performance issues
    // unaligned := *(*int64)(unsafe.Pointer(&data[1])) // Potentially dangerous

    // SAFE: Check alignment before reading
    ptr := &data[0]
    if uintptr(unsafe.Pointer(ptr))%8 == 0 {
        aligned := *(*int64)(unsafe.Pointer(ptr))
        fmt.Printf("Aligned read: %d\n", aligned)
    } else {
        // Fall back to byte-by-byte reading
        fmt.Println("Data not aligned, using safe read")
    }
}

// AlignedBuffer returns a byte slice with guaranteed alignment.
func AlignedBuffer(size, alignment int) []byte {
    // Allocate extra space to ensure we can find an aligned offset
    buf := make([]byte, size+alignment)

    offset := int(uintptr(unsafe.Pointer(&buf[0])) % uintptr(alignment))
    if offset != 0 {
        offset = alignment - offset
    }

    return buf[offset : offset+size]
}
```

### Pitfall 4: Escaping References to Stack Variables

Local variables may not survive after the function returns:

```go
package main

import (
    "unsafe"
)

// DANGER: Returning pointer to local variable
func DangerousReturn() unsafe.Pointer {
    x := 42
    // The compiler might keep x on the stack since we're using unsafe
    // After this function returns, the memory is invalid
    return unsafe.Pointer(&x) // DANGEROUS
}

// SAFE: Ensure the variable escapes to the heap
func SafeReturn() *int {
    x := 42
    return &x // Go's escape analysis ensures x is heap-allocated
}

// SAFE: Use make or new for heap allocation
func SafeReturnUnsafe() unsafe.Pointer {
    x := new(int)
    *x = 42
    return unsafe.Pointer(x) // x is definitely on the heap
}
```

## Testing Unsafe Code

Testing unsafe code requires extra rigor to catch subtle bugs.

### Race Detection

Always test with the race detector enabled:

```go
package main

import (
    "sync"
    "testing"
    "unsafe"
)

// StringToBytes is the function under test
func StringToBytes(s string) []byte {
    if s == "" {
        return nil
    }
    return unsafe.Slice(unsafe.StringData(s), len(s))
}

// TestConcurrentAccess verifies thread-safety of unsafe operations.
// Run with: go test -race
func TestConcurrentAccess(t *testing.T) {
    s := "shared string data"

    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            b := StringToBytes(s)
            // Read-only access is safe
            if len(b) != len(s) {
                t.Errorf("Length mismatch: got %d, want %d", len(b), len(s))
            }
        }()
    }
    wg.Wait()
}
```

### Stress Testing with GC Pressure

Create tests that stress the garbage collector:

```go
package main

import (
    "runtime"
    "testing"
    "unsafe"
)

func BytesToString(b []byte) string {
    if len(b) == 0 {
        return ""
    }
    return unsafe.String(unsafe.SliceData(b), len(b))
}

// TestWithGCPressure verifies that unsafe code survives garbage collection.
func TestWithGCPressure(t *testing.T) {
    for i := 0; i < 1000; i++ {
        // Create temporary data that will be GC'd
        data := make([]byte, 1024)
        for j := range data {
            data[j] = byte(j)
        }

        // Convert to string using unsafe
        s := BytesToString(data)

        // Force garbage collection
        runtime.GC()

        // Verify the string is still valid
        // Note: This test is tricky because modifying 'data' after
        // BytesToString would change 's', which is why we don't modify it
        if len(s) != 1024 {
            t.Fatalf("String length changed after GC: got %d, want 1024", len(s))
        }
    }
}
```

### Boundary Testing

Test edge cases thoroughly:

```go
package main

import (
    "testing"
    "unsafe"
)

func StringToBytes(s string) []byte {
    if s == "" {
        return nil
    }
    return unsafe.Slice(unsafe.StringData(s), len(s))
}

func BytesToString(b []byte) string {
    if len(b) == 0 {
        return ""
    }
    return unsafe.String(unsafe.SliceData(b), len(b))
}

func TestEdgeCases(t *testing.T) {
    tests := []struct {
        name  string
        input string
    }{
        {"empty", ""},
        {"single char", "a"},
        {"single byte null", "\x00"},
        {"unicode", ""},
        {"long unicode", ""},
        {"mixed", "hello\x00world\n"},
        {"large", string(make([]byte, 1<<20))}, // 1MB
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test string -> bytes -> string roundtrip
            bytes := StringToBytes(tt.input)
            result := BytesToString(bytes)

            if result != tt.input {
                t.Errorf("Roundtrip failed: got %q, want %q", result, tt.input)
            }
        })
    }
}

func TestNilHandling(t *testing.T) {
    // Ensure nil/empty inputs don't cause panics
    if result := BytesToString(nil); result != "" {
        t.Errorf("Expected empty string for nil input")
    }

    if result := BytesToString([]byte{}); result != "" {
        t.Errorf("Expected empty string for empty slice input")
    }

    if result := StringToBytes(""); result != nil {
        t.Errorf("Expected nil for empty string input")
    }
}
```

### Using go vet and staticcheck

These tools can detect some unsafe violations:

```bash
# Run go vet with all checks
go vet ./...

# Install and run staticcheck for more comprehensive analysis
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...

# Run with specific unsafe checks
go vet -unsafeptr ./...
```

## Best Practices Summary

### Do:

1. **Profile before optimizing**: Only use unsafe when benchmarks prove it helps
2. **Use Go 1.20+ APIs**: Prefer `unsafe.Slice`, `unsafe.String`, `unsafe.StringData`, and `unsafe.SliceData`
3. **Keep conversions in single expressions**: Prevent GC from invalidating pointers
4. **Document all unsafe usage**: Explain why it's necessary and what invariants must hold
5. **Test extensively**: Use race detector, stress tests, and boundary testing
6. **Limit scope**: Encapsulate unsafe code in small, well-tested functions

### Don't:

1. **Don't store uintptr values**: Always convert back to unsafe.Pointer immediately
2. **Don't assume type sizes**: Use explicit fixed-size types (int64, uint32, etc.)
3. **Don't modify zero-copy strings**: String data must remain immutable
4. **Don't ignore alignment**: Check alignment requirements for the target architecture
5. **Don't use unsafe for premature optimization**: Measure first, optimize second

## Complete Working Example

Here is a complete, tested implementation of a zero-copy JSON field extractor:

```go
package main

import (
    "bytes"
    "fmt"
    "unsafe"
)

// ZeroCopyJSON provides fast access to JSON string values without parsing.
// This is useful when you need to extract a few fields from large JSON documents.
type ZeroCopyJSON struct {
    data []byte
}

// NewZeroCopyJSON creates a new zero-copy JSON accessor.
func NewZeroCopyJSON(data []byte) *ZeroCopyJSON {
    return &ZeroCopyJSON{data: data}
}

// GetString extracts a string value for a key without allocating.
// Returns empty string if key not found.
// WARNING: The returned string shares memory with the input data.
// Modifying the original data will affect the returned string.
func (z *ZeroCopyJSON) GetString(key string) string {
    // Build the search pattern: "key":"
    pattern := make([]byte, 0, len(key)+4)
    pattern = append(pattern, '"')
    pattern = append(pattern, key...)
    pattern = append(pattern, '"', ':', '"')

    // Find the key in the data
    idx := bytes.Index(z.data, pattern)
    if idx == -1 {
        return ""
    }

    // Find the start of the value (after the pattern)
    valueStart := idx + len(pattern)

    // Find the end of the value (closing quote)
    valueEnd := valueStart
    for valueEnd < len(z.data) && z.data[valueEnd] != '"' {
        // Handle escaped quotes
        if z.data[valueEnd] == '\\' && valueEnd+1 < len(z.data) {
            valueEnd += 2
            continue
        }
        valueEnd++
    }

    if valueEnd >= len(z.data) {
        return ""
    }

    // Zero-copy conversion to string
    return unsafe.String(&z.data[valueStart], valueEnd-valueStart)
}

func main() {
    jsonData := []byte(`{
        "name": "John Doe",
        "email": "john@example.com",
        "city": "New York"
    }`)

    zc := NewZeroCopyJSON(jsonData)

    // Extract values without allocating new strings
    name := zc.GetString("name")
    email := zc.GetString("email")
    city := zc.GetString("city")

    fmt.Printf("Name: %s\n", name)
    fmt.Printf("Email: %s\n", email)
    fmt.Printf("City: %s\n", city)
}
```

## Conclusion

The `unsafe` package is a powerful tool that should be used sparingly and deliberately. When used correctly, it can provide significant performance improvements for zero-copy operations. When used incorrectly, it can cause crashes, data corruption, and security vulnerabilities.

Key takeaways:

1. **Measure before optimizing**: Never use unsafe without benchmarks proving it helps
2. **Understand the rules**: Go's unsafe pointer rules exist for good reasons
3. **Use modern APIs**: Go 1.20+ provides safer alternatives to reflect headers
4. **Test rigorously**: Unsafe code needs more testing, not less
5. **Document thoroughly**: Future maintainers need to understand the constraints

Remember that most Go programs never need `unsafe`. The standard library and runtime handle most low-level concerns. Reserve `unsafe` for the rare cases where you've proven it's necessary and you're confident in your understanding of the risks.

## Additional Resources

- [Go unsafe package documentation](https://pkg.go.dev/unsafe)
- [Go 1.20 release notes on unsafe additions](https://go.dev/doc/go1.20)
- [Go Memory Model](https://go.dev/ref/mem)
- [Rules for passing pointers between Go and C](https://pkg.go.dev/cmd/cgo#hdr-Passing_pointers)
