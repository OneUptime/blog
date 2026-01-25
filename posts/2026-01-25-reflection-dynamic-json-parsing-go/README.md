# How to Use Reflection for Dynamic JSON Parsing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Reflection, JSON, Dynamic Parsing, Runtime

Description: Learn how to use Go's reflect package to parse JSON data at runtime when the structure is unknown or varies. This guide covers practical techniques, performance considerations, and common pitfalls.

---

> When you know your JSON structure at compile time, Go's standard `encoding/json` package handles everything beautifully. But what happens when you're building a plugin system, processing webhook payloads from multiple providers, or creating a generic data transformation tool? That's when reflection becomes your friend.

The `reflect` package in Go lets you inspect and manipulate types at runtime. Combined with JSON parsing, it enables you to build flexible systems that adapt to varying data structures without hardcoding every possible schema.

---

## When Do You Actually Need This?

Before diving into reflection, make sure you actually need it. Static typing is one of Go's strengths, so don't throw it away without good reason. Here are legitimate use cases:

- **Plugin systems** where external code defines data structures
- **Generic API gateways** that forward payloads without knowing their contents
- **Configuration systems** that support user-defined fields
- **Data transformation pipelines** that process arbitrary JSON
- **Testing frameworks** that need to compare JSON structures

If your JSON structure is known at compile time, stick with regular structs. Your code will be faster, safer, and easier to maintain.

---

## Basic Dynamic JSON Parsing

The simplest approach uses `map[string]interface{}` to capture arbitrary JSON. This doesn't require the reflect package directly, but it's the foundation for more advanced techniques.

```go
package main

import (
    "encoding/json"
    "fmt"
)

func parseUnknownJSON(data []byte) (map[string]interface{}, error) {
    // Parse JSON into a generic map
    // interface{} can hold any Go value
    var result map[string]interface{}

    if err := json.Unmarshal(data, &result); err != nil {
        return nil, fmt.Errorf("failed to parse JSON: %w", err)
    }

    return result, nil
}

func main() {
    jsonData := []byte(`{
        "name": "Alice",
        "age": 30,
        "active": true,
        "scores": [95, 87, 92]
    }`)

    result, err := parseUnknownJSON(jsonData)
    if err != nil {
        panic(err)
    }

    // Access values with type assertions
    name := result["name"].(string)
    age := result["age"].(float64) // JSON numbers become float64

    fmt.Printf("Name: %s, Age: %.0f\n", name, age)
}
```

The catch with this approach is that JSON numbers always become `float64` in Go, and you need type assertions to work with the values. This is where reflection helps.

---

## Using Reflect for Type-Safe Access

The reflect package lets you examine values at runtime and convert them safely. Here's a utility that extracts values from a parsed JSON map with proper type handling.

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
)

// GetField safely extracts a field from parsed JSON and converts it to the target type.
// Returns the zero value if the field doesn't exist or can't be converted.
func GetField[T any](data map[string]interface{}, key string) (T, bool) {
    var zero T

    val, exists := data[key]
    if !exists {
        return zero, false
    }

    // Get the reflect.Value of the interface value
    rv := reflect.ValueOf(val)

    // Get the target type from the generic parameter
    targetType := reflect.TypeOf(zero)

    // Check if direct conversion is possible
    if rv.Type().ConvertibleTo(targetType) {
        converted := rv.Convert(targetType)
        return converted.Interface().(T), true
    }

    // Handle special case: float64 to int conversion (common with JSON)
    if rv.Kind() == reflect.Float64 && targetType.Kind() == reflect.Int {
        intVal := int(rv.Float())
        return reflect.ValueOf(intVal).Interface().(T), true
    }

    return zero, false
}

