# How to Optimize JSON Serialization in Go with sonic or easyjson

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, JSON, Performance, Optimization, API

Description: Optimize JSON serialization in Go using high-performance libraries like sonic and easyjson for significant throughput improvements.

---

JSON serialization is often a performance bottleneck in Go applications, especially for high-throughput APIs and data-intensive services. While the standard library's `encoding/json` package is reliable and well-tested, it relies heavily on reflection, which introduces significant overhead. This comprehensive guide explores high-performance alternatives like **sonic** and **easyjson** that can dramatically improve your application's JSON processing speed.

## Table of Contents

1. [Understanding Standard Library Limitations](#understanding-standard-library-limitations)
2. [Introduction to sonic](#introduction-to-sonic)
3. [Introduction to easyjson](#introduction-to-easyjson)
4. [Benchmark Comparisons](#benchmark-comparisons)
5. [Memory Allocation Analysis](#memory-allocation-analysis)
6. [Streaming JSON for Large Payloads](#streaming-json-for-large-payloads)
7. [Integration with Web Frameworks](#integration-with-web-frameworks)
8. [When to Use Each Option](#when-to-use-each-option)
9. [Best Practices and Recommendations](#best-practices-and-recommendations)

## Understanding Standard Library Limitations

The Go standard library's `encoding/json` package is widely used but has several performance limitations that become apparent in high-throughput scenarios.

### How encoding/json Works

The standard library uses reflection to inspect struct fields at runtime, which introduces overhead on every marshal/unmarshal operation.

```go
package main

import (
	"encoding/json"
	"fmt"
)

// User represents a typical API response structure
// The standard library inspects these struct tags via reflection
type User struct {
	ID        int64    `json:"id"`
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	CreatedAt string   `json:"created_at"`
	Tags      []string `json:"tags"`
	Active    bool     `json:"active"`
}

func main() {
	user := User{
		ID:        12345,
		Username:  "johndoe",
		Email:     "john@example.com",
		CreatedAt: "2026-01-07T10:30:00Z",
		Tags:      []string{"admin", "verified"},
		Active:    true,
	}

	// Standard library marshaling - uses reflection internally
	data, err := json.Marshal(user)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(data))
}
```

### Key Performance Issues

The standard library has several inherent limitations that impact performance in production systems.

```go
package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"time"
)

// LargeResponse simulates a complex API response
// Each field requires reflection inspection during serialization
type LargeResponse struct {
	Users    []User    `json:"users"`
	Metadata Metadata  `json:"metadata"`
	Errors   []Error   `json:"errors,omitempty"`
}

type Metadata struct {
	Total      int    `json:"total"`
	Page       int    `json:"page"`
	PerPage    int    `json:"per_page"`
	RequestID  string `json:"request_id"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func demonstrateLimitations() {
	// Issue 1: Reflection overhead
	// The library must inspect type information at runtime
	t := reflect.TypeOf(User{})
	fmt.Printf("Reflection cost: inspecting %d fields\n", t.NumField())

	// Issue 2: Memory allocations
	// Each marshal/unmarshal creates new allocations
	user := User{ID: 1, Username: "test", Email: "test@test.com"}

	start := time.Now()
	for i := 0; i < 100000; i++ {
		json.Marshal(user)
	}
	fmt.Printf("100k marshals took: %v\n", time.Since(start))

	// Issue 3: No streaming support for complex structures
	// Large payloads must be fully loaded into memory
}

func main() {
	demonstrateLimitations()
}
```

### Profiling Standard Library Performance

Before optimizing, it's crucial to measure baseline performance. This benchmark helps identify where JSON processing becomes a bottleneck.

```go
package main

import (
	"encoding/json"
	"testing"
)

// BenchmarkUser is used for all JSON benchmarks
type BenchmarkUser struct {
	ID        int64    `json:"id"`
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	CreatedAt string   `json:"created_at"`
	Tags      []string `json:"tags"`
	Active    bool     `json:"active"`
}

var testUser = BenchmarkUser{
	ID:        12345,
	Username:  "johndoe",
	Email:     "john@example.com",
	CreatedAt: "2026-01-07T10:30:00Z",
	Tags:      []string{"admin", "verified", "premium"},
	Active:    true,
}

// BenchmarkStdLibMarshal measures standard library performance
func BenchmarkStdLibMarshal(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(testUser)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkStdLibUnmarshal measures deserialization performance
func BenchmarkStdLibUnmarshal(b *testing.B) {
	data, _ := json.Marshal(testUser)
	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		var u BenchmarkUser
		if err := json.Unmarshal(data, &u); err != nil {
			b.Fatal(err)
		}
	}
}
```

## Introduction to sonic

**sonic** is a blazingly fast JSON serializing and deserializing library developed by ByteDance. It uses JIT (Just-In-Time) compilation and SIMD (Single Instruction, Multiple Data) instructions to achieve exceptional performance.

### Installing sonic

sonic requires Go 1.16 or higher and works best on amd64 architecture with AVX/AVX2 support.

```bash
# Install sonic library
go get github.com/bytedance/sonic

# Verify installation
go mod tidy
```

### Basic sonic Usage

sonic provides a drop-in replacement API that mirrors the standard library, making migration straightforward.

```go
package main

import (
	"fmt"

	"github.com/bytedance/sonic"
)

// Product demonstrates sonic's compatibility with standard struct tags
type Product struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	InStock     bool    `json:"in_stock"`
	Categories  []string `json:"categories"`
}

func main() {
	product := Product{
		ID:          1001,
		Name:        "Wireless Keyboard",
		Description: "Ergonomic wireless keyboard with backlight",
		Price:       79.99,
		InStock:     true,
		Categories:  []string{"electronics", "peripherals", "office"},
	}

	// sonic.Marshal is a drop-in replacement for json.Marshal
	data, err := sonic.Marshal(product)
	if err != nil {
		panic(err)
	}
	fmt.Println("Marshaled:", string(data))

	// sonic.Unmarshal works identically to json.Unmarshal
	var decoded Product
	if err := sonic.Unmarshal(data, &decoded); err != nil {
		panic(err)
	}
	fmt.Printf("Unmarshaled: %+v\n", decoded)
}
```

### sonic Configuration Options

sonic offers several configuration options to tune performance for specific use cases.

```go
package main

import (
	"fmt"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/encoder"
)

// Config demonstrates different sonic encoding options
type Config struct {
	Debug       bool   `json:"debug"`
	LogLevel    string `json:"log_level"`
	MaxRetries  int    `json:"max_retries"`
	Timeout     int    `json:"timeout"`
	Description string `json:"description,omitempty"`
}

func main() {
	cfg := Config{
		Debug:      true,
		LogLevel:   "info",
		MaxRetries: 3,
		Timeout:    30,
	}

	// Default encoding - fastest option
	data, _ := sonic.Marshal(cfg)
	fmt.Println("Default:", string(data))

	// Encode with indentation for human-readable output
	// Slightly slower but useful for debugging
	indented, _ := sonic.MarshalIndent(cfg, "", "  ")
	fmt.Println("Indented:\n", string(indented))

	// Using encoder options for fine-grained control
	// SortMapKeys ensures consistent output order
	enc := encoder.NewEncoder(nil)
	enc.SetSortMapKeys(true)
	enc.SetEscapeHTML(false)  // Disable HTML escaping for performance

	result, _ := enc.Encode(cfg)
	fmt.Println("Custom encoder:", string(result))
}
```

### sonic with Lazy Parsing

sonic supports lazy parsing through its AST API, which is useful when you only need to access specific fields from large JSON documents.

```go
package main

import (
	"fmt"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/ast"
)

func main() {
	// Large JSON payload - only need specific fields
	jsonData := `{
		"user": {
			"id": 12345,
			"profile": {
				"name": "John Doe",
				"email": "john@example.com",
				"settings": {
					"theme": "dark",
					"notifications": true
				}
			}
		},
		"metadata": {
			"version": "2.1.0",
			"timestamp": "2026-01-07T10:30:00Z"
		}
	}`

	// Parse only what you need using the AST API
	// This avoids unmarshaling the entire document
	root, err := sonic.GetFromString(jsonData, "user", "profile", "name")
	if err != nil {
		panic(err)
	}

	name, _ := root.String()
	fmt.Println("Name:", name)

	// Access nested values efficiently
	node, _ := sonic.Get([]byte(jsonData), "user", "profile", "settings", "theme")
	theme, _ := node.String()
	fmt.Println("Theme:", theme)

	// Use ast.Node for complex operations
	rootNode, _ := ast.NewParser(jsonData).Parse()
	userNode := rootNode.Get("user")
	id := userNode.Get("id")
	idValue, _ := id.Int64()
	fmt.Println("User ID:", idValue)
}
```

## Introduction to easyjson

**easyjson** takes a different approach by generating marshaling code at compile time, eliminating reflection entirely. This makes it extremely fast and produces zero allocations for many operations.

### Installing easyjson

easyjson requires installing both the library and the code generator.

```bash
# Install the easyjson library
go get github.com/mailru/easyjson

# Install the code generator
go install github.com/mailru/easyjson/easyjson@latest

# Verify the generator is in your PATH
easyjson --help
```

### Preparing Structs for easyjson

easyjson uses special comments to identify which structs should have generated code.

```go
package models

// Add the easyjson:json comment above structs you want to optimize

//easyjson:json
type Order struct {
	ID         string      `json:"id"`
	CustomerID string      `json:"customer_id"`
	Items      []OrderItem `json:"items"`
	Total      float64     `json:"total"`
	Status     string      `json:"status"`
	CreatedAt  string      `json:"created_at"`
}

//easyjson:json
type OrderItem struct {
	ProductID string  `json:"product_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

//easyjson:json
type OrderList struct {
	Orders     []Order `json:"orders"`
	TotalCount int     `json:"total_count"`
	Page       int     `json:"page"`
}
```

### Generating easyjson Code

After annotating your structs, run the generator to create optimized marshaling code.

```bash
# Generate code for a specific file
easyjson -all models/order.go

# This creates models/order_easyjson.go with optimized implementations

# Generate with specific options
easyjson -no_std_marshalers -all models/order.go

# For entire packages
easyjson -all ./models/...
```

### Using Generated easyjson Code

The generated code provides MarshalJSON and UnmarshalJSON methods that are automatically used.

```go
package main

import (
	"encoding/json"
	"fmt"

	"yourproject/models"
)

func main() {
	order := models.Order{
		ID:         "ORD-12345",
		CustomerID: "CUST-789",
		Items: []models.OrderItem{
			{ProductID: "PROD-001", Name: "Widget", Quantity: 2, Price: 19.99},
			{ProductID: "PROD-002", Name: "Gadget", Quantity: 1, Price: 49.99},
		},
		Total:     89.97,
		Status:    "pending",
		CreatedAt: "2026-01-07T10:30:00Z",
	}

	// The generated MarshalJSON is used automatically
	// This bypasses reflection entirely
	data, err := json.Marshal(order)
	if err != nil {
		panic(err)
	}
	fmt.Println("Marshaled:", string(data))

	// Direct method call for explicit usage
	// MarshalJSON returns the JSON representation
	directData, _ := order.MarshalJSON()
	fmt.Println("Direct:", string(directData))

	// Unmarshaling also uses generated code
	var decoded models.Order
	if err := json.Unmarshal(data, &decoded); err != nil {
		panic(err)
	}
	fmt.Printf("Decoded: %+v\n", decoded)
}
```

### easyjson with Custom Types

easyjson handles custom types and provides hooks for specialized serialization.

```go
package models

import (
	"time"

	"github.com/mailru/easyjson/jlexer"
	"github.com/mailru/easyjson/jwriter"
)

//easyjson:json
type Event struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Payload   Payload   `json:"payload"`
}

// Payload uses custom marshaling for flexibility
type Payload struct {
	Data map[string]interface{} `json:"data"`
}

// Custom MarshalEasyJSON for the Payload type
// This gives you control over complex serialization
func (p Payload) MarshalEasyJSON(w *jwriter.Writer) {
	w.RawByte('{')
	first := true
	for k, v := range p.Data {
		if !first {
			w.RawByte(',')
		}
		first = false
		w.String(k)
		w.RawByte(':')
		// Handle different value types
		switch val := v.(type) {
		case string:
			w.String(val)
		case int:
			w.Int(val)
		case float64:
			w.Float64(val)
		case bool:
			w.Bool(val)
		default:
			w.Raw([]byte("null"), nil)
		}
	}
	w.RawByte('}')
}

// Custom UnmarshalEasyJSON for the Payload type
func (p *Payload) UnmarshalEasyJSON(in *jlexer.Lexer) {
	p.Data = make(map[string]interface{})
	in.Delim('{')
	for !in.IsDelim('}') {
		key := in.String()
		in.WantColon()
		// Simplified: read as interface{}
		p.Data[key] = in.Interface()
		in.WantComma()
	}
	in.Delim('}')
}
```

## Benchmark Comparisons

Let's create comprehensive benchmarks to compare all three approaches under realistic conditions.

### Benchmark Setup

This benchmark suite tests marshaling and unmarshaling performance across different payload sizes.

```go
package benchmark

import (
	"encoding/json"
	"testing"

	"github.com/bytedance/sonic"
)

// SmallPayload represents a minimal JSON structure
type SmallPayload struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// MediumPayload represents a typical API response
type MediumPayload struct {
	ID          int64    `json:"id"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Active      bool     `json:"active"`
	Roles       []string `json:"roles"`
	Preferences Prefs    `json:"preferences"`
}

type Prefs struct {
	Theme         string `json:"theme"`
	Notifications bool   `json:"notifications"`
	Language      string `json:"language"`
}

// LargePayload simulates a complex response with nested data
type LargePayload struct {
	Users      []MediumPayload `json:"users"`
	Pagination Pagination      `json:"pagination"`
	Metadata   Meta            `json:"metadata"`
}

type Pagination struct {
	Total   int `json:"total"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Pages   int `json:"pages"`
}

type Meta struct {
	RequestID string `json:"request_id"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

// Generate test data for benchmarks
func generateSmallPayload() SmallPayload {
	return SmallPayload{ID: 12345, Name: "test"}
}

func generateMediumPayload() MediumPayload {
	return MediumPayload{
		ID:        12345,
		Username:  "johndoe",
		Email:     "john@example.com",
		FirstName: "John",
		LastName:  "Doe",
		Active:    true,
		Roles:     []string{"admin", "user", "moderator"},
		Preferences: Prefs{
			Theme:         "dark",
			Notifications: true,
			Language:      "en-US",
		},
	}
}

func generateLargePayload() LargePayload {
	users := make([]MediumPayload, 100)
	for i := range users {
		users[i] = generateMediumPayload()
		users[i].ID = int64(i)
	}
	return LargePayload{
		Users: users,
		Pagination: Pagination{
			Total:   1000,
			Page:    1,
			PerPage: 100,
			Pages:   10,
		},
		Metadata: Meta{
			RequestID: "req-abc123",
			Timestamp: "2026-01-07T10:30:00Z",
			Version:   "2.1.0",
		},
	}
}
```

### Running the Benchmarks

These benchmarks compare encoding/json and sonic across different payload sizes.

```go
package benchmark

import (
	"encoding/json"
	"testing"

	"github.com/bytedance/sonic"
)

// Standard library benchmarks
func BenchmarkStdLib_Small_Marshal(b *testing.B) {
	payload := generateSmallPayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		json.Marshal(payload)
	}
}

func BenchmarkStdLib_Medium_Marshal(b *testing.B) {
	payload := generateMediumPayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		json.Marshal(payload)
	}
}

func BenchmarkStdLib_Large_Marshal(b *testing.B) {
	payload := generateLargePayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		json.Marshal(payload)
	}
}

// sonic benchmarks
func BenchmarkSonic_Small_Marshal(b *testing.B) {
	payload := generateSmallPayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sonic.Marshal(payload)
	}
}

func BenchmarkSonic_Medium_Marshal(b *testing.B) {
	payload := generateMediumPayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sonic.Marshal(payload)
	}
}

func BenchmarkSonic_Large_Marshal(b *testing.B) {
	payload := generateLargePayload()
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sonic.Marshal(payload)
	}
}

// Unmarshal benchmarks
func BenchmarkStdLib_Medium_Unmarshal(b *testing.B) {
	payload := generateMediumPayload()
	data, _ := json.Marshal(payload)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var p MediumPayload
		json.Unmarshal(data, &p)
	}
}

func BenchmarkSonic_Medium_Unmarshal(b *testing.B) {
	payload := generateMediumPayload()
	data, _ := sonic.Marshal(payload)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var p MediumPayload
		sonic.Unmarshal(data, &p)
	}
}
```

### Typical Benchmark Results

The following shows typical benchmark results comparing the libraries.

```text
# Run benchmarks with:
# go test -bench=. -benchmem ./...

BenchmarkStdLib_Small_Marshal-8       5000000    240 ns/op      48 B/op    1 allocs/op
BenchmarkSonic_Small_Marshal-8       20000000     65 ns/op      24 B/op    1 allocs/op

BenchmarkStdLib_Medium_Marshal-8      1000000   1150 ns/op     320 B/op    4 allocs/op
BenchmarkSonic_Medium_Marshal-8       5000000    280 ns/op     256 B/op    1 allocs/op

BenchmarkStdLib_Large_Marshal-8         10000  125000 ns/op   65536 B/op  102 allocs/op
BenchmarkSonic_Large_Marshal-8          50000   28000 ns/op   32768 B/op    2 allocs/op

BenchmarkStdLib_Medium_Unmarshal-8     500000   2800 ns/op     432 B/op   12 allocs/op
BenchmarkSonic_Medium_Unmarshal-8     3000000    450 ns/op     288 B/op    6 allocs/op

# easyjson results (with generated code):
BenchmarkEasyJSON_Medium_Marshal-8    8000000    180 ns/op     128 B/op    1 allocs/op
BenchmarkEasyJSON_Medium_Unmarshal-8  5000000    320 ns/op     256 B/op    4 allocs/op
```

## Memory Allocation Analysis

Memory allocations significantly impact performance, especially under high load. Let's analyze allocation patterns for each library.

### Allocation Profiling

Understanding where allocations occur helps optimize JSON processing in your application.

```go
package main

import (
	"encoding/json"
	"fmt"
	"runtime"

	"github.com/bytedance/sonic"
)

type TestPayload struct {
	ID       int64    `json:"id"`
	Name     string   `json:"name"`
	Tags     []string `json:"tags"`
	Metadata struct {
		Created string `json:"created"`
		Updated string `json:"updated"`
	} `json:"metadata"`
}

func measureAllocations(name string, fn func()) {
	// Force garbage collection before measurement
	runtime.GC()

	var before, after runtime.MemStats
	runtime.ReadMemStats(&before)

	// Run the function multiple times for accuracy
	iterations := 10000
	for i := 0; i < iterations; i++ {
		fn()
	}

	runtime.ReadMemStats(&after)

	allocsPerOp := (after.Mallocs - before.Mallocs) / uint64(iterations)
	bytesPerOp := (after.TotalAlloc - before.TotalAlloc) / uint64(iterations)

	fmt.Printf("%s: %d allocs/op, %d bytes/op\n", name, allocsPerOp, bytesPerOp)
}

func main() {
	payload := TestPayload{
		ID:   12345,
		Name: "Test Product",
		Tags: []string{"featured", "new", "sale"},
	}
	payload.Metadata.Created = "2026-01-07T10:00:00Z"
	payload.Metadata.Updated = "2026-01-07T10:30:00Z"

	// Measure standard library
	measureAllocations("encoding/json Marshal", func() {
		json.Marshal(payload)
	})

	// Measure sonic
	measureAllocations("sonic Marshal", func() {
		sonic.Marshal(payload)
	})

	// Unmarshal comparison
	data, _ := json.Marshal(payload)

	measureAllocations("encoding/json Unmarshal", func() {
		var p TestPayload
		json.Unmarshal(data, &p)
	})

	measureAllocations("sonic Unmarshal", func() {
		var p TestPayload
		sonic.Unmarshal(data, &p)
	})
}
```

### Using sync.Pool for Allocation Reuse

Reduce allocations by reusing buffers with sync.Pool.

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sync"
)

// bufferPool reuses byte buffers across marshal operations
var bufferPool = sync.Pool{
	New: func() interface{} {
		return new(bytes.Buffer)
	},
}

// encoderPool reuses JSON encoders
var encoderPool = sync.Pool{
	New: func() interface{} {
		return nil // Will be created with buffer
	},
}

type Response struct {
	Status  string      `json:"status"`
	Data    interface{} `json:"data"`
	Message string      `json:"message,omitempty"`
}

// MarshalWithPool uses pooled buffers to reduce allocations
func MarshalWithPool(v interface{}) ([]byte, error) {
	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	enc := json.NewEncoder(buf)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}

	// Make a copy since we're returning the buffer to the pool
	result := make([]byte, buf.Len()-1) // -1 to trim newline
	copy(result, buf.Bytes())
	return result, nil
}

// For even better performance with sonic
// sonic has internal pooling mechanisms
func main() {
	resp := Response{
		Status: "success",
		Data: map[string]interface{}{
			"id":   12345,
			"name": "Test",
		},
		Message: "",
	}

	// Standard approach - allocates on each call
	data1, _ := json.Marshal(resp)
	fmt.Println("Standard:", string(data1))

	// Pooled approach - reuses buffers
	data2, _ := MarshalWithPool(resp)
	fmt.Println("Pooled:", string(data2))

	// Run multiple times to see the benefit
	for i := 0; i < 1000; i++ {
		MarshalWithPool(resp)
	}
	fmt.Println("Completed 1000 pooled marshals")
}
```

## Streaming JSON for Large Payloads

When dealing with large JSON payloads, streaming can significantly reduce memory usage by processing data incrementally.

### Streaming Encoder

Use streaming to write large collections without loading everything into memory.

```go
package main

import (
	"encoding/json"
	"io"
	"os"
)

type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	TraceID   string `json:"trace_id"`
}

// StreamEncoder writes JSON arrays efficiently to any io.Writer
type StreamEncoder struct {
	w       io.Writer
	enc     *json.Encoder
	started bool
}

// NewStreamEncoder creates a streaming JSON array encoder
func NewStreamEncoder(w io.Writer) *StreamEncoder {
	return &StreamEncoder{
		w:   w,
		enc: json.NewEncoder(w),
	}
}

// Start writes the opening bracket of the JSON array
func (s *StreamEncoder) Start() error {
	_, err := s.w.Write([]byte("[\n"))
	s.started = true
	return err
}

// WriteItem writes a single item to the JSON array
func (s *StreamEncoder) WriteItem(item interface{}) error {
	if !s.started {
		s.Start()
	}
	return s.enc.Encode(item)
}

// End writes the closing bracket of the JSON array
func (s *StreamEncoder) End() error {
	_, err := s.w.Write([]byte("]\n"))
	return err
}

// GenerateAndStreamLogs demonstrates streaming large datasets
func GenerateAndStreamLogs(w io.Writer, count int) error {
	encoder := NewStreamEncoder(w)

	if err := encoder.Start(); err != nil {
		return err
	}

	// Stream entries one at a time - constant memory usage
	for i := 0; i < count; i++ {
		entry := LogEntry{
			Timestamp: "2026-01-07T10:30:00Z",
			Level:     "INFO",
			Message:   "Processing request",
			TraceID:   "abc123",
		}

		if err := encoder.WriteItem(entry); err != nil {
			return err
		}
	}

	return encoder.End()
}

func main() {
	// Stream to stdout
	GenerateAndStreamLogs(os.Stdout, 5)
}
```

### Streaming Decoder

Parse large JSON files without loading them entirely into memory.

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

type Record struct {
	ID    int64  `json:"id"`
	Value string `json:"value"`
}

// StreamDecoder processes JSON arrays item by item
type StreamDecoder struct {
	dec *json.Decoder
}

// NewStreamDecoder creates a streaming JSON array decoder
func NewStreamDecoder(r io.Reader) *StreamDecoder {
	return &StreamDecoder{
		dec: json.NewDecoder(r),
	}
}

// DecodeArray processes each item in a JSON array with a callback
func (s *StreamDecoder) DecodeArray(callback func(json.RawMessage) error) error {
	// Expect opening bracket
	token, err := s.dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := token.(json.Delim); !ok || delim != '[' {
		return fmt.Errorf("expected '[', got %v", token)
	}

	// Process each item
	for s.dec.More() {
		var raw json.RawMessage
		if err := s.dec.Decode(&raw); err != nil {
			return err
		}
		if err := callback(raw); err != nil {
			return err
		}
	}

	// Expect closing bracket
	token, err = s.dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := token.(json.Delim); !ok || delim != ']' {
		return fmt.Errorf("expected ']', got %v", token)
	}

	return nil
}

func main() {
	// Simulated large JSON input
	jsonData := `[
		{"id": 1, "value": "first"},
		{"id": 2, "value": "second"},
		{"id": 3, "value": "third"},
		{"id": 4, "value": "fourth"},
		{"id": 5, "value": "fifth"}
	]`

	decoder := NewStreamDecoder(strings.NewReader(jsonData))

	count := 0
	err := decoder.DecodeArray(func(raw json.RawMessage) error {
		// Process each item individually
		var record Record
		if err := json.Unmarshal(raw, &record); err != nil {
			return err
		}
		fmt.Printf("Processed record: ID=%d, Value=%s\n", record.ID, record.Value)
		count++
		return nil
	})

	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	fmt.Printf("Total records processed: %d\n", count)
}
```

### sonic Streaming with Large Files

sonic provides efficient streaming for large JSON documents.

```go
package main

import (
	"fmt"
	"os"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/decoder"
)

type DataRecord struct {
	ID        int64             `json:"id"`
	Timestamp string            `json:"timestamp"`
	Metrics   map[string]float64 `json:"metrics"`
}

// ProcessLargeFile demonstrates streaming with sonic
func ProcessLargeFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	// Read file content
	stat, _ := file.Stat()
	data := make([]byte, stat.Size())
	file.Read(data)

	// Use sonic's streaming decoder
	dec := decoder.NewStreamDecoder(data)

	var record DataRecord
	for dec.Decode(&record) == nil {
		// Process each record as it's decoded
		fmt.Printf("Processing record %d with %d metrics\n",
			record.ID, len(record.Metrics))
	}

	return nil
}

