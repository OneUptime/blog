# How to Implement Enums in Go Without Enum Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Enums, iota, Type Safety, Constants, Patterns

Description: Learn idiomatic patterns for implementing enum-like types in Go using constants, iota, and type definitions for type-safe, self-documenting code.

---

Go doesn't have a built-in enum keyword, but you can create type-safe enumerations using constants and custom types. This guide covers idiomatic patterns that give you the benefits of enums with Go's simplicity.

---

## Basic Enum Pattern

The most common pattern uses `iota` with a custom type:

```go
package main

import "fmt"

// Define enum type
type Status int

// Define enum values
const (
    StatusPending Status = iota // 0
    StatusActive                // 1
    StatusCompleted             // 2
    StatusFailed                // 3
)

func main() {
    var s Status = StatusActive
    fmt.Printf("Status: %d\n", s) // Status: 1
}
```

---

## Adding String Representation

Make your enums print nicely:

```go
package main

import "fmt"

type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusCompleted
    StatusFailed
)

// String implements fmt.Stringer
func (s Status) String() string {
    switch s {
    case StatusPending:
        return "Pending"
    case StatusActive:
        return "Active"
    case StatusCompleted:
        return "Completed"
    case StatusFailed:
        return "Failed"
    default:
        return fmt.Sprintf("Unknown(%d)", s)
    }
}

func main() {
    var s Status = StatusActive
    fmt.Printf("Status: %s\n", s) // Status: Active
    fmt.Println(StatusFailed)     // Failed
}
```

---

## Using Slice for String Lookup

For many values, a slice is cleaner than switch:

```go
package main

import "fmt"

type Day int

const (
    Sunday Day = iota
    Monday
    Tuesday
    Wednesday
    Thursday
    Friday
    Saturday
)

var dayNames = [...]string{
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
}

func (d Day) String() string {
    if d < Sunday || d > Saturday {
        return fmt.Sprintf("Day(%d)", d)
    }
    return dayNames[d]
}

func main() {
    fmt.Println(Monday)    // Monday
    fmt.Println(Friday)    // Friday
    fmt.Println(Day(100))  // Day(100)
}
```

---

## String-Based Enums

When string representation is more important than numeric values:

```go
package main

import "fmt"

type Color string

const (
    ColorRed    Color = "red"
    ColorGreen  Color = "green"
    ColorBlue   Color = "blue"
    ColorYellow Color = "yellow"
)

func (c Color) String() string {
    return string(c)
}

// IsValid checks if the color is a known value
func (c Color) IsValid() bool {
    switch c {
    case ColorRed, ColorGreen, ColorBlue, ColorYellow:
        return true
    }
    return false
}

func main() {
    c := ColorRed
    fmt.Println(c)           // red
    fmt.Println(c.IsValid()) // true
    
    invalid := Color("purple")
    fmt.Println(invalid.IsValid()) // false
}
```

---

## JSON Serialization

Make enums work with JSON:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Priority int

const (
    PriorityLow Priority = iota
    PriorityMedium
    PriorityHigh
    PriorityCritical
)

var priorityNames = map[Priority]string{
    PriorityLow:      "low",
    PriorityMedium:   "medium",
    PriorityHigh:     "high",
    PriorityCritical: "critical",
}

var priorityValues = map[string]Priority{
    "low":      PriorityLow,
    "medium":   PriorityMedium,
    "high":     PriorityHigh,
    "critical": PriorityCritical,
}

func (p Priority) String() string {
    if name, ok := priorityNames[p]; ok {
        return name
    }
    return fmt.Sprintf("Priority(%d)", p)
}

func (p Priority) MarshalJSON() ([]byte, error) {
    return json.Marshal(p.String())
}

func (p *Priority) UnmarshalJSON(data []byte) error {
    var s string
    if err := json.Unmarshal(data, &s); err != nil {
        return err
    }
    
    if val, ok := priorityValues[s]; ok {
        *p = val
        return nil
    }
    
    return fmt.Errorf("invalid priority: %s", s)
}

type Task struct {
    Name     string   `json:"name"`
    Priority Priority `json:"priority"`
}

func main() {
    task := Task{
        Name:     "Fix bug",
        Priority: PriorityHigh,
    }
    
    // Marshal to JSON
    data, _ := json.Marshal(task)
    fmt.Println(string(data))
    // {"name":"Fix bug","priority":"high"}
    
    // Unmarshal from JSON
    jsonStr := `{"name":"New feature","priority":"medium"}`
    var newTask Task
    json.Unmarshal([]byte(jsonStr), &newTask)
    fmt.Printf("Task: %s, Priority: %s\n", newTask.Name, newTask.Priority)
}
```

---

## Bitwise Flag Enums

For combinable options:

```go
package main

import (
    "fmt"
    "strings"
)

type Permission uint

const (
    PermNone    Permission = 0
    PermRead    Permission = 1 << iota // 1
    PermWrite                          // 2
    PermExecute                        // 4
    PermDelete                         // 8
    
    // Convenience combinations
    PermReadWrite = PermRead | PermWrite
    PermAll       = PermRead | PermWrite | PermExecute | PermDelete
)

func (p Permission) Has(flag Permission) bool {
    return p&flag == flag
}

func (p Permission) String() string {
    if p == PermNone {
        return "none"
    }
    
    var perms []string
    if p.Has(PermRead) {
        perms = append(perms, "read")
    }
    if p.Has(PermWrite) {
        perms = append(perms, "write")
    }
    if p.Has(PermExecute) {
        perms = append(perms, "execute")
    }
    if p.Has(PermDelete) {
        perms = append(perms, "delete")
    }
    
    return strings.Join(perms, ", ")
}

