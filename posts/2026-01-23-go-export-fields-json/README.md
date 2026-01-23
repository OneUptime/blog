# How to Export Fields for JSON Marshaling in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, JSON, Export, Fields, Marshaling, Best Practices

Description: Learn the rules for exporting Go struct fields for JSON serialization, including naming conventions, tag usage, and patterns for controlling JSON output.

---

In Go, the visibility of struct fields is controlled by their first letter's case. For JSON marshaling to work, fields must be "exported" (public). This guide covers everything you need to know about making your struct fields work with the `encoding/json` package.

---

## The Basic Rule: Uppercase Means Exported

Go's export rule is simple: identifiers starting with an uppercase letter are visible outside the package. For JSON marshaling, this means:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    ID        int    // Exported - will be in JSON
    Name      string // Exported - will be in JSON
    email     string // Not exported - IGNORED by JSON
    password  string // Not exported - IGNORED by JSON
}

func main() {
    user := User{
        ID:       1,
        Name:     "Alice",
        email:    "alice@example.com",
        password: "secret123",
    }
    
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // Output: {"ID":1,"Name":"Alice"}
    // Note: email and password are missing
}
```

---

## Controlling JSON Key Names with Tags

While fields must be exported (uppercase), you can use JSON tags to control the key names in the output:

```go
type User struct {
    ID        int    `json:"id"`         // JSON key: "id"
    FirstName string `json:"first_name"` // JSON key: "first_name"
    LastName  string `json:"lastName"`   // JSON key: "lastName"
    Email     string `json:"email"`      // JSON key: "email"
}

func main() {
    user := User{
        ID:        1,
        FirstName: "Alice",
        LastName:  "Smith",
        Email:     "alice@example.com",
    }
    
    data, _ := json.MarshalIndent(user, "", "  ")
    fmt.Println(string(data))
}
```

Output:
```json
{
  "id": 1,
  "first_name": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com"
}
```

---

## Common Naming Patterns

Here are the most common approaches to JSON field naming:

```go
// Pattern 1: Go style (PascalCase) -> JSON camelCase
type UserCamel struct {
    UserID      int    `json:"userId"`
    FirstName   string `json:"firstName"`
    LastName    string `json:"lastName"`
    EmailAddr   string `json:"emailAddress"`
}

// Pattern 2: Go style -> JSON snake_case (common in REST APIs)
type UserSnake struct {
    UserID      int    `json:"user_id"`
    FirstName   string `json:"first_name"`
    LastName    string `json:"last_name"`
    EmailAddr   string `json:"email_address"`
}

// Pattern 3: No tags (uses Go field names directly)
type UserDirect struct {
    UserID    int
    FirstName string
    LastName  string
    Email     string
}
// Produces: {"UserID":1,"FirstName":"Alice",...}
```

---

## Handling Sensitive Fields

Sometimes you want to export a field for internal use but exclude it from JSON:

```go
type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    
    // Exported for Go code but excluded from JSON
    Password     string `json:"-"`
    SessionToken string `json:"-"`
    
    // Internal tracking (exported for ORM but hidden from JSON)
    CreatedBy int `json:"-"`
}

func main() {
    user := User{
        ID:           1,
        Username:     "alice",
        Email:        "alice@example.com",
        Password:     "hashed_password",
        SessionToken: "abc123",
        CreatedBy:    42,
    }
    
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // {"id":1,"username":"alice","email":"alice@example.com"}
}
```

---

## Separate Types for Different Contexts

A common pattern is having different struct types for different contexts:

```go
package main

import (
    "encoding/json"
    "fmt"
)

// Internal model with all fields
type UserInternal struct {
    ID           int
    Username     string
    Email        string
    PasswordHash string
    Role         string
    CreatedAt    string
    UpdatedAt    string
    DeletedAt    *string
}

// Public API response (safe to expose)
type UserPublic struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
}

