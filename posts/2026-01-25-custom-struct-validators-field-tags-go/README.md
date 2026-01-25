# How to Build Custom Struct Validators with Field Tags in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Validation, Struct Tags, Reflection, Data Validation

Description: Learn how to build a custom validation system in Go using struct field tags and reflection to validate data at runtime without external dependencies.

---

Go's struct tags are one of those features that seem simple on the surface but unlock powerful metaprogramming capabilities. You see them everywhere - JSON marshaling, database ORMs, configuration parsing. But building your own tag-based validator teaches you how Go's reflection system actually works and gives you complete control over your validation logic.

In this guide, we will build a validation library from scratch that reads custom tags and enforces rules at runtime. No external dependencies, just the standard library.

## Why Build Your Own Validator?

Popular validation libraries like `go-playground/validator` are excellent, but there are good reasons to roll your own:

- You need domain-specific validation rules that don't fit standard validators
- You want to avoid the dependency overhead for a small project
- You need custom error messages that integrate with your error handling
- You want to understand what's happening under the hood

Let's start with the basics and build up to a full-featured validator.

## Understanding Struct Tags and Reflection

Struct tags in Go are string literals attached to struct fields. The reflect package lets you read these at runtime.

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Name  string `validate:"required,min=2,max=50"`
    Email string `validate:"required,email"`
    Age   int    `validate:"min=0,max=150"`
}

func main() {
    t := reflect.TypeOf(User{})

    // Iterate through all fields
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        tag := field.Tag.Get("validate")
        fmt.Printf("Field: %s, Tag: %s\n", field.Name, tag)
    }
}

// Output:
// Field: Name, Tag: required,min=2,max=50
// Field: Email, Tag: required,email
// Field: Age, Tag: min=0,max=150
```

The key insight: `reflect.TypeOf` gives you the type information including tags, while `reflect.ValueOf` gives you the actual values. You need both for validation.

## Building the Validator Core

Let's create the foundation. Our validator will parse tags, extract rules, and apply them to field values.

```go
package validator

import (
    "errors"
    "fmt"
    "reflect"
    "regexp"
    "strconv"
    "strings"
)

// ValidationError holds details about a single validation failure
type ValidationError struct {
    Field   string
    Rule    string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidationErrors collects multiple validation failures
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
    if len(e) == 0 {
        return ""
    }

    var msgs []string
    for _, err := range e {
        msgs = append(msgs, err.Error())
    }
    return strings.Join(msgs, "; ")
}

// Validator holds registered validation functions
type Validator struct {
    rules map[string]RuleFunc
}

// RuleFunc defines the signature for validation rules
// Returns an error message if validation fails, empty string if it passes
type RuleFunc func(value reflect.Value, param string) string

// New creates a validator with default rules
func New() *Validator {
    v := &Validator{
        rules: make(map[string]RuleFunc),
    }

    // Register built-in rules
    v.RegisterRule("required", validateRequired)
    v.RegisterRule("min", validateMin)
    v.RegisterRule("max", validateMax)
    v.RegisterRule("email", validateEmail)
    v.RegisterRule("oneof", validateOneOf)

    return v
}