func main() {
    user := PermRead | PermWrite
    admin := PermAll
    
    fmt.Printf("User: %s\n", user)   // User: read, write
    fmt.Printf("Admin: %s\n", admin) // Admin: read, write, execute, delete
    
    fmt.Printf("User can write: %v\n", user.Has(PermWrite))     // true
    fmt.Printf("User can delete: %v\n", user.Has(PermDelete))   // false
    fmt.Printf("Admin can delete: %v\n", admin.Has(PermDelete)) // true
}
```

---

## Enum Validation

Ensure only valid values are used:

```go
package main

import (
    "errors"
    "fmt"
)

type Size int

const (
    SizeSmall Size = iota
    SizeMedium
    SizeLarge
    SizeXLarge
    sizeCount // unexported, marks end of valid values
)

var ErrInvalidSize = errors.New("invalid size")

func (s Size) IsValid() bool {
    return s >= SizeSmall && s < sizeCount
}

func (s Size) String() string {
    names := [...]string{"Small", "Medium", "Large", "XLarge"}
    if !s.IsValid() {
        return fmt.Sprintf("Size(%d)", s)
    }
    return names[s]
}

func ParseSize(s string) (Size, error) {
    sizes := map[string]Size{
        "small":  SizeSmall,
        "medium": SizeMedium,
        "large":  SizeLarge,
        "xlarge": SizeXLarge,
    }
    
    if size, ok := sizes[s]; ok {
        return size, nil
    }
    return 0, ErrInvalidSize
}

func processOrder(size Size) error {
    if !size.IsValid() {
        return fmt.Errorf("invalid size: %d", size)
    }
    fmt.Printf("Processing order for size: %s\n", size)
    return nil
}

func main() {
    // Valid usage
    processOrder(SizeMedium)
    
    // Parse from string
    s, err := ParseSize("large")
    if err == nil {
        processOrder(s)
    }
    
    // Invalid value detected
    if err := processOrder(Size(100)); err != nil {
        fmt.Println("Error:", err)
    }
}
```

---

## Enum with Associated Data

When enum values need additional information:

```go
package main

import "fmt"

type HTTPStatus int

const (
    StatusOK                  HTTPStatus = 200
    StatusCreated             HTTPStatus = 201
    StatusBadRequest          HTTPStatus = 400
    StatusUnauthorized        HTTPStatus = 401
    StatusNotFound            HTTPStatus = 404
    StatusInternalServerError HTTPStatus = 500
)

type statusInfo struct {
    code    HTTPStatus
    message string
    isError bool
}

var statusInfoMap = map[HTTPStatus]statusInfo{
    StatusOK:                  {StatusOK, "OK", false},
    StatusCreated:             {StatusCreated, "Created", false},
    StatusBadRequest:          {StatusBadRequest, "Bad Request", true},
    StatusUnauthorized:        {StatusUnauthorized, "Unauthorized", true},
    StatusNotFound:            {StatusNotFound, "Not Found", true},
    StatusInternalServerError: {StatusInternalServerError, "Internal Server Error", true},
}

func (s HTTPStatus) Code() int {
    return int(s)
}

func (s HTTPStatus) Message() string {
    if info, ok := statusInfoMap[s]; ok {
        return info.message
    }
    return "Unknown"
}

func (s HTTPStatus) IsError() bool {
    if info, ok := statusInfoMap[s]; ok {
        return info.isError
    }
    return true
}

func (s HTTPStatus) String() string {
    return fmt.Sprintf("%d %s", s.Code(), s.Message())
}

func main() {
    status := StatusNotFound
    
    fmt.Println(status)           // 404 Not Found
    fmt.Println(status.Code())    // 404
    fmt.Println(status.Message()) // Not Found
    fmt.Println(status.IsError()) // true
    
    fmt.Println(StatusOK.IsError()) // false
}
```

---

## All Enum Values

List all possible values:

```go
package main

import "fmt"

type LogLevel int

const (
    LogDebug LogLevel = iota
    LogInfo
    LogWarn
    LogError
    LogFatal
    logLevelCount // sentinel
)

var logLevelNames = [...]string{
    "DEBUG",
    "INFO",
    "WARN",
    "ERROR",
    "FATAL",
}

func (l LogLevel) String() string {
    if l >= 0 && l < logLevelCount {
        return logLevelNames[l]
    }
    return fmt.Sprintf("LogLevel(%d)", l)
}

// AllLogLevels returns all valid log levels
func AllLogLevels() []LogLevel {
    levels := make([]LogLevel, logLevelCount)
    for i := range levels {
        levels[i] = LogLevel(i)
    }
    return levels
}

func main() {
    fmt.Println("All log levels:")
    for _, level := range AllLogLevels() {
        fmt.Printf("  %d: %s\n", level, level)
    }
}
```

---

## Code Generation with stringer

For many enums, use the `stringer` tool:

```bash
go install golang.org/x/tools/cmd/stringer@latest
```

```go
//go:generate stringer -type=Status

package main

type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusCompleted
    StatusFailed
)
```

Run:

```bash
go generate ./...
```

This creates `status_string.go` with the `String()` method.

---

## Summary

Go enum patterns comparison:

| Pattern | Type Safety | JSON | Flags | Use Case |
|---------|-------------|------|-------|----------|
| int + iota | Good | Manual | Yes | Most cases |
| string const | Good | Auto | No | Human-readable |
| Bitwise | Good | Manual | Yes | Permissions |

**Best Practices:**

1. Always use a custom type (not bare int/string)
2. Implement `String()` for debugging
3. Use unexported sentinel for validation
4. Implement `MarshalJSON`/`UnmarshalJSON` when needed
5. Consider `stringer` for many enums
6. Use bitwise for combinable flags

---

*Building Go applications with clean enum patterns? [OneUptime](https://oneuptime.com) provides comprehensive monitoring to help you debug issues in production.*
