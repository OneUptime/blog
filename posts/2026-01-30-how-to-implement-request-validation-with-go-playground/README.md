# How to Implement Request Validation with Go-Playground

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Validation, API, Web

Description: Learn how to validate HTTP request data in Go using the go-playground/validator library with custom validators and error handling.

---

Request validation is a critical part of building robust APIs. The `go-playground/validator` library provides a powerful and flexible way to validate struct fields in Go. This guide covers everything from basic usage to custom validators and framework integration.

## Getting Started

First, install the validator package:

```bash
go get github.com/go-playground/validator/v10
```

## Basic Struct Validation with Tags

The validator uses struct tags to define validation rules. Here is a basic example:

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// User represents a user registration request
type User struct {
    // required: field must not be empty
    // min/max: string length constraints
    Username string `json:"username" validate:"required,min=3,max=20"`

    // email: must be a valid email format
    Email    string `json:"email" validate:"required,email"`

    // gte/lte: numeric range (greater/less than or equal)
    Age      int    `json:"age" validate:"required,gte=18,lte=120"`

    // oneof: value must be one of the specified options
    Role     string `json:"role" validate:"required,oneof=admin user guest"`
}

func main() {
    // Create a new validator instance
    validate := validator.New()

    user := User{
        Username: "jo",        // Too short
        Email:    "invalid",   // Invalid email
        Age:      15,          // Below minimum
        Role:     "superuser", // Not in allowed list
    }

    // Validate the struct
    err := validate.Struct(user)
    if err != nil {
        // Type assert to get validation errors
        for _, e := range err.(validator.ValidationErrors) {
            fmt.Printf("Field: %s, Tag: %s, Value: %v\n",
                e.Field(), e.Tag(), e.Value())
        }
    }
}
```

## Common Validation Tags

Here are the most frequently used validation tags:

| Tag | Description |
|-----|-------------|
| `required` | Field must not be empty |
| `email` | Must be valid email format |
| `url` | Must be valid URL |
| `min`, `max` | Length for strings, value for numbers |
| `len` | Exact length |
| `gte`, `lte` | Greater/less than or equal |
| `oneof` | Value must be in list |
| `alphanum` | Alphanumeric characters only |
| `uuid` | Valid UUID format |

## Nested Struct Validation

The validator handles nested structs with the `dive` tag for slices:

```go
// Address represents a physical address
type Address struct {
    Street  string `json:"street" validate:"required"`
    City    string `json:"city" validate:"required"`
    ZipCode string `json:"zip_code" validate:"required,len=5,numeric"`
}

// Order represents a customer order
type Order struct {
    // Nested struct validation happens automatically
    BillingAddress  Address `json:"billing_address" validate:"required"`
    ShippingAddress Address `json:"shipping_address" validate:"required"`

    // dive: validates each element in the slice
    // gt=0: each item ID must be greater than 0
    Items []int `json:"items" validate:"required,min=1,dive,gt=0"`
}

func validateOrder() {
    validate := validator.New()

    order := Order{
        BillingAddress: Address{
            Street:  "123 Main St",
            City:    "Boston",
            ZipCode: "02101",
        },
        ShippingAddress: Address{
            Street:  "",  // Missing required field
            City:    "Boston",
            ZipCode: "abc", // Invalid: not numeric
        },
        Items: []int{1, 2, 0}, // Invalid: 0 is not > 0
    }

    err := validate.Struct(order)
    if err != nil {
        fmt.Println("Validation failed:", err)
    }
}
```

## Custom Validators

You can register custom validation functions for domain-specific rules:

```go
// validatePhoneNumber checks if the phone number has the correct format
func validatePhoneNumber(fl validator.FieldLevel) bool {
    phone := fl.Field().String()
    // Simple check: must start with + and be 10-15 chars
    if len(phone) < 10 || len(phone) > 15 {
        return false
    }
    return phone[0] == '+'
}