func main() {
    jsonData := []byte(`{"count": 42, "ratio": 3.14, "name": "test"}`)

    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)

    // Type-safe extraction with automatic conversion
    count, ok := GetField[int](data, "count")
    if ok {
        fmt.Printf("Count (int): %d\n", count)
    }

    ratio, ok := GetField[float64](data, "ratio")
    if ok {
        fmt.Printf("Ratio (float64): %f\n", ratio)
    }

    name, ok := GetField[string](data, "name")
    if ok {
        fmt.Printf("Name (string): %s\n", name)
    }
}
```

---

## Building a Dynamic Struct from JSON

Sometimes you need to create struct types at runtime based on JSON data. This is useful when you want to work with the data using Go's standard patterns rather than nested maps.

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
)

// InferStructType analyzes a JSON map and creates a corresponding struct type.
// Field names are capitalized to make them exported.
func InferStructType(data map[string]interface{}) reflect.Type {
    fields := make([]reflect.StructField, 0, len(data))

    for key, val := range data {
        // Capitalize first letter for exported field
        fieldName := capitalizeFirst(key)

        // Determine the Go type from the JSON value
        fieldType := inferGoType(val)

        // Create struct field with JSON tag for marshaling
        field := reflect.StructField{
            Name: fieldName,
            Type: fieldType,
            Tag:  reflect.StructTag(fmt.Sprintf(`json:"%s"`, key)),
        }

        fields = append(fields, field)
    }

    // Create and return the dynamic struct type
    return reflect.StructOf(fields)
}

// inferGoType determines the appropriate Go type for a JSON value.
func inferGoType(val interface{}) reflect.Type {
    if val == nil {
        return reflect.TypeOf((*interface{})(nil)).Elem()
    }

    switch v := val.(type) {
    case bool:
        return reflect.TypeOf(false)
    case float64:
        // Check if it's actually an integer
        if v == float64(int64(v)) {
            return reflect.TypeOf(int64(0))
        }
        return reflect.TypeOf(float64(0))
    case string:
        return reflect.TypeOf("")
    case []interface{}:
        if len(v) > 0 {
            elemType := inferGoType(v[0])
            return reflect.SliceOf(elemType)
        }
        return reflect.TypeOf([]interface{}{})
    case map[string]interface{}:
        // Nested object becomes a nested struct
        return InferStructType(v)
    default:
        return reflect.TypeOf(val)
    }
}

func capitalizeFirst(s string) string {
    if len(s) == 0 {
        return s
    }
    // Simple ASCII capitalization
    if s[0] >= 'a' && s[0] <= 'z' {
        return string(s[0]-32) + s[1:]
    }
    return s
}

func main() {
    jsonData := []byte(`{
        "id": 123,
        "username": "alice",
        "verified": true,
        "balance": 99.50
    }`)

    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)

    // Create a dynamic struct type
    structType := InferStructType(data)
    fmt.Printf("Generated type: %v\n", structType)

    // Create an instance of the dynamic struct
    structPtr := reflect.New(structType)

    // Unmarshal JSON directly into the dynamic struct
    json.Unmarshal(jsonData, structPtr.Interface())

    // Access the populated struct
    structVal := structPtr.Elem()
    for i := 0; i < structVal.NumField(); i++ {
        field := structType.Field(i)
        value := structVal.Field(i)
        fmt.Printf("%s: %v\n", field.Name, value.Interface())
    }
}
```

---

## Walking JSON Structures Recursively

When processing deeply nested JSON, you often need to traverse the entire structure. Here's a walker that visits every value with its path.

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
    "strings"
)

// JSONVisitor is called for each value in the JSON structure.
// path is the dot-separated path to the value (e.g., "user.address.city").
type JSONVisitor func(path string, value interface{}, kind reflect.Kind)

// WalkJSON recursively visits every value in a parsed JSON structure.
func WalkJSON(data interface{}, visitor JSONVisitor) {
    walkJSON("", data, visitor)
}

func walkJSON(path string, data interface{}, visitor JSONVisitor) {
    if data == nil {
        visitor(path, nil, reflect.Invalid)
        return
    }

    rv := reflect.ValueOf(data)
    kind := rv.Kind()

    switch kind {
    case reflect.Map:
        // JSON objects become map[string]interface{}
        visitor(path, data, kind)

        mapVal := data.(map[string]interface{})
        for key, val := range mapVal {
            childPath := key
            if path != "" {
                childPath = path + "." + key
            }
            walkJSON(childPath, val, visitor)
        }

    case reflect.Slice:
        // JSON arrays become []interface{}
        visitor(path, data, kind)

        sliceVal := data.([]interface{})
        for i, val := range sliceVal {
            childPath := fmt.Sprintf("%s[%d]", path, i)
            if path == "" {
                childPath = fmt.Sprintf("[%d]", i)
            }
            walkJSON(childPath, val, visitor)
        }

    default:
        // Primitive values: string, float64, bool
        visitor(path, data, kind)
    }
}

