# How to Fix json.Marshal Returning "{}" for Structs in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, JSON, Marshaling, Struct, Common Errors

Description: Discover why json.Marshal returns an empty object for your Go structs and learn the fixes for unexported fields, nil pointers, and other common causes.

---

One of the most frustrating issues Go developers encounter is `json.Marshal` returning `"{}"` for a struct that clearly has data. This usually happens silently without any error, leaving you puzzled. Let's explore all the reasons this occurs and how to fix each one.

---

## The Most Common Cause: Unexported Fields

Go's `encoding/json` package can only see exported fields (those starting with an uppercase letter). This is the number one reason for empty JSON output:

```go
package main

import (
    "encoding/json"
    "fmt"
)

// BROKEN: All fields are unexported (lowercase)
type brokenUser struct {
    id    int
    name  string
    email string
}

// FIXED: All fields are exported (uppercase)
type User struct {
    ID    int
    Name  string
    Email string
}

func main() {
    // This produces "{}" because fields are unexported
    broken := brokenUser{id: 1, name: "John", email: "john@example.com"}
    data, _ := json.Marshal(broken)
    fmt.Println("Broken:", string(data)) // Broken: {}
    
    // This works correctly
    fixed := User{ID: 1, Name: "John", Email: "john@example.com"}
    data, _ = json.Marshal(fixed)
    fmt.Println("Fixed:", string(data)) 
    // Fixed: {"ID":1,"Name":"John","Email":"john@example.com"}
}
```

**The fix:** Always use uppercase first letters for fields you want to serialize.

---

## Using JSON Tags with Exported Fields

You can have uppercase Go field names while using lowercase JSON keys:

```go
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    user := User{ID: 1, Name: "John", Email: "john@example.com"}
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // {"id":1,"name":"john@example.com","email":"john@example.com"}
}
```

---

## Nil Pointers in Nested Structs

If you have pointer fields that are nil, they serialize as `null`, but if the entire struct is a nil pointer, you might get unexpected results:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Address struct {
    City    string `json:"city"`
    Country string `json:"country"`
}

type User struct {
    Name    string   `json:"name"`
    Address *Address `json:"address"`
}

func main() {
    // Nil address becomes null in JSON
    user1 := User{Name: "John", Address: nil}
    data, _ := json.Marshal(user1)
    fmt.Println("Nil address:", string(data))
    // Nil address: {"name":"John","address":null}
    
    // With address populated
    user2 := User{
        Name:    "Jane",
        Address: &Address{City: "New York", Country: "USA"},
    }
    data, _ = json.Marshal(user2)
    fmt.Println("With address:", string(data))
    // With address: {"name":"Jane","address":{"city":"New York","country":"USA"}}
}
```

---

## Empty Structs and omitempty

The `omitempty` tag option can cause fields to disappear from JSON output:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Response struct {
    Status  string   `json:"status"`
    Data    []string `json:"data,omitempty"`    // Omitted when nil or empty slice
    Count   int      `json:"count,omitempty"`   // Omitted when 0
    Message string   `json:"message,omitempty"` // Omitted when ""
}

func main() {
    // All omitempty fields have zero values
    resp := Response{Status: "ok"}
    data, _ := json.Marshal(resp)
    fmt.Println("Minimal:", string(data))
    // Minimal: {"status":"ok"}
    
    // With some values populated
    resp2 := Response{
        Status:  "ok",
        Data:    []string{"item1", "item2"},
        Count:   2,
        Message: "",  // Still omitted because empty string
    }
    data, _ = json.Marshal(resp2)
    fmt.Println("Populated:", string(data))
    // Populated: {"status":"ok","data":["item1","item2"],"count":2}
}
```

**Note:** Zero values with `omitempty`:
- `int`, `float`: 0
- `string`: ""
- `bool`: false
- `slice`, `map`, `pointer`: nil
- `array`: not omitted (even if all zeros)

---

## Embedded Structs Gotcha

Embedding works with JSON, but field name conflicts can cause issues:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Timestamp struct {
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
}

type User struct {
    Timestamp           // Embedded - fields promoted
    Name      string    `json:"name"`
    CreatedAt string    `json:"created_at"` // Conflict with embedded field!
}

func main() {
    user := User{
        Timestamp: Timestamp{
            CreatedAt: "2024-01-01",
            UpdatedAt: "2024-01-02",
        },
        Name:      "John",
        CreatedAt: "2024-01-03", // This shadows the embedded field
    }
    
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // The outer CreatedAt takes precedence
}
```

---

## Custom MarshalJSON Returning Empty

If you implement `MarshalJSON`, mistakes there can cause empty output:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name  string
    Email string
}

// BROKEN: Returns empty JSON
func (u User) MarshalJSONBroken() ([]byte, error) {
    // Forgetting to actually marshal anything
    return []byte("{}"), nil
}

// FIXED: Properly marshal the data
func (u User) MarshalJSON() ([]byte, error) {
    // Create an alias to avoid infinite recursion
    type UserAlias User
    return json.Marshal(&struct {
        UserAlias
        DisplayName string `json:"display_name"`
    }{
        UserAlias:   UserAlias(u),
        DisplayName: u.Name + " <" + u.Email + ">",
    })
}

func main() {
    user := User{Name: "John", Email: "john@example.com"}
    data, _ := json.Marshal(user)
    fmt.Println(string(data))
    // {"Name":"John","Email":"john@example.com","display_name":"John <john@example.com>"}
}
```

