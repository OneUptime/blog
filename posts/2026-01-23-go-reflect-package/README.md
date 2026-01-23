# How to Use the reflect Package for Advanced Type Inspection in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Reflection, reflect Package, Type Inspection, Metaprogramming

Description: Learn how to use Go's reflect package for runtime type inspection, dynamic value manipulation, and building flexible libraries that work with any type.

---

Go's `reflect` package provides runtime type inspection and manipulation. While you should use it sparingly, it's essential for building serializers, ORMs, validation libraries, and other generic tools.

---

## When to Use Reflection

Use reflection when you need to:

- Work with types unknown at compile time
- Implement serialization (JSON, XML, etc.)
- Build validation frameworks
- Create dependency injection containers
- Write testing utilities

Avoid reflection when:

- Regular interfaces would work
- Generics (Go 1.18+) can solve the problem
- Performance is critical

---

## Basic Concepts: Type and Value

The reflect package has two main types:

```go
package main

import (
    "fmt"
    "reflect"
)

func main() {
    x := 42
    
    // reflect.TypeOf - returns the type
    t := reflect.TypeOf(x)
    fmt.Printf("Type: %v\n", t)           // int
    fmt.Printf("Kind: %v\n", t.Kind())    // int
    
    // reflect.ValueOf - returns the value
    v := reflect.ValueOf(x)
    fmt.Printf("Value: %v\n", v)          // 42
    fmt.Printf("Type: %v\n", v.Type())    // int
    fmt.Printf("Kind: %v\n", v.Kind())    // int
    fmt.Printf("Int: %d\n", v.Int())      // 42
}
```

---

## Type vs Kind

`Type` is the specific type, `Kind` is the category:

```go
package main

import (
    "fmt"
    "reflect"
)

type UserID int
type Point struct{ X, Y int }

func main() {
    var id UserID = 42
    var p Point
    var m map[string]int
    var s []string
    
    examples := []interface{}{id, p, m, s}
    
    for _, ex := range examples {
        t := reflect.TypeOf(ex)
        fmt.Printf("Type: %-20v Kind: %v\n", t, t.Kind())
    }
    // Output:
    // Type: main.UserID          Kind: int
    // Type: main.Point           Kind: struct
    // Type: map[string]int       Kind: map
    // Type: []string             Kind: slice
}
```

---

## Inspecting Structs

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Name     string `json:"name" validate:"required"`
    Email    string `json:"email" validate:"email"`
    Age      int    `json:"age,omitempty"`
    password string // unexported
}

func inspectStruct(v interface{}) {
    t := reflect.TypeOf(v)
    
    // Handle pointer to struct
    if t.Kind() == reflect.Ptr {
        t = t.Elem()
    }
    
    if t.Kind() != reflect.Struct {
        fmt.Println("Not a struct")
        return
    }
    
    fmt.Printf("Struct: %s with %d fields\n", t.Name(), t.NumField())
    
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        fmt.Printf("  Field %d: %s\n", i, field.Name)
        fmt.Printf("    Type: %v\n", field.Type)
        fmt.Printf("    Exported: %v\n", field.IsExported())
        fmt.Printf("    JSON tag: %s\n", field.Tag.Get("json"))
        fmt.Printf("    Validate tag: %s\n", field.Tag.Get("validate"))
        fmt.Println()
    }
}

func main() {
    inspectStruct(User{})
}
```

---

## Reading and Writing Values

### Reading Values

```go
package main

import (
    "fmt"
    "reflect"
)

type Person struct {
    Name string
    Age  int
}

func main() {
    p := Person{Name: "Alice", Age: 30}
    v := reflect.ValueOf(p)
    
    // Read by field name
    nameField := v.FieldByName("Name")
    fmt.Printf("Name: %s\n", nameField.String())
    
    // Read by index
    ageField := v.Field(1)
    fmt.Printf("Age: %d\n", ageField.Int())
    
    // Iterate all fields
    t := v.Type()
    for i := 0; i < v.NumField(); i++ {
        field := v.Field(i)
        fieldType := t.Field(i)
        fmt.Printf("%s = %v\n", fieldType.Name, field.Interface())
    }
}
```

### Writing Values

To modify values, you must pass a pointer and the field must be exported:

```go
package main

import (
    "fmt"
    "reflect"
)

type Config struct {
    Host string
    Port int
}

func main() {
    cfg := Config{Host: "localhost", Port: 8080}
    
    // Must pass pointer to modify
    v := reflect.ValueOf(&cfg).Elem()
    
    // Check if settable
    hostField := v.FieldByName("Host")
    if hostField.CanSet() {
        hostField.SetString("0.0.0.0")
    }
    
    portField := v.FieldByName("Port")
    if portField.CanSet() {
        portField.SetInt(9090)
    }
    
    fmt.Printf("Modified: %+v\n", cfg)
    // Output: Modified: {Host:0.0.0.0 Port:9090}
}
```

---

## Working with Methods

```go
package main

