# How to Parse Dynamic JSON with Unknown Structure in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, JSON, Dynamic JSON, Type Assertions, Parsing, API

Description: Learn techniques for parsing JSON with unknown or dynamic structure in Go using maps, interfaces, and type assertions for flexible data handling.

---

Go's static typing is great for reliability, but it creates challenges when working with JSON that has unknown or variable structure. This guide covers multiple techniques for handling dynamic JSON data.

---

## The Challenge

When working with external APIs or user-provided data, you often encounter:

- Unknown field names
- Fields that might be strings or numbers
- Optional nested objects
- Arrays with mixed types

Go's strict typing requires different approaches for these scenarios.

---

## Approach 1: Unmarshal to map[string]interface{}

The most flexible approach uses a map with empty interface values:

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    // JSON with unknown structure
    jsonData := []byte(`{
        "name": "Alice",
        "age": 30,
        "active": true,
        "score": 95.5,
        "tags": ["admin", "user"],
        "metadata": {
            "lastLogin": "2024-01-15",
            "preferences": {"theme": "dark"}
        }
    }`)
    
    // Parse into generic map
    var result map[string]interface{}
    if err := json.Unmarshal(jsonData, &result); err != nil {
        panic(err)
    }
    
    // Access values with type assertions
    name := result["name"].(string)
    age := result["age"].(float64) // JSON numbers are float64
    active := result["active"].(bool)
    
    fmt.Printf("Name: %s, Age: %.0f, Active: %v\n", name, age, active)
    // Output: Name: Alice, Age: 30, Active: true
}
```

---

## Type Assertions for Dynamic Values

JSON unmarshals to specific Go types:

| JSON Type | Go Type |
|-----------|---------|
| string | `string` |
| number | `float64` |
| boolean | `bool` |
| array | `[]interface{}` |
| object | `map[string]interface{}` |
| null | `nil` |

### Safe Type Assertions

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    jsonData := []byte(`{"value": 42}`)
    
    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)
    
    // Unsafe - panics if wrong type
    // value := data["value"].(string)
    
    // Safe - returns ok=false if wrong type
    if value, ok := data["value"].(float64); ok {
        fmt.Printf("Number: %.0f\n", value)
    } else {
        fmt.Println("value is not a number")
    }
    
    // Check for missing keys
    if missing, ok := data["missing"]; ok {
        fmt.Printf("Found: %v\n", missing)
    } else {
        fmt.Println("Key 'missing' not found")
    }
}
```

---

## Approach 2: Using json.RawMessage

When you need to delay parsing or handle parts differently:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Event struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"` // Parse later based on Type
}

type UserCreated struct {
    UserID string `json:"userId"`
    Email  string `json:"email"`
}

type OrderPlaced struct {
    OrderID string  `json:"orderId"`
    Total   float64 `json:"total"`
}

func main() {
    events := []byte(`[
        {"type": "user.created", "payload": {"userId": "123", "email": "alice@example.com"}},
        {"type": "order.placed", "payload": {"orderId": "456", "total": 99.99}}
    ]`)
    
    var eventList []Event
    json.Unmarshal(events, &eventList)
    
    for _, event := range eventList {
        switch event.Type {
        case "user.created":
            var user UserCreated
            json.Unmarshal(event.Payload, &user)
            fmt.Printf("User created: %s (%s)\n", user.UserID, user.Email)
            
        case "order.placed":
            var order OrderPlaced
            json.Unmarshal(event.Payload, &order)
            fmt.Printf("Order placed: %s ($%.2f)\n", order.OrderID, order.Total)
        }
    }
}
```

---

## Approach 3: Using any (interface{})

For completely unknown JSON:

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    jsonData := []byte(`[1, "two", true, null, {"nested": "value"}]`)
    
    var data any // Same as interface{}
    json.Unmarshal(jsonData, &data)
    
    // Process based on actual type
    processValue(data, 0)
}

func processValue(v any, depth int) {
    indent := ""
    for i := 0; i < depth; i++ {
        indent += "  "
    }
    
    switch value := v.(type) {
    case nil:
        fmt.Printf("%snull\n", indent)
        
    case bool:
        fmt.Printf("%sbool: %v\n", indent, value)
        
    case float64:
        fmt.Printf("%snumber: %v\n", indent, value)
        
    case string:
        fmt.Printf("%sstring: %q\n", indent, value)
        
    case []interface{}:
        fmt.Printf("%sarray:\n", indent)
        for _, item := range value {
            processValue(item, depth+1)
        }
        
    case map[string]interface{}:
        fmt.Printf("%sobject:\n", indent)
        for key, val := range value {
            fmt.Printf("%s  %s:\n", indent, key)
            processValue(val, depth+2)
        }
    }
}
```