// Admin API response (more details)
type UserAdmin struct {
    ID        int    `json:"id"`
    Username  string `json:"username"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    CreatedAt string `json:"created_at"`
}

// Convert internal to public
func (u UserInternal) ToPublic() UserPublic {
    return UserPublic{
        ID:       u.ID,
        Username: u.Username,
    }
}

// Convert internal to admin view
func (u UserInternal) ToAdmin() UserAdmin {
    return UserAdmin{
        ID:        u.ID,
        Username:  u.Username,
        Email:     u.Email,
        Role:      u.Role,
        CreatedAt: u.CreatedAt,
    }
}

func main() {
    // Simulate database record
    internal := UserInternal{
        ID:           1,
        Username:     "alice",
        Email:        "alice@example.com",
        PasswordHash: "$2a$10$...",
        Role:         "admin",
        CreatedAt:    "2024-01-01T00:00:00Z",
        UpdatedAt:    "2024-01-15T12:00:00Z",
    }
    
    // Public endpoint
    publicData, _ := json.Marshal(internal.ToPublic())
    fmt.Println("Public:", string(publicData))
    // Public: {"id":1,"username":"alice"}
    
    // Admin endpoint
    adminData, _ := json.Marshal(internal.ToAdmin())
    fmt.Println("Admin:", string(adminData))
    // Admin: {"id":1,"username":"alice","email":"alice@example.com","role":"admin","created_at":"2024-01-01T00:00:00Z"}
}
```

---

## Embedding and Field Promotion

When you embed a struct, its exported fields are "promoted" to the outer struct:

```go
type Timestamps struct {
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
}

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Timestamps        // Embedded - fields are promoted
}

func main() {
    user := User{
        ID:   1,
        Name: "Alice",
        Timestamps: Timestamps{
            CreatedAt: "2024-01-01",
            UpdatedAt: "2024-01-15",
        },
    }
    
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // {"id":1,"name":"Alice","created_at":"2024-01-01","updated_at":"2024-01-15"}
}
```

To nest embedded structs instead of promoting, give them a field name:

```go
type User struct {
    ID         int        `json:"id"`
    Name       string     `json:"name"`
    Timestamps Timestamps `json:"timestamps"` // Not embedded, nested
}
// Produces: {"id":1,"name":"Alice","timestamps":{"created_at":"2024-01-01","updated_at":"2024-01-15"}}
```

---

## Anonymous Structs for One-Off JSON

For quick transformations, use anonymous structs:

```go
func main() {
    user := User{ID: 1, Name: "Alice", Email: "alice@example.com"}
    
    // Add extra fields for this specific response
    response := struct {
        User
        RequestID string `json:"request_id"`
        Timestamp string `json:"timestamp"`
    }{
        User:      user,
        RequestID: "req-123",
        Timestamp: "2024-01-15T10:30:00Z",
    }
    
    data, _ := json.Marshal(response)
    fmt.Println(string(data))
}
```

---

## Conditional Field Inclusion with omitempty

The `omitempty` tag option excludes fields with zero values:

```go
type UserProfile struct {
    ID          int     `json:"id"`
    Name        string  `json:"name"`
    Bio         string  `json:"bio,omitempty"`          // Omit if ""
    Website     string  `json:"website,omitempty"`      // Omit if ""
    Followers   int     `json:"followers,omitempty"`    // Omit if 0
    IsVerified  bool    `json:"is_verified,omitempty"`  // Omit if false
    Avatar      *string `json:"avatar,omitempty"`       // Omit if nil
}

func main() {
    // Minimal profile
    minimal := UserProfile{
        ID:   1,
        Name: "Alice",
    }
    data, _ := json.Marshal(minimal)
    fmt.Println("Minimal:", string(data))
    // Minimal: {"id":1,"name":"Alice"}
    
    // Full profile
    avatar := "https://example.com/avatar.jpg"
    full := UserProfile{
        ID:         2,
        Name:       "Bob",
        Bio:        "Developer",
        Website:    "https://bob.dev",
        Followers:  1000,
        IsVerified: true,
        Avatar:     &avatar,
    }
    data, _ = json.Marshal(full)
    fmt.Println("Full:", string(data))
}
```

---

## Using Pointers for Optional Fields

Pointers let you distinguish between "not provided" (nil) and "provided but empty":

```go
type UpdateRequest struct {
    Name    *string `json:"name,omitempty"`    // nil = don't update, "" = clear
    Email   *string `json:"email,omitempty"`
    Age     *int    `json:"age,omitempty"`
}

func main() {
    // Only updating name
    name := "New Name"
    update := UpdateRequest{
        Name: &name,
        // Email and Age are nil - not being updated
    }
    
    data, _ := json.Marshal(update)
    fmt.Println(string(data))
    // {"name":"New Name"}
}
```

---

## Field Export Rules Summary

| Field Declaration | Exported? | In JSON? | JSON Key |
|-------------------|-----------|----------|----------|
| `Name string` | Yes | Yes | "Name" |
| `name string` | No | No | - |
| `Name string \`json:"username"\`` | Yes | Yes | "username" |
| `Name string \`json:"-"\`` | Yes | No | - |
| `Name string \`json:",omitempty"\`` | Yes | Sometimes | "Name" |

---

## Best Practices

1. **Always export fields** that need JSON serialization
2. **Use JSON tags** for API-friendly names (snake_case or camelCase)
3. **Use `json:"-"`** for sensitive data that shouldn't be serialized
4. **Create separate types** for different API views
5. **Use `omitempty`** wisely to reduce response size
6. **Document** which fields are required vs optional

```go
// Well-documented struct with clear intentions
type CreateUserRequest struct {
    // Required fields
    Username string `json:"username"` // Required: unique username
    Email    string `json:"email"`    // Required: valid email address
    Password string `json:"password"` // Required: min 8 characters
    
    // Optional fields
    DisplayName string `json:"display_name,omitempty"` // Optional: defaults to username
    Bio         string `json:"bio,omitempty"`          // Optional: max 500 chars
}
```

---

## Summary

Exporting fields for JSON in Go follows simple rules:

1. Use **uppercase first letter** for fields you want in JSON
2. Use **JSON tags** to customize key names
3. Use **`json:"-"`** to exclude sensitive exported fields
4. Use **`omitempty`** to skip zero-value fields
5. Create **separate types** for different API responses

The pattern of exported Go fields + JSON tags gives you full control over your API's JSON format while maintaining Go's encapsulation principles.

---

*Need to monitor your Go API responses? [OneUptime](https://oneuptime.com) provides real-time monitoring for your endpoints with detailed latency tracking and error alerts.*
