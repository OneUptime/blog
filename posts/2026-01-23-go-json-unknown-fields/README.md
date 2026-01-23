# How to Unmarshal JSON with Unknown Fields in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, JSON, Unmarshal, Unknown Fields, API, Parsing

Description: Learn techniques to handle JSON with extra unknown fields in Go, including how to capture, validate, and process unexpected data while maintaining type safety.

---

When consuming external APIs or handling user input, you'll often receive JSON with fields you don't know about or don't care about. Go's `encoding/json` package provides several ways to handle this gracefully.

---

## Default Behavior: Unknown Fields Are Ignored

By default, Go ignores JSON fields that don't match struct fields:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    // JSON has extra fields not in struct
    jsonData := []byte(`{
        "name": "Alice",
        "email": "alice@example.com",
        "age": 30,
        "department": "Engineering",
        "active": true
    }`)
    
    var user User
    if err := json.Unmarshal(jsonData, &user); err != nil {
        panic(err)
    }
    
    // Only name and email are populated
    fmt.Printf("Name: %s, Email: %s\n", user.Name, user.Email)
    // age, department, and active are silently ignored
}
```

---

## Disallowing Unknown Fields

Use `DisallowUnknownFields()` when you want strict parsing:

```go
package main

import (
    "encoding/json"
    "fmt"
    "strings"
)

type Config struct {
    Host string `json:"host"`
    Port int    `json:"port"`
}

func main() {
    // JSON with typo or unknown field
    jsonData := `{
        "host": "localhost",
        "port": 8080,
        "pont": 9000
    }`
    
    var config Config
    decoder := json.NewDecoder(strings.NewReader(jsonData))
    decoder.DisallowUnknownFields()
    
    if err := decoder.Decode(&config); err != nil {
        fmt.Printf("Error: %v\n", err)
        // Error: json: unknown field "pont"
        return
    }
    
    fmt.Printf("Config: %+v\n", config)
}
```

This is useful for:

- Configuration validation
- API request validation
- Catching typos early

---

## Capturing Unknown Fields

To preserve unknown fields, use a custom struct with `json.RawMessage`:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name    string `json:"name"`
    Email   string `json:"email"`
    Extra   map[string]json.RawMessage `json:"-"` // Captures unknown fields
}

func (u *User) UnmarshalJSON(data []byte) error {
    // Define an alias to avoid recursion
    type UserAlias User
    alias := &struct {
        *UserAlias
    }{
        UserAlias: (*UserAlias)(u),
    }
    
    // First, unmarshal known fields
    if err := json.Unmarshal(data, alias); err != nil {
        return err
    }
    
    // Then, unmarshal everything to capture all fields
    var raw map[string]json.RawMessage
    if err := json.Unmarshal(data, &raw); err != nil {
        return err
    }
    
    // Remove known fields
    delete(raw, "name")
    delete(raw, "email")
    
    // Store the rest as extra
    u.Extra = raw
    
    return nil
}

func main() {
    jsonData := []byte(`{
        "name": "Alice",
        "email": "alice@example.com",
        "age": 30,
        "preferences": {"theme": "dark"},
        "tags": ["admin", "verified"]
    }`)
    
    var user User
    if err := json.Unmarshal(jsonData, &user); err != nil {
        panic(err)
    }
    
    fmt.Printf("Name: %s\n", user.Name)
    fmt.Printf("Email: %s\n", user.Email)
    fmt.Printf("Extra fields: %d\n", len(user.Extra))
    
    for key, value := range user.Extra {
        fmt.Printf("  %s: %s\n", key, string(value))
    }
}
```

---

## Pattern: Flexible Document Store

For document-like data where schema varies:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Document struct {
    ID        string                 `json:"id"`
    Type      string                 `json:"type"`
    CreatedAt string                 `json:"createdAt"`
    Fields    map[string]interface{} `json:"-"`
}