---

## Helper Functions for Safe Access

Create utility functions for common access patterns:

```go
package main

import (
    "encoding/json"
    "fmt"
)

// GetString safely extracts a string from a map
func GetString(m map[string]interface{}, key string) (string, bool) {
    if v, ok := m[key]; ok {
        if s, ok := v.(string); ok {
            return s, true
        }
    }
    return "", false
}

// GetInt safely extracts an integer from a map
func GetInt(m map[string]interface{}, key string) (int, bool) {
    if v, ok := m[key]; ok {
        if f, ok := v.(float64); ok {
            return int(f), true
        }
    }
    return 0, false
}

// GetBool safely extracts a boolean from a map
func GetBool(m map[string]interface{}, key string) (bool, bool) {
    if v, ok := m[key]; ok {
        if b, ok := v.(bool); ok {
            return b, true
        }
    }
    return false, false
}

// GetMap safely extracts a nested map
func GetMap(m map[string]interface{}, key string) (map[string]interface{}, bool) {
    if v, ok := m[key]; ok {
        if nested, ok := v.(map[string]interface{}); ok {
            return nested, true
        }
    }
    return nil, false
}

// GetSlice safely extracts a slice
func GetSlice(m map[string]interface{}, key string) ([]interface{}, bool) {
    if v, ok := m[key]; ok {
        if slice, ok := v.([]interface{}); ok {
            return slice, true
        }
    }
    return nil, false
}

func main() {
    jsonData := []byte(`{
        "user": {
            "name": "Alice",
            "age": 30,
            "verified": true,
            "roles": ["admin", "user"]
        }
    }`)
    
    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)
    
    if user, ok := GetMap(data, "user"); ok {
        name, _ := GetString(user, "name")
        age, _ := GetInt(user, "age")
        verified, _ := GetBool(user, "verified")
        roles, _ := GetSlice(user, "roles")
        
        fmt.Printf("Name: %s, Age: %d, Verified: %v\n", name, age, verified)
        fmt.Printf("Roles: %v\n", roles)
    }
}
```

---

## Approach 4: Combining Known and Unknown Fields

When some fields are known but extras may exist:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Config struct {
    Version string `json:"version"`
    Name    string `json:"name"`
    
    // Capture all extra fields
    Extra map[string]interface{} `json:"-"`
}

func (c *Config) UnmarshalJSON(data []byte) error {
    // First, unmarshal known fields
    type ConfigAlias Config
    alias := (*ConfigAlias)(c)
    if err := json.Unmarshal(data, alias); err != nil {
        return err
    }
    
    // Then, unmarshal everything to capture extras
    var raw map[string]interface{}
    if err := json.Unmarshal(data, &raw); err != nil {
        return err
    }
    
    // Remove known fields, keep the rest
    delete(raw, "version")
    delete(raw, "name")
    c.Extra = raw
    
    return nil
}

func main() {
    jsonData := []byte(`{
        "version": "1.0",
        "name": "myapp",
        "customSetting": true,
        "debug": {"level": "verbose"}
    }`)
    
    var config Config
    json.Unmarshal(jsonData, &config)
    
    fmt.Printf("Version: %s\n", config.Version)
    fmt.Printf("Name: %s\n", config.Name)
    fmt.Printf("Extra fields: %+v\n", config.Extra)
    // Output:
    // Version: 1.0
    // Name: myapp
    // Extra fields: map[customSetting:true debug:map[level:verbose]]
}
```

---

## Approach 5: Using the Decoder for Streaming

For large JSON or when you need more control:

```go
package main

import (
    "encoding/json"
    "fmt"
    "strings"
)