// For NDJSON (newline-delimited JSON) processing
func ProcessNDJSON(data []byte) error {
	// sonic handles NDJSON efficiently
	lines := splitLines(data)

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		var record DataRecord
		if err := sonic.Unmarshal(line, &record); err != nil {
			return err
		}

		// Process record
		fmt.Printf("Record ID: %d\n", record.ID)
	}

	return nil
}

func splitLines(data []byte) [][]byte {
	var lines [][]byte
	start := 0
	for i, b := range data {
		if b == '\n' {
			lines = append(lines, data[start:i])
			start = i + 1
		}
	}
	if start < len(data) {
		lines = append(lines, data[start:])
	}
	return lines
}

func main() {
	// Example NDJSON data
	ndjsonData := []byte(`{"id":1,"timestamp":"2026-01-07T10:00:00Z","metrics":{"cpu":45.2}}
{"id":2,"timestamp":"2026-01-07T10:01:00Z","metrics":{"cpu":52.1}}
{"id":3,"timestamp":"2026-01-07T10:02:00Z","metrics":{"cpu":38.9}}`)

	ProcessNDJSON(ndjsonData)
}
```

## Integration with Web Frameworks

Integrating high-performance JSON libraries with popular Go web frameworks maximizes API throughput.

### Integration with Gin

Replace Gin's default JSON encoder with sonic for better performance.

```go
package main