func (d *Document) UnmarshalJSON(data []byte) error {
    // Parse everything into a map
    var raw map[string]interface{}
    if err := json.Unmarshal(data, &raw); err != nil {
        return err
    }
    
    // Extract known fields
    if id, ok := raw["id"].(string); ok {
        d.ID = id
        delete(raw, "id")
    }
    if typ, ok := raw["type"].(string); ok {
        d.Type = typ
        delete(raw, "type")
    }
    if createdAt, ok := raw["createdAt"].(string); ok {
        d.CreatedAt = createdAt
        delete(raw, "createdAt")
    }
    
    // Store remaining fields
    d.Fields = raw
    
    return nil
}

func (d *Document) MarshalJSON() ([]byte, error) {
    // Start with extra fields
    result := make(map[string]interface{})
    for k, v := range d.Fields {
        result[k] = v
    }
    
    // Add known fields
    result["id"] = d.ID
    result["type"] = d.Type
    result["createdAt"] = d.CreatedAt
    
    return json.Marshal(result)
}

func main() {
    jsonData := []byte(`{
        "id": "doc-123",
        "type": "invoice",
        "createdAt": "2024-01-15",
        "customer": "Acme Corp",
        "amount": 1500.00,
        "lineItems": [
            {"description": "Widget", "qty": 10, "price": 100},
            {"description": "Gadget", "qty": 5, "price": 100}
        ]
    }`)
    
    var doc Document
    json.Unmarshal(jsonData, &doc)
    
    fmt.Printf("ID: %s, Type: %s\n", doc.ID, doc.Type)
    fmt.Printf("Custom fields:\n")
    for key, value := range doc.Fields {
        fmt.Printf("  %s: %v\n", key, value)
    }
    
    // Round-trip: marshal back to JSON
    output, _ := json.MarshalIndent(doc, "", "  ")
    fmt.Printf("\nRe-serialized:\n%s\n", string(output))
}
```

---

## Using Embedded Structs for Extensions

```go
package main

import (
    "encoding/json"
    "fmt"
)

// Base user struct
type BaseUser struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// Extended user with extra fields captured
type ExtendedUser struct {
    BaseUser
    Extensions map[string]interface{} `json:"-"`
}

func (u *ExtendedUser) UnmarshalJSON(data []byte) error {
    // Unmarshal base fields
    if err := json.Unmarshal(data, &u.BaseUser); err != nil {
        return err
    }
    
    // Capture all fields
    var all map[string]interface{}
    if err := json.Unmarshal(data, &all); err != nil {
        return err
    }
    
    // Remove base fields
    delete(all, "id")
    delete(all, "name")
    delete(all, "email")
    
    u.Extensions = all
    return nil
}

func main() {
    jsonData := []byte(`{
        "id": "user-1",
        "name": "Alice",
        "email": "alice@example.com",
        "role": "admin",
        "permissions": ["read", "write"],
        "metadata": {"source": "import"}
    }`)
    
    var user ExtendedUser
    json.Unmarshal(jsonData, &user)
    
    fmt.Printf("Base: %+v\n", user.BaseUser)
    fmt.Printf("Extensions: %+v\n", user.Extensions)
}
```

---

## Validating JSON Structure

Create a validator that reports all unknown fields:

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
    "strings"
)

// GetJSONTags returns all json tag names for a struct
func GetJSONTags(t reflect.Type) map[string]bool {
    tags := make(map[string]bool)
    
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        
        // Handle embedded structs
        if field.Anonymous {
            for k, v := range GetJSONTags(field.Type) {
                tags[k] = v
            }
            continue
        }
        
        tag := field.Tag.Get("json")
        if tag == "" || tag == "-" {
            continue
        }
        
        // Handle tags like "name,omitempty"
        parts := strings.Split(tag, ",")
        tags[parts[0]] = true
    }
    
    return tags
}

// FindUnknownFields returns fields in JSON that aren't in the struct
func FindUnknownFields[T any](jsonData []byte) ([]string, error) {
    var t T
    knownFields := GetJSONTags(reflect.TypeOf(t))
    
    var raw map[string]interface{}
    if err := json.Unmarshal(jsonData, &raw); err != nil {
        return nil, err
    }
    
    var unknown []string
    for key := range raw {
        if !knownFields[key] {
            unknown = append(unknown, key)
        }
    }
    
    return unknown, nil
}

type APIRequest struct {
    Action  string `json:"action"`
    Target  string `json:"target"`
    Timeout int    `json:"timeout,omitempty"`
}

func main() {
    jsonData := []byte(`{
        "action": "deploy",
        "target": "production",
        "timeout": 300,
        "retries": 3,
        "notfy": "admin@example.com"
    }`)
    
    unknown, err := FindUnknownFields[APIRequest](jsonData)
    if err != nil {
        panic(err)
    }
    
    if len(unknown) > 0 {
        fmt.Printf("Warning: Unknown fields detected: %v\n", unknown)
        fmt.Println("Did you mean 'notify' instead of 'notfy'?")
    }
    
    // Still parse the known fields
    var req APIRequest
    json.Unmarshal(jsonData, &req)
    fmt.Printf("Request: %+v\n", req)
}
```

