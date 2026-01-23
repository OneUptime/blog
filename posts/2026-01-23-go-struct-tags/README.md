# How to Understand Struct Tags in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Struct Tags, JSON, Reflection, Metadata

Description: Master Go struct tags for JSON serialization, database mapping, validation, and custom metadata. Learn the syntax, common patterns, and how to read tags with reflection.

---

Struct tags are one of Go's most powerful features for adding metadata to struct fields. They're strings attached to struct fields that provide instructions to packages like `encoding/json`, database ORMs, and validation libraries. This guide covers everything you need to know about struct tags.

---

## Basic Syntax

Struct tags are written as raw string literals following the field type, enclosed in backticks:

```go
type User struct {
    ID        int    `json:"id"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
    Email     string `json:"email"`
}
```

The general format is:
```
`key1:"value1" key2:"value2" key3:"value3"`
```

Each key-value pair is separated by a space, and values are enclosed in double quotes.

---

## JSON Tags

The most common use of struct tags is controlling JSON serialization with the `encoding/json` package:

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    // Basic field mapping
    ID int `json:"id"`
    
    // Use snake_case in JSON
    FirstName string `json:"first_name"`
    
    // Omit from JSON if empty (zero value)
    MiddleName string `json:"middle_name,omitempty"`
    
    // Completely ignore this field in JSON
    Password string `json:"-"`
    
    // Use different name and omit if empty
    PhoneNumber string `json:"phone,omitempty"`
    
    // Encode as string even though it's a number
    Age int `json:"age,string"`
}

func main() {
    user := User{
        ID:        1,
        FirstName: "John",
        // MiddleName is empty, will be omitted
        Password:    "secret123",
        PhoneNumber: "555-1234",
        Age:         30,
    }
    
    data, _ := json.MarshalIndent(user, "", "  ")
    fmt.Println(string(data))
}
```

Output:
```json
{
  "id": 1,
  "first_name": "John",
  "phone": "555-1234",
  "age": "30"
}
```

---

## Common JSON Tag Options

Here are all the JSON tag options:

```go
type Example struct {
    // Use "name" as the JSON key
    Field1 string `json:"name"`
    
    // Omit if the field has its zero value
    Field2 string `json:"name,omitempty"`
    
    // Never include in JSON output
    Field3 string `json:"-"`
    
    // Use "-" as the actual key name (rare)
    Field4 string `json:"-,"`
    
    // Keep original field name but add omitempty
    Field5 string `json:",omitempty"`
    
    // Encode number as JSON string
    Field6 int `json:"count,string"`
}
```

---

## Database Tags (GORM Example)

Database ORMs use struct tags for mapping fields to columns:

```go
package main

import (
    "time"
    
    "gorm.io/gorm"
)

type Product struct {
    // Primary key with auto-increment
    ID uint `gorm:"primaryKey;autoIncrement"`
    
    // Column name mapping
    ProductName string `gorm:"column:product_name"`
    
    // Not null constraint with default value
    Price float64 `gorm:"not null;default:0.00"`
    
    // Unique constraint
    SKU string `gorm:"unique;size:50"`
    
    // Index for faster queries
    Category string `gorm:"index"`
    
    // Composite index
    Brand  string `gorm:"index:idx_brand_category"`
    TypeID int    `gorm:"index:idx_brand_category"`
    
    // Ignore this field in database operations
    TempData string `gorm:"-"`
    
    // Timestamps handled automatically
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"` // Soft delete
}

type Order struct {
    ID        uint `gorm:"primaryKey"`
    
    // Foreign key relationship
    UserID uint
    User   User `gorm:"foreignKey:UserID;references:ID"`
    
    // Many-to-many relationship
    Products []Product `gorm:"many2many:order_products;"`
}
```

---

## Validation Tags

Validation libraries use tags to define rules:

```go
package main

import (
    "fmt"
    
    "github.com/go-playground/validator/v10"
)

type Registration struct {
    // Required field
    Username string `validate:"required,min=3,max=20"`
    
    // Email format validation
    Email string `validate:"required,email"`
    
    // Password with multiple rules
    Password string `validate:"required,min=8,containsany=!@#$%"`
    
    // Must match another field
    ConfirmPassword string `validate:"required,eqfield=Password"`
    
    // Numeric range
    Age int `validate:"required,gte=18,lte=120"`
    
    // URL validation
    Website string `validate:"omitempty,url"`
    
    // One of specific values
    Role string `validate:"required,oneof=admin user guest"`
    
    // Conditional validation
    Phone string `validate:"required_if=ContactMethod phone"`
    ContactMethod string `validate:"required,oneof=email phone"`
}