import (
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
)

// SonicJSON implements gin's render.Render interface
type SonicJSON struct {
	Data interface{}
}

// Render writes JSON using sonic
func (r SonicJSON) Render(w http.ResponseWriter) error {
	r.WriteContentType(w)
	data, err := sonic.Marshal(r.Data)
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}

// WriteContentType sets the Content-Type header
func (r SonicJSON) WriteContentType(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
}

// User represents the API response
type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// Response wraps API responses
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func main() {
	r := gin.Default()

	// Custom render function using sonic
	r.GET("/api/users/:id", func(c *gin.Context) {
		user := User{
			ID:       12345,
			Username: "johndoe",
			Email:    "john@example.com",
		}

		response := Response{
			Success: true,
			Data:    user,
		}

		// Use sonic for rendering
		c.Render(http.StatusOK, SonicJSON{Data: response})
	})

	// Binding JSON with sonic
	r.POST("/api/users", func(c *gin.Context) {
		body, _ := c.GetRawData()

		var user User
		if err := sonic.Unmarshal(body, &user); err != nil {
			c.Render(http.StatusBadRequest, SonicJSON{
				Data: Response{Success: false, Error: err.Error()},
			})
			return
		}

		c.Render(http.StatusCreated, SonicJSON{
			Data: Response{Success: true, Data: user},
		})
	})

	r.Run(":8080")
}
```

### Integration with Echo

Configure Echo to use sonic for JSON operations.

```go
package main