import (
    "fmt"
    "reflect"
)

type Calculator struct {
    Value int
}

func (c *Calculator) Add(n int) int {
    c.Value += n
    return c.Value
}

func (c *Calculator) Multiply(n int) int {
    c.Value *= n
    return c.Value
}

func (c Calculator) Current() int {
    return c.Value
}

func main() {
    calc := &Calculator{Value: 10}
    t := reflect.TypeOf(calc)
    v := reflect.ValueOf(calc)
    
    fmt.Printf("Type: %v has %d methods\n", t, t.NumMethod())
    
    for i := 0; i < t.NumMethod(); i++ {
        method := t.Method(i)
        fmt.Printf("  Method %d: %s%v\n", i, method.Name, method.Type)
    }
    
    // Call method by name
    addMethod := v.MethodByName("Add")
    args := []reflect.Value{reflect.ValueOf(5)}
    result := addMethod.Call(args)
    
    fmt.Printf("After Add(5): %d\n", result[0].Int())
    fmt.Printf("Calculator value: %d\n", calc.Value)
}
```

---

## Creating Values Dynamically

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Name  string
    Email string
    Age   int
}

func createInstance(t reflect.Type) interface{} {
    // Create new instance
    v := reflect.New(t)
    return v.Interface()
}

func main() {
    // Get type from existing value
    t := reflect.TypeOf(User{})
    
    // Create new instance
    newUser := createInstance(t).(*User)
    newUser.Name = "Bob"
    newUser.Email = "bob@example.com"
    newUser.Age = 25
    
    fmt.Printf("Created: %+v\n", newUser)
    
    // Create slice dynamically
    sliceType := reflect.SliceOf(t)
    sliceValue := reflect.MakeSlice(sliceType, 0, 10)
    
    // Append to slice
    newElement := reflect.ValueOf(User{Name: "Alice"})
    sliceValue = reflect.Append(sliceValue, newElement)
    
    fmt.Printf("Slice: %v\n", sliceValue.Interface())
}
```

---

## Building a Simple Validator

```go
package main

import (
    "fmt"
    "reflect"
    "regexp"
    "strings"
)

type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func Validate(v interface{}) []error {
    var errors []error
    
    val := reflect.ValueOf(v)
    typ := reflect.TypeOf(v)
    
    // Handle pointer
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
        typ = typ.Elem()
    }
    
    for i := 0; i < val.NumField(); i++ {
        field := val.Field(i)
        fieldType := typ.Field(i)
        tag := fieldType.Tag.Get("validate")
        
        if tag == "" {
            continue
        }
        
        rules := strings.Split(tag, ",")
        for _, rule := range rules {
            if err := applyRule(fieldType.Name, field, rule); err != nil {
                errors = append(errors, err)
            }
        }
    }
    
    return errors
}

func applyRule(fieldName string, field reflect.Value, rule string) error {
    switch rule {
    case "required":
        if isZero(field) {
            return ValidationError{fieldName, "is required"}
        }
        
    case "email":
        if field.Kind() == reflect.String {
            email := field.String()
            emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
            if !emailRegex.MatchString(email) {
                return ValidationError{fieldName, "must be a valid email"}
            }
        }
        
    case "positive":
        if field.Kind() == reflect.Int && field.Int() <= 0 {
            return ValidationError{fieldName, "must be positive"}
        }
    }
    
    return nil
}

func isZero(v reflect.Value) bool {
    return v.Interface() == reflect.Zero(v.Type()).Interface()
}

type User struct {
    Name  string `validate:"required"`
    Email string `validate:"required,email"`
    Age   int    `validate:"positive"`
}

func main() {
    // Invalid user
    u1 := User{Name: "", Email: "invalid", Age: -5}
    if errs := Validate(u1); len(errs) > 0 {
        fmt.Println("Validation errors:")
        for _, err := range errs {
            fmt.Printf("  - %v\n", err)
        }
    }
    
    fmt.Println()
    
    // Valid user
    u2 := User{Name: "Alice", Email: "alice@example.com", Age: 30}
    if errs := Validate(u2); len(errs) == 0 {
        fmt.Println("User is valid!")
    }
}
```

---

## Working with Maps