func main() {
    validate := validator.New()
    
    reg := Registration{
        Username: "jo", // Too short
        Email:    "invalid-email",
        Password: "weak",
        Age:      15,
    }
    
    err := validate.Struct(reg)
    if err != nil {
        for _, e := range err.(validator.ValidationErrors) {
            fmt.Printf("Field: %s, Tag: %s, Value: %v\n", 
                e.Field(), e.Tag(), e.Value())
        }
    }
}
```

---

## Multiple Tags on One Field

You can combine multiple tag systems on a single field:

```go
type User struct {
    ID int64 `json:"id" gorm:"primaryKey" validate:"required"`
    
    Email string `json:"email" gorm:"unique;not null" validate:"required,email"`
    
    Name string `json:"name,omitempty" gorm:"size:100" validate:"min=2,max=100"`
    
    CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}
```

---

## Reading Tags with Reflection

You can read struct tags programmatically using the `reflect` package:

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    ID    int    `json:"id" db:"user_id" custom:"primary"`
    Name  string `json:"name" db:"user_name" custom:"indexed"`
    Email string `json:"email" db:"email_address"`
}

func main() {
    user := User{}
    t := reflect.TypeOf(user)
    
    // Iterate through all fields
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        
        fmt.Printf("Field: %s\n", field.Name)
        
        // Get specific tag
        jsonTag := field.Tag.Get("json")
        dbTag := field.Tag.Get("db")
        customTag := field.Tag.Get("custom")
        
        fmt.Printf("  json: %s\n", jsonTag)
        fmt.Printf("  db: %s\n", dbTag)
        fmt.Printf("  custom: %s\n", customTag)
        
        // Get the raw tag string
        fmt.Printf("  raw: %s\n\n", field.Tag)
    }
}
```

Output:
```
Field: ID
  json: id
  db: user_id
  custom: primary
  raw: json:"id" db:"user_id" custom:"primary"

Field: Name
  json: name
  db: user_name
  custom: indexed
  raw: json:"name" db:"user_name" custom:"indexed"

Field: Email
  json: email
  db: email_address
  raw: json:"email" db:"email_address"
```

---

## Creating Custom Tag Processors

You can build your own tag-based systems:

```go
package main

import (
    "fmt"
    "reflect"
    "strings"
)

// FieldInfo holds metadata extracted from struct tags
type FieldInfo struct {
    Name       string
    Column     string
    Required   bool
    MaxLength  int
}

// ParseStructTags extracts custom tag information from a struct
func ParseStructTags(v interface{}) []FieldInfo {
    t := reflect.TypeOf(v)
    if t.Kind() == reflect.Ptr {
        t = t.Elem()
    }
    
    var fields []FieldInfo
    
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        
        info := FieldInfo{
            Name: field.Name,
        }
        
        // Parse our custom "myorm" tag
        tag := field.Tag.Get("myorm")
        if tag == "" {
            continue
        }
        
        // Split tag by comma for multiple options
        parts := strings.Split(tag, ",")
        for _, part := range parts {
            part = strings.TrimSpace(part)
            
            if strings.HasPrefix(part, "column:") {
                info.Column = strings.TrimPrefix(part, "column:")
            } else if part == "required" {
                info.Required = true
            } else if strings.HasPrefix(part, "max:") {
                fmt.Sscanf(part, "max:%d", &info.MaxLength)
            }
        }
        
        fields = append(fields, info)
    }
    
    return fields
}

type Article struct {
    ID      int    `myorm:"column:article_id,required"`
    Title   string `myorm:"column:title,required,max:200"`
    Content string `myorm:"column:body"`
    Author  string `myorm:"column:author_name,max:100"`
}

func main() {
    fields := ParseStructTags(Article{})
    
    for _, f := range fields {
        fmt.Printf("Field: %s\n", f.Name)
        fmt.Printf("  Column: %s\n", f.Column)
        fmt.Printf("  Required: %v\n", f.Required)
        fmt.Printf("  MaxLength: %d\n\n", f.MaxLength)
    }
}
```

---

## XML Tags

The `encoding/xml` package uses similar tags:

```go
package main

import (
    "encoding/xml"
    "fmt"
)

type Person struct {
    XMLName   xml.Name `xml:"person"`
    ID        int      `xml:"id,attr"`           // Attribute
    FirstName string   `xml:"first-name"`        // Element
    LastName  string   `xml:"last-name"`
    Email     string   `xml:"contact>email"`     // Nested element
    Phone     string   `xml:"contact>phone"`
    Notes     string   `xml:",cdata"`            // CDATA section
    Internal  string   `xml:"-"`                 // Ignored
}

func main() {
    person := Person{
        ID:        1,
        FirstName: "John",
        LastName:  "Doe",
        Email:     "john@example.com",
        Phone:     "555-1234",
        Notes:     "Some <special> notes",
        Internal:  "hidden",
    }
    
    data, _ := xml.MarshalIndent(person, "", "  ")
    fmt.Println(string(data))
}
```