// RegisterRule adds a custom validation rule
func (v *Validator) RegisterRule(name string, fn RuleFunc) {
    v.rules[name] = fn
}
```

## Implementing the Validation Logic

Now for the main validation function that ties everything together.

```go
// Validate checks a struct against its validation tags
func (v *Validator) Validate(s interface{}) error {
    val := reflect.ValueOf(s)

    // Handle pointer to struct
    if val.Kind() == reflect.Ptr {
        if val.IsNil() {
            return errors.New("cannot validate nil pointer")
        }
        val = val.Elem()
    }

    // Must be a struct
    if val.Kind() != reflect.Struct {
        return errors.New("validate expects a struct")
    }

    typ := val.Type()
    var errs ValidationErrors

    // Check each field
    for i := 0; i < val.NumField(); i++ {
        fieldVal := val.Field(i)
        fieldType := typ.Field(i)

        // Skip unexported fields - they can't be validated via reflection
        if !fieldVal.CanInterface() {
            continue
        }

        // Get the validate tag
        tag := fieldType.Tag.Get("validate")
        if tag == "" || tag == "-" {
            continue
        }

        // Parse and apply each rule
        rules := strings.Split(tag, ",")
        for _, rule := range rules {
            rule = strings.TrimSpace(rule)
            if rule == "" {
                continue
            }

            // Split rule name and parameter (e.g., "min=5")
            name, param := parseRule(rule)

            ruleFn, ok := v.rules[name]
            if !ok {
                errs = append(errs, ValidationError{
                    Field:   fieldType.Name,
                    Rule:    name,
                    Message: fmt.Sprintf("unknown rule: %s", name),
                })
                continue
            }

            // Apply the rule
            if msg := ruleFn(fieldVal, param); msg != "" {
                errs = append(errs, ValidationError{
                    Field:   fieldType.Name,
                    Rule:    name,
                    Message: msg,
                })
            }
        }
    }

    if len(errs) > 0 {
        return errs
    }
    return nil
}

// parseRule splits "min=5" into ("min", "5")
func parseRule(rule string) (name, param string) {
    parts := strings.SplitN(rule, "=", 2)
    name = parts[0]
    if len(parts) > 1 {
        param = parts[1]
    }
    return
}
```

## Built-in Validation Rules

Here are the implementations for common validation rules.

```go
// validateRequired checks that a field is not empty
func validateRequired(val reflect.Value, _ string) string {
    if isZero(val) {
        return "is required"
    }
    return ""
}

// isZero checks if a value is its zero value
func isZero(val reflect.Value) bool {
    switch val.Kind() {
    case reflect.String:
        return val.String() == ""
    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
        return val.Int() == 0
    case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
        return val.Uint() == 0
    case reflect.Float32, reflect.Float64:
        return val.Float() == 0
    case reflect.Bool:
        return !val.Bool()
    case reflect.Slice, reflect.Map, reflect.Array:
        return val.Len() == 0
    case reflect.Ptr, reflect.Interface:
        return val.IsNil()
    default:
        return reflect.DeepEqual(val.Interface(), reflect.Zero(val.Type()).Interface())
    }
}

// validateMin checks minimum length for strings or minimum value for numbers
func validateMin(val reflect.Value, param string) string {
    min, err := strconv.Atoi(param)
    if err != nil {
        return fmt.Sprintf("invalid min parameter: %s", param)
    }

    switch val.Kind() {
    case reflect.String:
        if len(val.String()) < min {
            return fmt.Sprintf("must be at least %d characters", min)
        }
    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
        if val.Int() < int64(min) {
            return fmt.Sprintf("must be at least %d", min)
        }
    case reflect.Slice, reflect.Array, reflect.Map:
        if val.Len() < min {
            return fmt.Sprintf("must have at least %d items", min)
        }
    }
    return ""
}

// validateMax checks maximum length or value
func validateMax(val reflect.Value, param string) string {
    max, err := strconv.Atoi(param)
    if err != nil {
        return fmt.Sprintf("invalid max parameter: %s", param)
    }

    switch val.Kind() {
    case reflect.String:
        if len(val.String()) > max {
            return fmt.Sprintf("must be at most %d characters", max)
        }
    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
        if val.Int() > int64(max) {
            return fmt.Sprintf("must be at most %d", max)
        }
    case reflect.Slice, reflect.Array, reflect.Map:
        if val.Len() > max {
            return fmt.Sprintf("must have at most %d items", max)
        }
    }
    return ""
}