```go
package main

import (
    "fmt"
    "reflect"
)

func main() {
    m := map[string]int{
        "one":   1,
        "two":   2,
        "three": 3,
    }
    
    v := reflect.ValueOf(m)
    
    fmt.Printf("Map type: %v\n", v.Type())
    fmt.Printf("Key type: %v\n", v.Type().Key())
    fmt.Printf("Value type: %v\n", v.Type().Elem())
    
    // Iterate map
    for _, key := range v.MapKeys() {
        value := v.MapIndex(key)
        fmt.Printf("%v: %v\n", key.Interface(), value.Interface())
    }
    
    // Set value
    v.SetMapIndex(reflect.ValueOf("four"), reflect.ValueOf(4))
    
    // Create map dynamically
    mapType := reflect.MapOf(
        reflect.TypeOf(""),
        reflect.TypeOf(0),
    )
    newMap := reflect.MakeMap(mapType)
    newMap.SetMapIndex(reflect.ValueOf("hello"), reflect.ValueOf(42))
    
    fmt.Printf("New map: %v\n", newMap.Interface())
}
```

---

## Function Inspection and Calling

```go
package main

import (
    "fmt"
    "reflect"
)

func greet(name string, times int) string {
    return fmt.Sprintf("Hello %s! (x%d)", name, times)
}

func inspectFunc(fn interface{}) {
    t := reflect.TypeOf(fn)
    
    if t.Kind() != reflect.Func {
        fmt.Println("Not a function")
        return
    }
    
    fmt.Printf("Function: %v\n", t)
    
    // Input parameters
    fmt.Printf("Inputs: %d\n", t.NumIn())
    for i := 0; i < t.NumIn(); i++ {
        fmt.Printf("  Param %d: %v\n", i, t.In(i))
    }
    
    // Output parameters
    fmt.Printf("Outputs: %d\n", t.NumOut())
    for i := 0; i < t.NumOut(); i++ {
        fmt.Printf("  Return %d: %v\n", i, t.Out(i))
    }
    
    // Call the function
    v := reflect.ValueOf(fn)
    args := []reflect.Value{
        reflect.ValueOf("World"),
        reflect.ValueOf(3),
    }
    results := v.Call(args)
    
    fmt.Printf("Result: %v\n", results[0].Interface())
}

func main() {
    inspectFunc(greet)
}
```

---

## DeepEqual for Comparison

```go
package main

import (
    "fmt"
    "reflect"
)

type Person struct {
    Name    string
    Age     int
    Friends []string
}

func main() {
    p1 := Person{
        Name:    "Alice",
        Age:     30,
        Friends: []string{"Bob", "Charlie"},
    }
    
    p2 := Person{
        Name:    "Alice",
        Age:     30,
        Friends: []string{"Bob", "Charlie"},
    }
    
    p3 := Person{
        Name:    "Alice",
        Age:     30,
        Friends: []string{"Bob", "David"},
    }
    
    // Regular == doesn't work with slices in structs
    // fmt.Println(p1 == p2)  // Compile error
    
    // DeepEqual compares recursively
    fmt.Printf("p1 == p2: %v\n", reflect.DeepEqual(p1, p2)) // true
    fmt.Printf("p1 == p3: %v\n", reflect.DeepEqual(p1, p3)) // false
    
    // Works with maps too
    m1 := map[string][]int{"a": {1, 2, 3}}
    m2 := map[string][]int{"a": {1, 2, 3}}
    fmt.Printf("m1 == m2: %v\n", reflect.DeepEqual(m1, m2)) // true
}
```

---

## Performance Considerations

Reflection is slower than direct code. Cache results when possible:

```go
package main

import (
    "reflect"
    "sync"
)

// Cache struct metadata
type structInfo struct {
    fields []fieldInfo
}

type fieldInfo struct {
    index   int
    name    string
    jsonTag string
}

var structCache = sync.Map{}

func getStructInfo(t reflect.Type) *structInfo {
    // Check cache first
    if cached, ok := structCache.Load(t); ok {
        return cached.(*structInfo)
    }
    
    // Build info
    info := &structInfo{}
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        info.fields = append(info.fields, fieldInfo{
            index:   i,
            name:    field.Name,
            jsonTag: field.Tag.Get("json"),
        })
    }
    
    // Store in cache
    structCache.Store(t, info)
    return info
}
```

---

## Summary

Key reflect package concepts:

| Function/Method | Purpose |
|-----------------|---------|
| `reflect.TypeOf()` | Get type information |
| `reflect.ValueOf()` | Get value wrapper |
| `.Kind()` | Get type category |
| `.Elem()` | Dereference pointer/get element type |
| `.Field(i)` / `.FieldByName()` | Access struct fields |
| `.Method(i)` / `.MethodByName()` | Access methods |
| `.Set*()` methods | Modify values |
| `.Call()` | Invoke functions |
| `reflect.DeepEqual()` | Compare complex values |

**Best Practices:**

1. Use generics (Go 1.18+) before reaching for reflection
2. Cache reflection metadata for repeated operations
3. Always check `CanSet()` before modifying values
4. Handle panics from invalid operations
5. Document why reflection is necessary

---

*Building sophisticated Go libraries? [OneUptime](https://oneuptime.com) provides comprehensive monitoring and observability to help you debug complex applications.*