import (
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/labstack/echo/v4"
)

// SonicSerializer implements echo.JSONSerializer
type SonicSerializer struct{}

// Serialize encodes the response using sonic
func (s SonicSerializer) Serialize(c echo.Context, i interface{}, indent string) error {
	var data []byte
	var err error

	if indent != "" {
		data, err = sonic.MarshalIndent(i, "", indent)
	} else {
		data, err = sonic.Marshal(i)
	}

	if err != nil {
		return err
	}

	return c.Blob(http.StatusOK, echo.MIMEApplicationJSON, data)
}

// Deserialize decodes the request body using sonic
func (s SonicSerializer) Deserialize(c echo.Context, i interface{}) error {
	body := c.Request().Body
	defer body.Close()

	// Read the body
	buf := make([]byte, c.Request().ContentLength)
	body.Read(buf)

	return sonic.Unmarshal(buf, i)
}

type Product struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
}

func main() {
	e := echo.New()

	// Configure sonic as the JSON serializer
	e.JSONSerializer = SonicSerializer{}

	e.GET("/api/products/:id", func(c echo.Context) error {
		product := Product{
			ID:          1001,
			Name:        "Wireless Mouse",
			Price:       29.99,
			Description: "Ergonomic wireless mouse",
		}
		return c.JSON(http.StatusOK, product)
	})

	e.POST("/api/products", func(c echo.Context) error {
		var product Product
		if err := c.Bind(&product); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		return c.JSON(http.StatusCreated, product)
	})

	e.Start(":8080")
}
```

### Integration with Fiber

Fiber has built-in support for custom JSON encoders.

```go
package main