func main() {
    jsonStream := `{"name": "Alice"}{"name": "Bob"}{"name": "Charlie"}`
    
    decoder := json.NewDecoder(strings.NewReader(jsonStream))
    
    for decoder.More() {
        var obj map[string]interface{}
        if err := decoder.Decode(&obj); err != nil {
            break
        }
        fmt.Printf("Parsed: %v\n", obj)
    }
}
```

---

## Working with JSON Arrays of Mixed Types

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    // Array with mixed types
    jsonData := []byte(`[
        {"type": "text", "content": "Hello"},
        {"type": "image", "url": "http://example.com/img.png", "width": 100},
        {"type": "link", "href": "http://example.com", "text": "Click here"}
    ]`)
    
    var items []map[string]interface{}
    json.Unmarshal(jsonData, &items)
    
    for i, item := range items {
        itemType, _ := item["type"].(string)
        
        switch itemType {
        case "text":
            content, _ := item["content"].(string)
            fmt.Printf("%d. Text: %s\n", i+1, content)
            
        case "image":
            url, _ := item["url"].(string)
            width, _ := item["width"].(float64)
            fmt.Printf("%d. Image: %s (width: %.0f)\n", i+1, url, width)
            
        case "link":
            href, _ := item["href"].(string)
            text, _ := item["text"].(string)
            fmt.Printf("%d. Link: %s -> %s\n", i+1, text, href)
        }
    }
}
```

---

## Pattern: JSON Path-like Access

For deeply nested access:

```go
package main

import (
    "encoding/json"
    "fmt"
    "strings"
)

// GetPath retrieves a value at the given dot-separated path
func GetPath(data interface{}, path string) (interface{}, bool) {
    parts := strings.Split(path, ".")
    current := data
    
    for _, part := range parts {
        switch v := current.(type) {
        case map[string]interface{}:
            var ok bool
            current, ok = v[part]
            if !ok {
                return nil, false
            }
        default:
            return nil, false
        }
    }
    
    return current, true
}

func main() {
    jsonData := []byte(`{
        "response": {
            "data": {
                "user": {
                    "profile": {
                        "name": "Alice"
                    }
                }
            }
        }
    }`)
    
    var data interface{}
    json.Unmarshal(jsonData, &data)
    
    // Access nested value with path
    if name, ok := GetPath(data, "response.data.user.profile.name"); ok {
        fmt.Printf("Name: %s\n", name)
    }
}
```

---

## Error Handling Patterns

```go
package main

import (
    "encoding/json"
    "fmt"
)

type ParseError struct {
    Field   string
    Message string
}

func (e ParseError) Error() string {
    return fmt.Sprintf("field %q: %s", e.Field, e.Message)
}

func parseUser(data map[string]interface{}) (string, int, error) {
    name, ok := data["name"].(string)
    if !ok {
        return "", 0, ParseError{Field: "name", Message: "expected string"}
    }
    
    ageFloat, ok := data["age"].(float64)
    if !ok {
        return "", 0, ParseError{Field: "age", Message: "expected number"}
    }
    
    return name, int(ageFloat), nil
}

func main() {
    // Valid JSON
    jsonData := []byte(`{"name": "Alice", "age": 30}`)
    var data map[string]interface{}
    json.Unmarshal(jsonData, &data)
    
    name, age, err := parseUser(data)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("User: %s, Age: %d\n", name, age)
    
    // Invalid JSON
    jsonData2 := []byte(`{"name": 123, "age": "thirty"}`)
    json.Unmarshal(jsonData2, &data)
    
    _, _, err = parseUser(data)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
    }
}
```

---

## Summary

When dealing with dynamic JSON in Go:

| Approach | Use Case | Flexibility |
|----------|----------|-------------|
| `map[string]interface{}` | Unknown structure | High |
| `json.RawMessage` | Partial/delayed parsing | Medium |
| Custom UnmarshalJSON | Known + unknown fields | Medium |
| Type switch | Mixed types | High |
| Helper functions | Clean API access | High |

**Key Points:**

1. JSON numbers always unmarshal to `float64`
2. Use two-value type assertions (`v, ok := x.(T)`) to avoid panics
3. `json.RawMessage` lets you defer parsing
4. Create helper functions for clean, repeated access patterns
5. Consider using third-party libraries like `gjson` for complex queries

---

*Processing dynamic JSON from various APIs? [OneUptime](https://oneuptime.com) helps you monitor your services and track API response times with distributed tracing.*