// validateEmail checks for valid email format
func validateEmail(val reflect.Value, _ string) string {
    if val.Kind() != reflect.String {
        return "email validation requires a string"
    }

    email := val.String()
    if email == "" {
        return "" // Empty is handled by 'required' rule
    }

    // Simple but effective email regex
    pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
    matched, _ := regexp.MatchString(pattern, email)
    if !matched {
        return "must be a valid email address"
    }
    return ""
}

// validateOneOf checks if value is in an allowed list
func validateOneOf(val reflect.Value, param string) string {
    allowed := strings.Split(param, "|")

    var strVal string
    switch val.Kind() {
    case reflect.String:
        strVal = val.String()
    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
        strVal = strconv.FormatInt(val.Int(), 10)
    default:
        return "oneof validation requires string or integer"
    }

    for _, a := range allowed {
        if strVal == a {
            return ""
        }
    }
    return fmt.Sprintf("must be one of: %s", strings.Join(allowed, ", "))
}
```

## Adding Custom Rules

The real power comes from adding your own rules. Here is how to extend the validator with domain-specific logic.

```go
package main

import (
    "fmt"
    "reflect"
    "regexp"
    "unicode"
)

func main() {
    v := validator.New()

    // Add custom phone validation
    v.RegisterRule("phone", func(val reflect.Value, param string) string {
        if val.Kind() != reflect.String {
            return "phone validation requires a string"
        }

        phone := val.String()
        if phone == "" {
            return ""
        }

        // US phone format
        pattern := `^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$`
        if matched, _ := regexp.MatchString(pattern, phone); !matched {
            return "must be a valid phone number"
        }
        return ""
    })

    // Add password strength validation
    v.RegisterRule("strongpassword", func(val reflect.Value, _ string) string {
        if val.Kind() != reflect.String {
            return "password validation requires a string"
        }

        pw := val.String()
        if len(pw) < 8 {
            return "password must be at least 8 characters"
        }

        var hasUpper, hasLower, hasDigit, hasSpecial bool
        for _, r := range pw {
            switch {
            case unicode.IsUpper(r):
                hasUpper = true
            case unicode.IsLower(r):
                hasLower = true
            case unicode.IsDigit(r):
                hasDigit = true
            case unicode.IsPunct(r) || unicode.IsSymbol(r):
                hasSpecial = true
            }
        }

        if !hasUpper || !hasLower || !hasDigit || !hasSpecial {
            return "password must contain uppercase, lowercase, digit, and special character"
        }
        return ""
    })

    // Use the custom rules
    type Account struct {
        Phone    string `validate:"phone"`
        Password string `validate:"required,strongpassword"`
    }

    acc := Account{
        Phone:    "555-1234",
        Password: "weak",
    }

    if err := v.Validate(acc); err != nil {
        fmt.Println("Validation failed:", err)
    }
}
```

## Handling Nested Structs

Real applications have nested structures. Let's add support for validating embedded structs.

```go
// ValidateNested recursively validates nested structs
func (v *Validator) ValidateNested(s interface{}) error {
    val := reflect.ValueOf(s)
    if val.Kind() == reflect.Ptr {
        if val.IsNil() {
            return errors.New("cannot validate nil pointer")
        }
        val = val.Elem()
    }

    if val.Kind() != reflect.Struct {
        return errors.New("validate expects a struct")
    }

    return v.validateValue(val, "")
}