---

## Handling Versioned APIs

When APIs evolve, handle both old and new fields:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Event struct {
    Type string `json:"type"`
    
    // V1 field (deprecated)
    Data interface{} `json:"data,omitempty"`
    
    // V2 fields (new)
    Payload  interface{} `json:"payload,omitempty"`
    Metadata interface{} `json:"metadata,omitempty"`
    
    // Track version
    version int
}

func (e *Event) UnmarshalJSON(data []byte) error {
    // Define alias to avoid recursion
    type EventAlias Event
    alias := (*EventAlias)(e)
    
    if err := json.Unmarshal(data, alias); err != nil {
        return err
    }
    
    // Determine version based on which fields are present
    if e.Payload != nil {
        e.version = 2
    } else if e.Data != nil {
        e.version = 1
        // Migrate V1 to V2 format internally
        e.Payload = e.Data
        e.Data = nil
    }
    
    return nil
}

func (e *Event) Version() int {
    return e.version
}

func main() {
    // V1 format
    v1JSON := []byte(`{"type": "user.created", "data": {"userId": "123"}}`)
    
    // V2 format
    v2JSON := []byte(`{
        "type": "user.created",
        "payload": {"userId": "123"},
        "metadata": {"source": "api"}
    }`)
    
    var event1, event2 Event
    json.Unmarshal(v1JSON, &event1)
    json.Unmarshal(v2JSON, &event2)
    
    fmt.Printf("V1 Event: type=%s, version=%d, payload=%v\n", 
        event1.Type, event1.Version(), event1.Payload)
    fmt.Printf("V2 Event: type=%s, version=%d, payload=%v\n", 
        event2.Type, event2.Version(), event2.Payload)
}
```

---

## Using mapstructure for Complex Scenarios

For complex cases, consider the `mapstructure` library:

```go
package main

import (
    "encoding/json"
    "fmt"
    
    "github.com/mitchellh/mapstructure"
)

type Config struct {
    Host    string `mapstructure:"host"`
    Port    int    `mapstructure:"port"`
    Extras  map[string]interface{} `mapstructure:",remain"`
}

func main() {
    jsonData := []byte(`{
        "host": "localhost",
        "port": 8080,
        "debug": true,
        "features": ["a", "b", "c"]
    }`)
    
    var raw map[string]interface{}
    json.Unmarshal(jsonData, &raw)
    
    var config Config
    decoder, _ := mapstructure.NewDecoder(&mapstructure.DecoderConfig{
        Result: &config,
    })
    decoder.Decode(raw)
    
    fmt.Printf("Host: %s, Port: %d\n", config.Host, config.Port)
    fmt.Printf("Extras: %+v\n", config.Extras)
}
```

---

## Summary

Strategies for handling unknown JSON fields:

| Approach | Use Case |
|----------|----------|
| Default (ignore) | When extra fields don't matter |
| `DisallowUnknownFields` | Strict validation |
| Custom `UnmarshalJSON` | Capture extras |
| `map[string]interface{}` | Completely dynamic |
| Validation helper | Report unknown fields |

**Best Practices:**

1. Use `DisallowUnknownFields` for configuration and API validation
2. Capture unknown fields when building flexible systems
3. Log or warn about unknown fields for debugging
4. Consider versioned parsing for evolving APIs
5. Use type assertions safely with ok pattern

---

*Building APIs that handle varying JSON structures? [OneUptime](https://oneuptime.com) helps you monitor your services and track API performance with comprehensive observability.*