func main() {
    jsonData := []byte(`{
        "user": {
            "name": "Bob",
            "emails": ["bob@work.com", "bob@home.com"]
        },
        "active": true,
        "loginCount": 42
    }`)

    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)

    // Visit every value and print its path
    WalkJSON(data, func(path string, value interface{}, kind reflect.Kind) {
        if kind != reflect.Map && kind != reflect.Slice {
            fmt.Printf("%-25s = %v (%s)\n", path, value, kind)
        }
    })
}
```

Output:
```
active                    = true (bool)
loginCount                = 42 (float64)
user.name                 = Bob (string)
user.emails[0]            = bob@work.com (string)
user.emails[1]            = bob@home.com (string)
```

---

## Populating Structs Dynamically

Sometimes you have a struct but want to populate it from JSON with field names that don't match exactly. Reflection lets you map fields flexibly.

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
    "strings"
)

// PopulateStruct fills a struct from a JSON map using flexible field matching.
// It matches fields by: exact name, lowercase comparison, or json tag.
func PopulateStruct(target interface{}, data map[string]interface{}) error {
    rv := reflect.ValueOf(target)

    // Must be a pointer to a struct
    if rv.Kind() != reflect.Ptr || rv.Elem().Kind() != reflect.Struct {
        return fmt.Errorf("target must be a pointer to a struct")
    }

    structVal := rv.Elem()
    structType := structVal.Type()

    for i := 0; i < structVal.NumField(); i++ {
        field := structType.Field(i)
        fieldVal := structVal.Field(i)

        // Skip unexported fields
        if !fieldVal.CanSet() {
            continue
        }

        // Try to find matching JSON key
        jsonKey := findMatchingKey(field, data)
        if jsonKey == "" {
            continue
        }

        jsonVal, exists := data[jsonKey]
        if !exists || jsonVal == nil {
            continue
        }

        // Set the field value with type conversion
        if err := setFieldValue(fieldVal, jsonVal); err != nil {
            return fmt.Errorf("field %s: %w", field.Name, err)
        }
    }

    return nil
}

// findMatchingKey finds a JSON key that matches the struct field.
func findMatchingKey(field reflect.StructField, data map[string]interface{}) string {
    // Check json tag first
    if tag := field.Tag.Get("json"); tag != "" {
        tagName := strings.Split(tag, ",")[0]
        if tagName != "-" {
            if _, exists := data[tagName]; exists {
                return tagName
            }
        }
    }

    // Check exact field name
    if _, exists := data[field.Name]; exists {
        return field.Name
    }

    // Check lowercase field name
    lowerName := strings.ToLower(field.Name)
    for key := range data {
        if strings.ToLower(key) == lowerName {
            return key
        }
    }

    return ""
}

// setFieldValue sets a struct field from a JSON value with type conversion.
func setFieldValue(field reflect.Value, val interface{}) error {
    jsonVal := reflect.ValueOf(val)

    // Direct assignment if types match
    if jsonVal.Type().AssignableTo(field.Type()) {
        field.Set(jsonVal)
        return nil
    }

    // Handle numeric conversions (JSON numbers are float64)
    if jsonVal.Kind() == reflect.Float64 {
        switch field.Kind() {
        case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
            field.SetInt(int64(jsonVal.Float()))
            return nil
        case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
            field.SetUint(uint64(jsonVal.Float()))
            return nil
        case reflect.Float32:
            field.SetFloat(jsonVal.Float())
            return nil
        }
    }

    // Try type conversion
    if jsonVal.Type().ConvertibleTo(field.Type()) {
        field.Set(jsonVal.Convert(field.Type()))
        return nil
    }

    return fmt.Errorf("cannot convert %v to %v", jsonVal.Type(), field.Type())
}

type User struct {
    ID       int    `json:"user_id"`
    Name     string // matches "name" or "Name"
    Email    string
    IsActive bool   `json:"active"`
}

func main() {
    // JSON with different naming conventions
    jsonData := []byte(`{
        "user_id": 42,
        "NAME": "Charlie",
        "email": "charlie@example.com",
        "active": true
    }`)

    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)

    var user User
    if err := PopulateStruct(&user, data); err != nil {
        panic(err)
    }

    fmt.Printf("User: %+v\n", user)
}
```