import (
	"github.com/bytedance/sonic"
	"github.com/gofiber/fiber/v2"
)

type APIResponse struct {
	Status  string      `json:"status"`
	Code    int         `json:"code"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

type Item struct {
	ID       int64    `json:"id"`
	Name     string   `json:"name"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
}

func main() {
	// Configure Fiber to use sonic
	app := fiber.New(fiber.Config{
		JSONEncoder: sonic.Marshal,
		JSONDecoder: sonic.Unmarshal,
	})

	// Now all JSON operations use sonic automatically
	app.Get("/api/items", func(c *fiber.Ctx) error {
		items := []Item{
			{ID: 1, Name: "Widget", Category: "Tools", Tags: []string{"new"}},
			{ID: 2, Name: "Gadget", Category: "Electronics", Tags: []string{"featured"}},
		}

		return c.JSON(APIResponse{
			Status: "success",
			Code:   200,
			Data:   items,
		})
	})

	app.Post("/api/items", func(c *fiber.Ctx) error {
		var item Item

		// Fiber uses sonic.Unmarshal automatically
		if err := c.BodyParser(&item); err != nil {
			return c.Status(400).JSON(APIResponse{
				Status:  "error",
				Code:    400,
				Message: err.Error(),
			})
		}

		return c.Status(201).JSON(APIResponse{
			Status: "success",
			Code:   201,
			Data:   item,
		})
	})

	app.Listen(":3000")
}
```

## When to Use Each Option

Choosing the right JSON library depends on your specific requirements and constraints.

### Decision Matrix

This comparison helps you choose the best option for your use case.

```go
package main