// validateFutureDate ensures a date is in the future
func validateFutureDate(fl validator.FieldLevel) bool {
    date, ok := fl.Field().Interface().(time.Time)
    if !ok {
        return false
    }
    return date.After(time.Now())
}

func setupValidators() *validator.Validate {
    validate := validator.New()

    // Register custom validators with descriptive names
    validate.RegisterValidation("phone", validatePhoneNumber)
    validate.RegisterValidation("future_date", validateFutureDate)

    return validate
}

// Booking demonstrates custom validator usage
type Booking struct {
    Phone       string    `json:"phone" validate:"required,phone"`
    CheckInDate time.Time `json:"check_in_date" validate:"required,future_date"`
}
```

## Better Error Messages

Transform validation errors into user-friendly messages:

```go
// ValidationError holds a formatted error response
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

// formatValidationErrors converts validator errors to readable messages
func formatValidationErrors(err error) []ValidationError {
    var errors []ValidationError

    for _, e := range err.(validator.ValidationErrors) {
        var message string

        // Create human-readable messages based on the tag
        switch e.Tag() {
        case "required":
            message = fmt.Sprintf("%s is required", e.Field())
        case "email":
            message = fmt.Sprintf("%s must be a valid email", e.Field())
        case "min":
            message = fmt.Sprintf("%s must be at least %s characters", e.Field(), e.Param())
        case "max":
            message = fmt.Sprintf("%s must be at most %s characters", e.Field(), e.Param())
        case "oneof":
            message = fmt.Sprintf("%s must be one of: %s", e.Field(), e.Param())
        default:
            message = fmt.Sprintf("%s is invalid", e.Field())
        }

        errors = append(errors, ValidationError{
            Field:   e.Field(),
            Message: message,
        })
    }

    return errors
}
```

## Integration with Gin Framework

Gin has built-in support for the validator library:

```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gin-gonic/gin/binding"
    "github.com/go-playground/validator/v10"
)

// CreateUserRequest holds the user creation payload
type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=20"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
}

func main() {
    r := gin.Default()

    // Register custom validators with Gin's validator
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        v.RegisterValidation("phone", validatePhoneNumber)
    }

    r.POST("/users", func(c *gin.Context) {
        var req CreateUserRequest

        // ShouldBindJSON validates automatically
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error":   "Validation failed",
                "details": err.Error(),
            })
            return
        }

        // Proceed with valid data
        c.JSON(http.StatusCreated, gin.H{"message": "User created"})
    })

    r.Run(":8080")
}
```

## Integration with Echo Framework

Echo requires manual validator setup:

```go
package main

import (
    "net/http"
    "github.com/labstack/echo/v4"
    "github.com/go-playground/validator/v10"
)

// CustomValidator wraps the validator for Echo
type CustomValidator struct {
    validator *validator.Validate
}

// Validate implements echo.Validator interface
func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.validator.Struct(i)
}

func main() {
    e := echo.New()

    // Set up the custom validator
    e.Validator = &CustomValidator{validator: validator.New()}

    e.POST("/users", func(c echo.Context) error {
        var req CreateUserRequest

        // Bind first, then validate
        if err := c.Bind(&req); err != nil {
            return c.JSON(http.StatusBadRequest, map[string]string{
                "error": "Invalid request body",
            })
        }

        // Validate the bound struct
        if err := c.Validate(&req); err != nil {
            return c.JSON(http.StatusBadRequest, map[string]string{
                "error": err.Error(),
            })
        }

        return c.JSON(http.StatusCreated, map[string]string{
            "message": "User created",
        })
    })

    e.Start(":8080")
}
```

## Conclusion

The `go-playground/validator` library provides a comprehensive solution for request validation in Go applications. By combining struct tags with custom validators, you can handle complex validation scenarios while keeping your code clean and maintainable. Whether you use Gin, Echo, or standard HTTP handlers, integrating validation is straightforward and helps ensure your API receives only valid data.