---

## Performance Considerations

Reflection is slower than static typing. Here are some benchmarks and optimization tips.

```go
package main

import (
    "encoding/json"
    "reflect"
    "testing"
)

type StaticUser struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

var testJSON = []byte(`{"id": 1, "name": "Test", "email": "test@example.com"}`)

// BenchmarkStaticParsing parses JSON into a known struct.
func BenchmarkStaticParsing(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var user StaticUser
        json.Unmarshal(testJSON, &user)
    }
}

// BenchmarkDynamicParsing parses JSON into map[string]interface{}.
func BenchmarkDynamicParsing(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var data map[string]interface{}
        json.Unmarshal(testJSON, &data)
    }
}

// BenchmarkReflectAccess accesses fields via reflection.
func BenchmarkReflectAccess(b *testing.B) {
    var user StaticUser
    json.Unmarshal(testJSON, &user)

    rv := reflect.ValueOf(user)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = rv.Field(0).Int()
        _ = rv.Field(1).String()
        _ = rv.Field(2).String()
    }
}
```

Typical results show static parsing is 2-3x faster than dynamic parsing. Reflection-based field access adds additional overhead.

**Optimization tips:**

1. **Cache reflect.Type values** - Type information doesn't change at runtime
2. **Use sync.Pool for temporary allocations** - Reduces GC pressure
3. **Prefer static types when possible** - Use reflection only where truly needed
4. **Consider code generation** - Tools like `go generate` can create static code from schemas

---

## Common Pitfalls

**1. Forgetting that JSON numbers are float64**

```go
// Wrong - will panic
count := data["count"].(int)

// Correct
count := int(data["count"].(float64))
```

**2. Not checking for nil values**

```go
// Wrong - panics if "optional" is missing or null
val := data["optional"].(string)

// Correct
if val, ok := data["optional"].(string); ok {
    // use val
}
```

**3. Modifying unexported fields**

```go
type internal struct {
    secret string // lowercase = unexported
}

// This will panic - can't set unexported fields
field.SetString("new value")
```

**4. Using reflect.Value instead of reflect.Type for type comparisons**

```go
// Wrong - comparing values
if rv == reflect.ValueOf("") { }

// Correct - comparing types
if rv.Kind() == reflect.String { }
```

---

## When to Avoid Reflection

Reflection is powerful but has costs:

- **Runtime panics instead of compile errors** - Mistakes surface in production
- **Harder to read and maintain** - Future developers will struggle
- **No IDE support** - Autocomplete and refactoring tools can't help
- **Performance overhead** - Every reflection call has a cost

Consider alternatives:

- **Code generation** for known schemas
- **Interface-based polymorphism** for a fixed set of types
- **JSON Schema validation** if you just need to validate structure
- **Protocol Buffers or MessagePack** for type-safe serialization

---

## Wrapping Up

Reflection-based JSON parsing in Go unlocks flexibility when dealing with dynamic data structures. The `reflect` package lets you inspect types, create structs at runtime, and traverse unknown data structures safely.

Use these techniques when you genuinely need runtime flexibility - plugin systems, generic data pipelines, or multi-tenant APIs with custom schemas. For everything else, stick with Go's static typing. Your future self will thank you.

---

*Need to monitor your Go applications? [OneUptime](https://oneuptime.com) provides comprehensive observability with logs, metrics, and traces - all with native OpenTelemetry support.*

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