func (v *Validator) validateValue(val reflect.Value, prefix string) error {
    typ := val.Type()
    var errs ValidationErrors

    for i := 0; i < val.NumField(); i++ {
        fieldVal := val.Field(i)
        fieldType := typ.Field(i)

        if !fieldVal.CanInterface() {
            continue
        }

        fieldName := fieldType.Name
        if prefix != "" {
            fieldName = prefix + "." + fieldName
        }

        // Check for dive tag to validate nested struct
        tag := fieldType.Tag.Get("validate")

        // Validate nested struct if it's a struct type
        if fieldVal.Kind() == reflect.Struct && strings.Contains(tag, "dive") {
            if err := v.validateValue(fieldVal, fieldName); err != nil {
                if vErrs, ok := err.(ValidationErrors); ok {
                    errs = append(errs, vErrs...)
                }
            }
            continue
        }

        // Validate slice of structs
        if fieldVal.Kind() == reflect.Slice && strings.Contains(tag, "dive") {
            for j := 0; j < fieldVal.Len(); j++ {
                elem := fieldVal.Index(j)
                if elem.Kind() == reflect.Struct {
                    elemName := fmt.Sprintf("%s[%d]", fieldName, j)
                    if err := v.validateValue(elem, elemName); err != nil {
                        if vErrs, ok := err.(ValidationErrors); ok {
                            errs = append(errs, vErrs...)
                        }
                    }
                }
            }
            continue
        }

        // Apply regular validation rules
        if tag != "" && tag != "-" {
            for _, rule := range strings.Split(tag, ",") {
                rule = strings.TrimSpace(rule)
                if rule == "" || rule == "dive" {
                    continue
                }

                name, param := parseRule(rule)
                if ruleFn, ok := v.rules[name]; ok {
                    if msg := ruleFn(fieldVal, param); msg != "" {
                        errs = append(errs, ValidationError{
                            Field:   fieldName,
                            Rule:    name,
                            Message: msg,
                        })
                    }
                }
            }
        }
    }

    if len(errs) > 0 {
        return errs
    }
    return nil
}
```

## Putting It All Together

Here is a complete example showing the validator in action.

```go
package main

import (
    "fmt"
)

type Address struct {
    Street  string `validate:"required,min=5"`
    City    string `validate:"required"`
    Country string `validate:"required,oneof=US|CA|UK|AU"`
}

type User struct {
    Username string   `validate:"required,min=3,max=20"`
    Email    string   `validate:"required,email"`
    Age      int      `validate:"min=18,max=120"`
    Role     string   `validate:"required,oneof=admin|user|guest"`
    Address  Address  `validate:"dive"`
    Tags     []string `validate:"max=5"`
}

func main() {
    v := validator.New()

    user := User{
        Username: "ab",                    // Too short
        Email:    "not-an-email",          // Invalid format
        Age:      15,                       // Below minimum
        Role:     "superadmin",            // Not in allowed list
        Address: Address{
            Street:  "123",                // Too short
            City:    "",                   // Missing required
            Country: "FR",                 // Not in allowed list
        },
        Tags: []string{"a", "b", "c", "d", "e", "f"}, // Too many
    }

    if err := v.ValidateNested(user); err != nil {
        if vErrs, ok := err.(validator.ValidationErrors); ok {
            fmt.Println("Validation errors:")
            for _, e := range vErrs {
                fmt.Printf("  - %s: %s\n", e.Field, e.Message)
            }
        }
    }
}

// Output:
// Validation errors:
//   - Username: must be at least 3 characters
//   - Email: must be a valid email address
//   - Age: must be at least 18
//   - Role: must be one of: admin, user, guest
//   - Address.Street: must be at least 5 characters
//   - Address.City: is required
//   - Address.Country: must be one of: US, CA, UK, AU
//   - Tags: must have at most 5 items
```

## Performance Considerations

Reflection in Go is not free. For high-throughput applications, consider these optimizations:

1. Cache parsed tag rules at startup rather than parsing on every validation
2. Generate validation code at build time using code generation tools
3. Use type assertions when you know the concrete types to avoid reflection

For most applications, the simplicity of tag-based validation outweighs the minor performance cost. Profile before optimizing.

## Wrapping Up

Building your own struct validator teaches you the mechanics of Go's reflection system while giving you full control over validation logic. The pattern is straightforward: read tags at runtime, parse rules, and apply them to values.

This foundation can be extended with conditional validation, cross-field validation, or integration with your error handling system. The code shown here is production-ready for many use cases, but the real value is understanding how it works so you can adapt it to your needs.