Output:
```xml
<person id="1">
  <first-name>John</first-name>
  <last-name>Doe</last-name>
  <contact>
    <email>john@example.com</email>
    <phone>555-1234</phone>
  </contact>
  <![CDATA[Some <special> notes]]>
</person>
```

---

## YAML Tags

The `gopkg.in/yaml.v3` package:

```go
package main

import (
    "fmt"
    
    "gopkg.in/yaml.v3"
)

type Config struct {
    Server   ServerConfig   `yaml:"server"`
    Database DatabaseConfig `yaml:"database"`
}

type ServerConfig struct {
    Host    string `yaml:"host"`
    Port    int    `yaml:"port"`
    Timeout int    `yaml:"timeout,omitempty"`
}

type DatabaseConfig struct {
    Driver   string `yaml:"driver"`
    Host     string `yaml:"host"`
    Port     int    `yaml:"port"`
    Name     string `yaml:"name"`
    Password string `yaml:"-"` // Never serialize password
}

func main() {
    config := Config{
        Server: ServerConfig{
            Host: "localhost",
            Port: 8080,
        },
        Database: DatabaseConfig{
            Driver:   "postgres",
            Host:     "db.example.com",
            Port:     5432,
            Name:     "myapp",
            Password: "secret",
        },
    }
    
    data, _ := yaml.Marshal(config)
    fmt.Println(string(data))
}
```

---

## Environment Variable Tags

Some libraries use tags for environment variable binding:

```go
package main

import (
    "fmt"
    "os"
    "reflect"
    "strconv"
)

type Config struct {
    Port     int    `env:"PORT" default:"8080"`
    Host     string `env:"HOST" default:"localhost"`
    Debug    bool   `env:"DEBUG" default:"false"`
    LogLevel string `env:"LOG_LEVEL" default:"info"`
}

// LoadFromEnv populates a struct from environment variables
func LoadFromEnv(cfg interface{}) error {
    v := reflect.ValueOf(cfg).Elem()
    t := v.Type()
    
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        fieldValue := v.Field(i)
        
        envKey := field.Tag.Get("env")
        defaultVal := field.Tag.Get("default")
        
        if envKey == "" {
            continue
        }
        
        // Get value from environment or use default
        value := os.Getenv(envKey)
        if value == "" {
            value = defaultVal
        }
        
        // Set the field based on its type
        switch fieldValue.Kind() {
        case reflect.String:
            fieldValue.SetString(value)
        case reflect.Int:
            if intVal, err := strconv.Atoi(value); err == nil {
                fieldValue.SetInt(int64(intVal))
            }
        case reflect.Bool:
            if boolVal, err := strconv.ParseBool(value); err == nil {
                fieldValue.SetBool(boolVal)
            }
        }
    }
    
    return nil
}

func main() {
    // Set some environment variables for testing
    os.Setenv("PORT", "3000")
    os.Setenv("DEBUG", "true")
    
    var cfg Config
    LoadFromEnv(&cfg)
    
    fmt.Printf("Config: %+v\n", cfg)
    // Config: {Port:3000 Host:localhost Debug:true LogLevel:info}
}
```

---

## Common Mistakes and Best Practices

### Mistake 1: Incorrect Quote Usage

```go
// WRONG - using single quotes
type Bad struct {
    Name string `json:'name'`  // Won't work!
}

// CORRECT - use double quotes inside backticks
type Good struct {
    Name string `json:"name"`
}
```

### Mistake 2: Missing Spaces Between Tags

```go
// WRONG - no space between tags
type Bad struct {
    Name string `json:"name"validate:"required"`
}

// CORRECT - space between tags
type Good struct {
    Name string `json:"name" validate:"required"`
}
```

### Mistake 3: Unexported Fields

```go
type User struct {
    // This field is unexported (lowercase) so JSON won't see it
    name string `json:"name"` // Tag is useless here!
    
    // Export the field for JSON to work
    Name string `json:"name"` // This works
}
```

---

## Summary

Struct tags are essential for:

1. **Serialization** - JSON, XML, YAML field naming and behavior
2. **Database mapping** - ORM column definitions and constraints
3. **Validation** - Field-level validation rules
4. **Configuration** - Environment variable and config file binding
5. **Custom metadata** - Building your own tag-based systems

Key syntax rules:
- Use backticks for the tag string
- Use double quotes for values
- Separate multiple tags with spaces
- Use commas for options within a single tag

Understanding struct tags unlocks the power of Go's reflection-based libraries and enables clean, declarative configuration of your data structures.

---

*Building Go services? [OneUptime](https://oneuptime.com) provides end-to-end observability for your Go applications with distributed tracing, metrics, and logs all in one place.*