---

## Interface{} Fields with Unexported Concrete Types

When using `interface{}` fields, the concrete type must have exported fields:

```go
package main

import (
    "encoding/json"
    "fmt"
)

// unexported type
type secretData struct {
    value string
}

// exported type
type PublicData struct {
    Value string `json:"value"`
}

type Container struct {
    Data interface{} `json:"data"`
}

func main() {
    // Using unexported type - produces empty object for data
    c1 := Container{Data: secretData{value: "secret"}}
    data, _ := json.Marshal(c1)
    fmt.Println("Unexported:", string(data))
    // Unexported: {"data":{}}
    
    // Using exported type - works correctly
    c2 := Container{Data: PublicData{Value: "public"}}
    data, _ = json.Marshal(c2)
    fmt.Println("Exported:", string(data))
    // Exported: {"data":{"value":"public"}}
}
```

---

## Maps with Non-String Keys

Maps are only marshaled if the key type can be represented as a JSON string:

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    // String keys work
    stringMap := map[string]int{"one": 1, "two": 2}
    data, err := json.Marshal(stringMap)
    fmt.Println("String keys:", string(data), err)
    // String keys: {"one":1,"two":2} <nil>
    
    // Int keys also work (converted to strings)
    intMap := map[int]string{1: "one", 2: "two"}
    data, err = json.Marshal(intMap)
    fmt.Println("Int keys:", string(data), err)
    // Int keys: {"1":"one","2":"two"} <nil>
    
    // Struct keys don't work
    type Key struct{ X, Y int }
    structMap := map[Key]string{{1, 2}: "point"}
    data, err = json.Marshal(structMap)
    fmt.Println("Struct keys:", string(data), err)
    // Struct keys: <nil> json: unsupported type: map[main.Key]string
}
```

---

## Debugging Empty JSON Output

Here's a helper function to diagnose JSON marshaling issues:

```go
package main

import (
    "encoding/json"
    "fmt"
    "reflect"
)

func debugJSONFields(v interface{}) {
    t := reflect.TypeOf(v)
    val := reflect.ValueOf(v)
    
    if t.Kind() == reflect.Ptr {
        t = t.Elem()
        val = val.Elem()
    }
    
    fmt.Printf("Type: %s\n", t.Name())
    fmt.Println("Fields:")
    
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        value := val.Field(i)
        
        exported := field.PkgPath == "" // Empty PkgPath means exported
        jsonTag := field.Tag.Get("json")
        
        fmt.Printf("  %s:\n", field.Name)
        fmt.Printf("    Exported: %v\n", exported)
        fmt.Printf("    Type: %s\n", field.Type)
        fmt.Printf("    JSON tag: %q\n", jsonTag)
        fmt.Printf("    Value: %v\n", value.Interface())
        fmt.Printf("    Is Zero: %v\n", value.IsZero())
        
        if !exported {
            fmt.Printf("    WARNING: Field is unexported and won't be marshaled!\n")
        }
        if jsonTag == "-" {
            fmt.Printf("    WARNING: Field is explicitly ignored in JSON!\n")
        }
        fmt.Println()
    }
}

type User struct {
    ID       int    `json:"id"`
    name     string `json:"name"` // unexported!
    Email    string `json:"email"`
    Password string `json:"-"` // explicitly ignored
}

func main() {
    user := User{ID: 1, name: "John", Email: "john@example.com", Password: "secret"}
    
    debugJSONFields(user)
    
    data, _ := json.Marshal(user)
    fmt.Println("JSON output:", string(data))
}
```

---

## Quick Checklist

When `json.Marshal` returns `"{}"`, check these in order:

1. **Are all fields exported?** Field names must start with uppercase
2. **Are you marshaling a pointer to nil?** Check for nil pointers
3. **Is omitempty hiding zero values?** Remove omitempty to see all fields
4. **Do you have a custom MarshalJSON?** Check its implementation
5. **Are embedded structs conflicting?** Check for duplicate field names
6. **Is the concrete type of interface{} exported?** Check the actual type stored

---

## Summary

The empty JSON object `"{}"` from `json.Marshal` is almost always caused by unexported fields. Here's the fix pattern:

```go
// Instead of this:
type user struct {
    id    int
    name  string
}

// Do this:
type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}
```

Remember:
- Uppercase first letter = exported = visible to json package
- Use JSON tags for custom key names
- Debug with reflection if you're stuck

---

*Monitoring your Go APIs? [OneUptime](https://oneuptime.com) tracks response times, error rates, and can alert you when your JSON endpoints start misbehaving.*