import "fmt"

/*
Decision Matrix for JSON Library Selection:

| Criteria                  | encoding/json | sonic      | easyjson   |
|---------------------------|---------------|------------|------------|
| Setup Complexity          | None          | Low        | Medium     |
| Performance Gain          | Baseline      | 3-5x       | 4-6x       |
| Memory Efficiency         | Baseline      | 2-3x       | 3-5x       |
| Code Generation Required  | No            | No         | Yes        |
| Architecture Support      | All           | amd64/arm64| All        |
| Reflection Used           | Yes           | JIT        | No         |
| Maintenance Overhead      | None          | Low        | Medium     |
| Compatibility             | Standard      | High       | High       |
*/

func main() {
	fmt.Println("JSON Library Selection Guide")
	fmt.Println("=============================")

	// Use encoding/json when:
	fmt.Println("\nUse encoding/json when:")
	fmt.Println("- Simplicity is more important than performance")
	fmt.Println("- You need maximum compatibility")
	fmt.Println("- JSON operations are not a bottleneck")
	fmt.Println("- You're prototyping or building small applications")

	// Use sonic when:
	fmt.Println("\nUse sonic when:")
	fmt.Println("- You need high performance with minimal setup")
	fmt.Println("- Running on amd64 or arm64 architecture")
	fmt.Println("- You want a drop-in replacement for encoding/json")
	fmt.Println("- You need lazy parsing for large documents")
	fmt.Println("- JIT compilation overhead is acceptable")

	// Use easyjson when:
	fmt.Println("\nUse easyjson when:")
	fmt.Println("- Maximum performance is critical")
	fmt.Println("- You can integrate code generation into your build")
	fmt.Println("- Struct definitions are stable")
	fmt.Println("- Zero-allocation marshaling is required")
	fmt.Println("- You need consistent performance without JIT warmup")
}
```

### Performance vs Complexity Trade-offs

Consider these factors when making your decision.

```go
package main

