# How to Create Custom JSON Marshaler in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, JSON, Serialization, API

Description: Learn how to implement custom JSON marshaling and unmarshaling in Go for complex data types and special formats.

---

Go's `encoding/json` package provides powerful default serialization, but real-world applications often require custom handling for specific data types. Whether you're working with non-standard time formats, enums, or complex nested structures, implementing custom JSON marshalers gives you complete control over your data serialization.

## Understanding the MarshalJSON and UnmarshalJSON Interfaces

Go's JSON package looks for two interfaces when serializing and deserializing data:

```go
type Marshaler interface {
    MarshalJSON() ([]byte, error)
}

type Unmarshaler interface {
    UnmarshalJSON([]byte) error
}
```

Any type implementing these interfaces will have its custom methods called instead of the default behavior. Here's a basic example:

```go
type Status struct {
    Code    int
    Message string
}

func (s Status) MarshalJSON() ([]byte, error) {
    return json.Marshal(map[string]interface{}{
        "status_code":    s.Code,
        "status_message": s.Message,
    })
}

func (s *Status) UnmarshalJSON(data []byte) error {
    var aux struct {
        Code    int    `json:"status_code"`
        Message string `json:"status_message"`
    }
    if err := json.Unmarshal(data, &aux); err != nil {
        return err
    }
    s.Code = aux.Code
    s.Message = aux.Message
    return nil
}
```

## Handling Custom Time Formats

APIs often use non-RFC3339 time formats. Here's how to create a custom time type:

```go
type UnixTimestamp time.Time

func (t UnixTimestamp) MarshalJSON() ([]byte, error) {
    timestamp := time.Time(t).Unix()
    return json.Marshal(timestamp)
}

func (t *UnixTimestamp) UnmarshalJSON(data []byte) error {
    var timestamp int64
    if err := json.Unmarshal(data, &timestamp); err != nil {
        return err
    }
    *t = UnixTimestamp(time.Unix(timestamp, 0))
    return nil
}

type Event struct {
    Name      string        `json:"name"`
    CreatedAt UnixTimestamp `json:"created_at"`
}
```

This allows seamless conversion between Unix timestamps in JSON and Go's `time.Time` internally.

## Enum Serialization with String Values

Enums in Go are typically integers, but APIs often expect string representations:

```go
type Priority int

const (
    PriorityLow Priority = iota
    PriorityMedium
    PriorityHigh
)

var priorityNames = map[Priority]string{
    PriorityLow:    "low",
    PriorityMedium: "medium",
    PriorityHigh:   "high",
}

var priorityValues = map[string]Priority{
    "low":    PriorityLow,
    "medium": PriorityMedium,
    "high":   PriorityHigh,
}

func (p Priority) MarshalJSON() ([]byte, error) {
    name, ok := priorityNames[p]
    if !ok {
        return nil, fmt.Errorf("invalid priority: %d", p)
    }
    return json.Marshal(name)
}

func (p *Priority) UnmarshalJSON(data []byte) error {
    var name string
    if err := json.Unmarshal(data, &name); err != nil {
        return err
    }
    val, ok := priorityValues[name]
    if !ok {
        return fmt.Errorf("invalid priority: %s", name)
    }
    *p = val
    return nil
}
```

## Embedding and Composition Patterns

When embedding structs, you can leverage composition to extend JSON behavior without duplicating fields:

```go
type BaseModel struct {
    ID        string    `json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type User struct {
    BaseModel
    Name  string `json:"name"`
    Email string `json:"email"`
}

// Custom marshaler that adds computed fields
func (u User) MarshalJSON() ([]byte, error) {
    type Alias User // Prevents recursion
    return json.Marshal(struct {
        Alias
        DisplayName string `json:"display_name"`
    }{
        Alias:       Alias(u),
        DisplayName: strings.Title(u.Name),
    })
}
```

The `type Alias` pattern is crucial to avoid infinite recursion when calling `json.Marshal` within your custom marshaler.

## Understanding omitempty Edge Cases

The `omitempty` tag has specific behavior that often surprises developers:

```go
type Config struct {
    Enabled bool           `json:"enabled,omitempty"` // false is omitted!
    Count   int            `json:"count,omitempty"`   // 0 is omitted!
    Items   []string       `json:"items,omitempty"`   // nil is omitted, empty slice is not
    Data    map[string]int `json:"data,omitempty"`    // nil is omitted
}
```

To handle these cases properly, use pointers or custom marshalers:

```go
type Config struct {
    Enabled *bool `json:"enabled,omitempty"` // Only omitted when nil
}

// Or use a custom marshaler for full control
type SmartBool bool

func (b SmartBool) MarshalJSON() ([]byte, error) {
    return json.Marshal(bool(b))
}

// This ensures false is always serialized
type Settings struct {
    Active SmartBool `json:"active"` // No omitempty, always present
}
```

## Practical Example: API Response Wrapper

Here's a complete example combining these techniques:

```go
type APIResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Error     *APIError   `json:"error,omitempty"`
    Timestamp UnixTimestamp `json:"timestamp"`
}

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

func NewSuccessResponse(data interface{}) APIResponse {
    return APIResponse{
        Success:   true,
        Data:      data,
        Timestamp: UnixTimestamp(time.Now()),
    }
}
```

## Conclusion

Custom JSON marshaling in Go provides the flexibility needed to handle real-world API requirements. By implementing the `Marshaler` and `Unmarshaler` interfaces, you can transform data between your internal representations and external JSON formats seamlessly. Remember to use the alias pattern to avoid recursion, handle edge cases with pointers when needed, and consider creating reusable custom types for common patterns like timestamps and enums.