import "fmt"

// Recommendation engine for JSON library selection
type UseCase struct {
	Name           string
	Recommended    string
	Reason         string
}

func getRecommendations() []UseCase {
	return []UseCase{
		{
			Name:        "High-throughput API server",
			Recommended: "sonic or easyjson",
			Reason:      "Both offer 3-5x performance improvement needed for high RPS",
		},
		{
			Name:        "CLI tool with occasional JSON",
			Recommended: "encoding/json",
			Reason:      "Simplicity matters more; JSON isn't the bottleneck",
		},
		{
			Name:        "Microservice with stable schemas",
			Recommended: "easyjson",
			Reason:      "Code generation fits CI/CD; maximum performance",
		},
		{
			Name:        "Dynamic JSON processing",
			Recommended: "sonic",
			Reason:      "Lazy parsing and AST API handle unknown structures well",
		},
		{
			Name:        "Cross-platform deployment",
			Recommended: "easyjson or encoding/json",
			Reason:      "sonic requires amd64/arm64; others work everywhere",
		},
		{
			Name:        "Real-time data streaming",
			Recommended: "sonic with streaming",
			Reason:      "Low latency and efficient memory usage",
		},
		{
			Name:        "Batch data processing",
			Recommended: "easyjson",
			Reason:      "Consistent performance without JIT warmup time",
		},
	}
}

func main() {
	fmt.Println("JSON Library Recommendations by Use Case")
	fmt.Println("=========================================\n")

	for _, uc := range getRecommendations() {
		fmt.Printf("Use Case: %s\n", uc.Name)
		fmt.Printf("  Recommended: %s\n", uc.Recommended)
		fmt.Printf("  Reason: %s\n\n", uc.Reason)
	}
}
```

## Best Practices and Recommendations

Follow these best practices to maximize JSON performance in your Go applications.

### Struct Tag Optimization

Optimize struct tags for better serialization performance.

```go
package main

import (
	"fmt"

	"github.com/bytedance/sonic"
)

// Optimized struct design for JSON serialization
// - Use pointer types for optional fields to enable omitempty
// - Order fields by access frequency (most accessed first)
// - Use specific types instead of interface{}

// BadExample shows common anti-patterns
type BadExample struct {
	Data      interface{} `json:"data"`            // interface{} requires reflection
	Timestamp string      `json:"timestamp"`       // Should be at the end if rarely used
	ID        int64       `json:"id"`              // High-frequency field buried in struct
}

// GoodExample shows optimized patterns
type GoodExample struct {
	ID        int64   `json:"id"`                     // High-frequency field first
	Name      string  `json:"name"`                   // Common field second
	Active    bool    `json:"active"`                 // Primitive types are fast
	Score     float64 `json:"score,omitempty"`        // omitempty for optional fields
	Metadata  *Meta   `json:"metadata,omitempty"`     // Pointer for optional nested struct
	Timestamp string  `json:"timestamp,omitempty"`    // Rarely accessed field last
}

type Meta struct {
	Source  string `json:"source"`
	Version string `json:"version"`
}

// Use json:"-" for fields that should never be serialized
type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`          // Never serialize sensitive data
	InternalID   int64  `json:"-"`          // Internal use only
}

func main() {
	good := GoodExample{
		ID:     12345,
		Name:   "Optimized",
		Active: true,
		Score:  95.5,
	}

	data, _ := sonic.Marshal(good)
	fmt.Println("Optimized struct:", string(data))

	// With metadata
	good.Metadata = &Meta{Source: "api", Version: "2.0"}
	data, _ = sonic.Marshal(good)
	fmt.Println("With metadata:", string(data))
}
```

### Error Handling Patterns

Implement robust error handling for JSON operations.

```go
package main

import (
	"errors"
	"fmt"
	"log"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/decoder"
)

// Custom error types for JSON operations
type JSONError struct {
	Operation string
	Field     string
	Err       error
}

func (e *JSONError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("JSON %s error on field '%s': %v", e.Operation, e.Field, e.Err)
	}
	return fmt.Sprintf("JSON %s error: %v", e.Operation, e.Err)
}

func (e *JSONError) Unwrap() error {
	return e.Err
}

// SafeMarshal wraps marshaling with error handling
func SafeMarshal(v interface{}) ([]byte, error) {
	data, err := sonic.Marshal(v)
	if err != nil {
		return nil, &JSONError{
			Operation: "marshal",
			Err:       err,
		}
	}
	return data, nil
}

// SafeUnmarshal wraps unmarshaling with detailed error handling
func SafeUnmarshal(data []byte, v interface{}) error {
	err := sonic.Unmarshal(data, v)
	if err != nil {
		// Check for specific error types
		var syntaxErr *decoder.SyntaxError
		if errors.As(err, &syntaxErr) {
			return &JSONError{
				Operation: "unmarshal",
				Err:       fmt.Errorf("syntax error at position %d", syntaxErr.Pos),
			}
		}
		return &JSONError{
			Operation: "unmarshal",
			Err:       err,
		}
	}
	return nil
}

type Config struct {
	Host    string `json:"host"`
	Port    int    `json:"port"`
	Timeout int    `json:"timeout"`
}

func main() {
	// Valid JSON
	validJSON := `{"host":"localhost","port":8080,"timeout":30}`
	var config Config
	if err := SafeUnmarshal([]byte(validJSON), &config); err != nil {
		log.Printf("Error: %v", err)
	} else {
		fmt.Printf("Parsed config: %+v\n", config)
	}

	// Invalid JSON - demonstrates error handling
	invalidJSON := `{"host":"localhost","port":}`
	if err := SafeUnmarshal([]byte(invalidJSON), &config); err != nil {
		var jsonErr *JSONError
		if errors.As(err, &jsonErr) {
			log.Printf("JSON Error - Operation: %s, Details: %v\n",
				jsonErr.Operation, jsonErr.Err)
		}
	}
}
```

### Performance Monitoring

Monitor JSON performance in production environments.

```go
package main

import (
	"fmt"
	"sync/atomic"
	"time"

	"github.com/bytedance/sonic"
)

// JSONMetrics tracks JSON operation performance
type JSONMetrics struct {
	MarshalCount    int64
	UnmarshalCount  int64
	MarshalDuration int64 // nanoseconds
	UnmarshalDuration int64 // nanoseconds
	MarshalErrors   int64
	UnmarshalErrors int64
}

var metrics JSONMetrics

// MonitoredMarshal wraps marshal with metrics collection
func MonitoredMarshal(v interface{}) ([]byte, error) {
	start := time.Now()
	data, err := sonic.Marshal(v)
	duration := time.Since(start).Nanoseconds()

	atomic.AddInt64(&metrics.MarshalCount, 1)
	atomic.AddInt64(&metrics.MarshalDuration, duration)

	if err != nil {
		atomic.AddInt64(&metrics.MarshalErrors, 1)
	}

	return data, err
}

// MonitoredUnmarshal wraps unmarshal with metrics collection
func MonitoredUnmarshal(data []byte, v interface{}) error {
	start := time.Now()
	err := sonic.Unmarshal(data, v)
	duration := time.Since(start).Nanoseconds()

	atomic.AddInt64(&metrics.UnmarshalCount, 1)
	atomic.AddInt64(&metrics.UnmarshalDuration, duration)

	if err != nil {
		atomic.AddInt64(&metrics.UnmarshalErrors, 1)
	}

	return err
}

// GetMetrics returns current performance metrics
func GetMetrics() map[string]interface{} {
	marshalCount := atomic.LoadInt64(&metrics.MarshalCount)
	unmarshalCount := atomic.LoadInt64(&metrics.UnmarshalCount)

	var avgMarshal, avgUnmarshal float64
	if marshalCount > 0 {
		avgMarshal = float64(atomic.LoadInt64(&metrics.MarshalDuration)) / float64(marshalCount) / 1000
	}
	if unmarshalCount > 0 {
		avgUnmarshal = float64(atomic.LoadInt64(&metrics.UnmarshalDuration)) / float64(unmarshalCount) / 1000
	}

	return map[string]interface{}{
		"marshal_count":          marshalCount,
		"unmarshal_count":        unmarshalCount,
		"avg_marshal_us":         avgMarshal,
		"avg_unmarshal_us":       avgUnmarshal,
		"marshal_errors":         atomic.LoadInt64(&metrics.MarshalErrors),
		"unmarshal_errors":       atomic.LoadInt64(&metrics.UnmarshalErrors),
	}
}

type Data struct {
	ID      int64  `json:"id"`
	Payload string `json:"payload"`
}

func main() {
	// Simulate API operations
	for i := 0; i < 10000; i++ {
		data := Data{ID: int64(i), Payload: "test data"}

		jsonData, _ := MonitoredMarshal(data)

		var decoded Data
		MonitoredUnmarshal(jsonData, &decoded)
	}

	// Print metrics
	m := GetMetrics()
	fmt.Println("JSON Performance Metrics:")
	fmt.Printf("  Marshal operations: %d\n", m["marshal_count"])
	fmt.Printf("  Unmarshal operations: %d\n", m["unmarshal_count"])
	fmt.Printf("  Avg marshal time: %.2f microseconds\n", m["avg_marshal_us"])
	fmt.Printf("  Avg unmarshal time: %.2f microseconds\n", m["avg_unmarshal_us"])
	fmt.Printf("  Marshal errors: %d\n", m["marshal_errors"])
	fmt.Printf("  Unmarshal errors: %d\n", m["unmarshal_errors"])
}
```

## Conclusion

Optimizing JSON serialization in Go can yield significant performance improvements for your applications. Here's a summary of the key takeaways:

1. **Standard Library (`encoding/json`)**: Best for simplicity and compatibility, but uses reflection which impacts performance.

2. **sonic**: Excellent choice for high-performance applications with minimal setup. Provides 3-5x speedup through JIT compilation and SIMD instructions. Works as a drop-in replacement for the standard library.

3. **easyjson**: Maximum performance through compile-time code generation. Requires build-time code generation but achieves 4-6x speedup with zero allocations in many cases.

4. **Streaming**: Essential for handling large payloads efficiently without loading entire documents into memory.

5. **Framework Integration**: All major Go web frameworks support custom JSON encoders, making it easy to integrate sonic or easyjson.

The right choice depends on your specific requirements:
- For quick wins with minimal changes, use **sonic**
- For maximum performance with stable schemas, use **easyjson**
- For simplicity and broad compatibility, stick with **encoding/json**

Remember to benchmark your specific use case, as performance can vary based on payload structure, size, and access patterns. Always measure before and after optimization to validate the improvements in your actual application context.
