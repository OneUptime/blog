# How to Implement Request Validation in Go with go-playground/validator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Validation, Input Validation, API, Security

Description: Master request validation in Go using go-playground/validator with struct tags, custom validators, and user-friendly error messages.

---

Request validation is a critical component of any web application. It ensures data integrity, prevents security vulnerabilities, and provides meaningful feedback to API consumers. In Go, the `go-playground/validator` package has become the de facto standard for struct validation, offering a powerful and flexible approach through struct tags, custom validators, and comprehensive error handling.

This guide will walk you through everything you need to know to implement robust request validation in your Go applications.

## Table of Contents

1. [Why Request Validation Matters](#why-request-validation-matters)
2. [Setting Up go-playground/validator](#setting-up-go-playgroundvalidator)
3. [Built-in Validation Tags](#built-in-validation-tags)
4. [Custom Validation Functions](#custom-validation-functions)
5. [Cross-Field Validation](#cross-field-validation)
6. [Custom Error Messages and Translations](#custom-error-messages-and-translations)
7. [Integration with Web Frameworks](#integration-with-web-frameworks)
8. [Best Practices](#best-practices)
9. [Conclusion](#conclusion)

## Why Request Validation Matters

Before diving into implementation, let's understand why validation is essential:

- **Security**: Prevents injection attacks, buffer overflows, and malformed data exploitation
- **Data Integrity**: Ensures your database receives clean, properly formatted data
- **User Experience**: Provides clear, actionable error messages to API consumers
- **Business Logic**: Enforces domain rules at the entry point of your application

Without proper validation, your application is vulnerable to crashes, data corruption, and security breaches.

## Setting Up go-playground/validator

First, let's install the validator package and set up a basic project structure.

### Installation

```bash
# Install the validator package (v10 is the latest major version)
go get github.com/go-playground/validator/v10
```

### Basic Setup

The following code demonstrates how to create a validator instance and validate a simple struct.

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// User represents a basic user registration request
type User struct {
    Username string `validate:"required,min=3,max=32"`
    Email    string `validate:"required,email"`
    Age      int    `validate:"required,gte=18,lte=120"`
}

func main() {
    // Create a new validator instance - this should be a singleton in production
    validate := validator.New()

    // Create a user with invalid data to test validation
    user := User{
        Username: "ab",           // Too short
        Email:    "invalid-email", // Invalid format
        Age:      15,              // Below minimum
    }

    // Validate the struct and check for errors
    err := validate.Struct(user)
    if err != nil {
        // Type assert to get detailed validation errors
        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                fmt.Printf("Field: %s, Tag: %s, Value: %v\n",
                    e.Field(), e.Tag(), e.Value())
            }
        }
    }
}
```

### Singleton Pattern for Validator

In production applications, you should create the validator once and reuse it. Here's a recommended approach.

```go
package validation

import (
    "sync"
    "github.com/go-playground/validator/v10"
)

// Global validator instance with thread-safe initialization
var (
    validate *validator.Validate
    once     sync.Once
)

// GetValidator returns a singleton validator instance
// This is important because creating validators is expensive
func GetValidator() *validator.Validate {
    once.Do(func() {
        validate = validator.New()
        // Register custom validators here
    })
    return validate
}
```

## Built-in Validation Tags

The validator package comes with a comprehensive set of built-in validation tags. Here are the most commonly used ones.

### String Validations

This example shows various string validation tags for common use cases.

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// StringValidations demonstrates various string validation tags
type StringValidations struct {
    // Required field - cannot be empty or zero value
    Name string `validate:"required"`

    // Length constraints - between 3 and 50 characters
    Username string `validate:"required,min=3,max=50"`

    // Exact length - must be exactly 10 characters
    PhoneCode string `validate:"len=10"`

    // Email format validation
    Email string `validate:"required,email"`

    // URL format validation
    Website string `validate:"omitempty,url"`

    // UUID format validation
    ID string `validate:"required,uuid4"`

    // Alphanumeric characters only
    Code string `validate:"alphanum"`

    // Contains specific substring
    Bio string `validate:"contains=developer"`

    // Starts with specific prefix
    Reference string `validate:"startswith=REF-"`

    // Ends with specific suffix
    Filename string `validate:"endswith=.json"`

    // Regular expression pattern
    Slug string `validate:"regexp=^[a-z0-9-]+$"`
}

func main() {
    validate := validator.New()

    data := StringValidations{
        Name:      "John Doe",
        Username:  "johndoe",
        PhoneCode: "1234567890",
        Email:     "john@example.com",
        Website:   "https://example.com",
        ID:        "550e8400-e29b-41d4-a716-446655440000",
        Code:      "ABC123",
        Bio:       "I am a developer",
        Reference: "REF-001",
        Filename:  "config.json",
        Slug:      "my-blog-post",
    }

    if err := validate.Struct(data); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("All validations passed!")
    }
}
```

### Numeric Validations

This example demonstrates numeric validation tags for integers and floats.

```go
package main

import (
    "github.com/go-playground/validator/v10"
)

// NumericValidations demonstrates numeric validation tags
type NumericValidations struct {
    // Greater than or equal to 0
    Age int `validate:"gte=0"`

    // Less than or equal to 100
    Score int `validate:"lte=100"`

    // Greater than 0 (positive numbers only)
    Price float64 `validate:"gt=0"`

    // Less than 1000
    Quantity int `validate:"lt=1000"`

    // Range validation - between 1 and 10 inclusive
    Rating int `validate:"gte=1,lte=10"`

    // One of specific values
    Priority int `validate:"oneof=1 2 3 4 5"`

    // Numeric string that can be parsed
    NumericString string `validate:"numeric"`

    // Must be a positive number
    Positive int `validate:"min=1"`
}

// Product shows a practical example combining validations
type Product struct {
    Name        string  `validate:"required,min=2,max=100"`
    Price       float64 `validate:"required,gt=0"`
    Quantity    int     `validate:"gte=0"`
    Discount    float64 `validate:"gte=0,lte=100"` // Percentage
    CategoryID  int     `validate:"required,gt=0"`
}
```

### Slice and Map Validations

Validating collections requires special attention. Here's how to validate slices and maps.

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// CollectionValidations demonstrates slice and map validation
type CollectionValidations struct {
    // Slice must have between 1 and 10 elements
    Tags []string `validate:"required,min=1,max=10"`

    // Each element in the slice must be at least 2 characters
    Categories []string `validate:"required,dive,min=2"`

    // Slice of unique values
    UniqueIDs []int `validate:"unique"`

    // Map with required keys
    Metadata map[string]string `validate:"required,min=1"`

    // Validate map keys and values
    Settings map[string]int `validate:"dive,keys,min=1,endkeys,gte=0"`
}

// Order demonstrates nested struct validation with slices
type Order struct {
    ID        string      `validate:"required,uuid4"`
    Items     []OrderItem `validate:"required,min=1,dive"`
    Total     float64     `validate:"required,gt=0"`
}

// OrderItem represents an item in an order
type OrderItem struct {
    ProductID string  `validate:"required"`
    Quantity  int     `validate:"required,gt=0"`
    Price     float64 `validate:"required,gt=0"`
}

func main() {
    validate := validator.New()

    order := Order{
        ID: "550e8400-e29b-41d4-a716-446655440000",
        Items: []OrderItem{
            {ProductID: "prod-1", Quantity: 2, Price: 29.99},
            {ProductID: "prod-2", Quantity: 1, Price: 49.99},
        },
        Total: 109.97,
    }

    if err := validate.Struct(order); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("Order is valid!")
    }
}
```

### Conditional Validations

Sometimes validation depends on other fields or conditions.

```go
package main

import (
    "github.com/go-playground/validator/v10"
)

// ConditionalValidation demonstrates conditional validation tags
type ConditionalValidation struct {
    // Required if another field has a specific value
    PaymentType string `validate:"required,oneof=card bank crypto"`

    // Required only if PaymentType is "card"
    CardNumber string `validate:"required_if=PaymentType card"`

    // Required unless PaymentType is "crypto"
    BankAccount string `validate:"required_unless=PaymentType crypto"`

    // Required if CardNumber is not empty
    CVV string `validate:"required_with=CardNumber"`

    // Required if any of these fields are present
    Country string `validate:"required_with_all=City Street"`
    City    string
    Street  string

    // Excluded if PaymentType is "crypto"
    ExpiryDate string `validate:"excluded_if=PaymentType crypto"`
}

// Subscription shows omitempty usage for optional fields
type Subscription struct {
    // Required field
    Plan string `validate:"required,oneof=free basic premium"`

    // Only validated if not empty
    PromoCode string `validate:"omitempty,len=8,alphanum"`

    // Optional with validation if provided
    ReferralID string `validate:"omitempty,uuid4"`
}
```

## Custom Validation Functions

Built-in validators cover most cases, but you'll often need custom validation logic.

### Simple Custom Validator

This example shows how to create a basic custom validator for password strength.

```go
package main

import (
    "fmt"
    "regexp"
    "unicode"

    "github.com/go-playground/validator/v10"
)

// strongPassword validates that a password meets security requirements
func strongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    // Minimum 8 characters
    if len(password) < 8 {
        return false
    }

    var (
        hasUpper   bool
        hasLower   bool
        hasNumber  bool
        hasSpecial bool
    )

    // Check each character for required types
    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsNumber(char):
            hasNumber = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }

    return hasUpper && hasLower && hasNumber && hasSpecial
}

// noWhitespace validates that a field contains no whitespace
func noWhitespace(fl validator.FieldLevel) bool {
    value := fl.Field().String()
    return !regexp.MustCompile(`\s`).MatchString(value)
}

// UserRegistration uses custom validators
type UserRegistration struct {
    Username string `validate:"required,min=3,max=32,nowhitespace"`
    Password string `validate:"required,strongpassword"`
    Email    string `validate:"required,email"`
}

func main() {
    validate := validator.New()

    // Register custom validators
    validate.RegisterValidation("strongpassword", strongPassword)
    validate.RegisterValidation("nowhitespace", noWhitespace)

    user := UserRegistration{
        Username: "johndoe",
        Password: "WeakPass",  // Missing special character
        Email:    "john@example.com",
    }

    if err := validate.Struct(user); err != nil {
        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                fmt.Printf("Field '%s' failed on '%s' validation\n",
                    e.Field(), e.Tag())
            }
        }
    }
}
```

### Custom Validator with Parameters

You can create validators that accept parameters for more flexible validation.

```go
package main

import (
    "fmt"
    "strconv"
    "strings"
    "time"

    "github.com/go-playground/validator/v10"
)

// dateAfter validates that a date is after a specified reference date
// Usage: validate:"dateafter=2020-01-01"
func dateAfter(fl validator.FieldLevel) bool {
    // Get the parameter (the reference date)
    param := fl.Param()

    // Parse the reference date
    refDate, err := time.Parse("2006-01-02", param)
    if err != nil {
        return false
    }

    // Get the field value
    fieldValue := fl.Field().Interface()

    // Handle different date types
    switch v := fieldValue.(type) {
    case time.Time:
        return v.After(refDate)
    case string:
        date, err := time.Parse("2006-01-02", v)
        if err != nil {
            return false
        }
        return date.After(refDate)
    }

    return false
}

// divisibleBy validates that a number is divisible by the parameter
// Usage: validate:"divisibleby=5"
func divisibleBy(fl validator.FieldLevel) bool {
    param := fl.Param()
    divisor, err := strconv.Atoi(param)
    if err != nil || divisor == 0 {
        return false
    }

    value := fl.Field().Int()
    return value%int64(divisor) == 0
}

// inList validates that a value is in a comma-separated list
// Usage: validate:"inlist=active;inactive;pending"
func inList(fl validator.FieldLevel) bool {
    param := fl.Param()
    allowedValues := strings.Split(param, ";")

    value := fl.Field().String()

    for _, allowed := range allowedValues {
        if value == allowed {
            return true
        }
    }
    return false
}

// Event demonstrates validators with parameters
type Event struct {
    Name      string    `validate:"required"`
    StartDate time.Time `validate:"required,dateafter=2024-01-01"`
    Capacity  int       `validate:"required,divisibleby=10"`
    Status    string    `validate:"required,inlist=draft;published;cancelled"`
}

func main() {
    validate := validator.New()

    // Register parameterized validators
    validate.RegisterValidation("dateafter", dateAfter)
    validate.RegisterValidation("divisibleby", divisibleBy)
    validate.RegisterValidation("inlist", inList)

    event := Event{
        Name:      "Go Conference",
        StartDate: time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC),
        Capacity:  150,
        Status:    "published",
    }

    if err := validate.Struct(event); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("Event is valid!")
    }
}
```

### Struct-Level Validation

For complex validation logic that spans multiple fields, use struct-level validators.

```go
package main

import (
    "fmt"
    "time"

    "github.com/go-playground/validator/v10"
)

// DateRange represents a time period with start and end dates
type DateRange struct {
    StartDate time.Time `validate:"required"`
    EndDate   time.Time `validate:"required"`
}

// dateRangeValidation ensures EndDate is after StartDate
func dateRangeValidation(sl validator.StructLevel) {
    dateRange := sl.Current().Interface().(DateRange)

    if !dateRange.EndDate.After(dateRange.StartDate) {
        sl.ReportError(dateRange.EndDate, "EndDate", "EndDate",
            "daterange", "must be after StartDate")
    }
}

// PasswordChange requires matching passwords
type PasswordChange struct {
    CurrentPassword string `validate:"required,min=8"`
    NewPassword     string `validate:"required,min=8"`
    ConfirmPassword string `validate:"required"`
}

// passwordChangeValidation ensures passwords match and new differs from old
func passwordChangeValidation(sl validator.StructLevel) {
    pc := sl.Current().Interface().(PasswordChange)

    // Check if new password matches confirmation
    if pc.NewPassword != pc.ConfirmPassword {
        sl.ReportError(pc.ConfirmPassword, "ConfirmPassword",
            "ConfirmPassword", "passwordmatch", "")
    }

    // Check if new password is different from current
    if pc.NewPassword == pc.CurrentPassword {
        sl.ReportError(pc.NewPassword, "NewPassword", "NewPassword",
            "passworddifferent", "")
    }
}

func main() {
    validate := validator.New()

    // Register struct-level validators
    validate.RegisterStructValidation(dateRangeValidation, DateRange{})
    validate.RegisterStructValidation(passwordChangeValidation, PasswordChange{})

    // Test DateRange validation
    dateRange := DateRange{
        StartDate: time.Now(),
        EndDate:   time.Now().Add(-24 * time.Hour), // Invalid: before start
    }

    if err := validate.Struct(dateRange); err != nil {
        fmt.Println("DateRange validation failed:", err)
    }

    // Test PasswordChange validation
    pwChange := PasswordChange{
        CurrentPassword: "OldPassword123!",
        NewPassword:     "NewPassword456!",
        ConfirmPassword: "DifferentPassword!", // Doesn't match
    }

    if err := validate.Struct(pwChange); err != nil {
        fmt.Println("PasswordChange validation failed:", err)
    }
}
```

## Cross-Field Validation

Cross-field validation allows you to compare fields against each other.

### Built-in Cross-Field Tags

The validator provides several built-in cross-field comparison tags.

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// CrossFieldValidation demonstrates field comparison validators
type CrossFieldValidation struct {
    // Basic field comparison
    Password        string `validate:"required,min=8"`
    ConfirmPassword string `validate:"required,eqfield=Password"`

    // Greater than another field
    MaxPrice float64 `validate:"gtfield=MinPrice"`
    MinPrice float64 `validate:"required"`

    // Less than or equal to another field
    StartPage int `validate:"required,ltefield=EndPage"`
    EndPage   int `validate:"required"`

    // Not equal to another field
    NewEmail     string `validate:"required,email,nefield=CurrentEmail"`
    CurrentEmail string `validate:"required,email"`
}

// AuctionBid shows a practical cross-field example
type AuctionBid struct {
    ItemID     string  `validate:"required,uuid4"`
    CurrentBid float64 `validate:"required,gt=0"`
    NewBid     float64 `validate:"required,gtfield=CurrentBid"`
    MaxAutoBid float64 `validate:"omitempty,gtfield=NewBid"`
}

func main() {
    validate := validator.New()

    bid := AuctionBid{
        ItemID:     "550e8400-e29b-41d4-a716-446655440000",
        CurrentBid: 100.00,
        NewBid:     150.00,
        MaxAutoBid: 200.00,
    }

    if err := validate.Struct(bid); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("Bid is valid!")
    }

    // Invalid bid - new bid is lower than current
    invalidBid := AuctionBid{
        ItemID:     "550e8400-e29b-41d4-a716-446655440000",
        CurrentBid: 100.00,
        NewBid:     50.00,  // Invalid: less than CurrentBid
    }

    if err := validate.Struct(invalidBid); err != nil {
        fmt.Println("Invalid bid:", err)
    }
}
```

### Cross-Struct Field Validation

You can also validate fields across nested structs.

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

// Address represents a shipping or billing address
type Address struct {
    Street  string `validate:"required"`
    City    string `validate:"required"`
    Country string `validate:"required,iso3166_1_alpha2"`
    ZipCode string `validate:"required"`
}

// Checkout demonstrates validation across nested structs
type Checkout struct {
    BillingAddress  Address `validate:"required"`
    ShippingAddress Address `validate:"required"`
    SameAsBilling   bool
}

// checkoutValidation ensures shipping address matches billing if flag is set
func checkoutValidation(sl validator.StructLevel) {
    checkout := sl.Current().Interface().(Checkout)

    if checkout.SameAsBilling {
        // If same as billing is set, shipping should match billing
        if checkout.ShippingAddress.Street != checkout.BillingAddress.Street ||
           checkout.ShippingAddress.City != checkout.BillingAddress.City ||
           checkout.ShippingAddress.Country != checkout.BillingAddress.Country ||
           checkout.ShippingAddress.ZipCode != checkout.BillingAddress.ZipCode {
            sl.ReportError(checkout.ShippingAddress, "ShippingAddress",
                "ShippingAddress", "sameasbilling", "")
        }
    }
}

func main() {
    validate := validator.New()
    validate.RegisterStructValidation(checkoutValidation, Checkout{})

    checkout := Checkout{
        BillingAddress: Address{
            Street:  "123 Main St",
            City:    "New York",
            Country: "US",
            ZipCode: "10001",
        },
        ShippingAddress: Address{
            Street:  "123 Main St",
            City:    "New York",
            Country: "US",
            ZipCode: "10001",
        },
        SameAsBilling: true,
    }

    if err := validate.Struct(checkout); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("Checkout is valid!")
    }
}
```

## Custom Error Messages and Translations

Default error messages are technical and not user-friendly. Let's create better error messages.

### Basic Error Message Translation

This approach provides human-readable error messages for validation failures.

```go
package main

import (
    "fmt"
    "strings"

    "github.com/go-playground/validator/v10"
)

// ValidationError represents a user-friendly validation error
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

// translateError converts a validator.FieldError to a user-friendly message
func translateError(fe validator.FieldError) ValidationError {
    field := strings.ToLower(fe.Field())

    // Map of validation tags to human-readable messages
    messages := map[string]string{
        "required":     fmt.Sprintf("%s is required", field),
        "email":        fmt.Sprintf("%s must be a valid email address", field),
        "min":          fmt.Sprintf("%s must be at least %s characters", field, fe.Param()),
        "max":          fmt.Sprintf("%s must not exceed %s characters", field, fe.Param()),
        "gte":          fmt.Sprintf("%s must be greater than or equal to %s", field, fe.Param()),
        "lte":          fmt.Sprintf("%s must be less than or equal to %s", field, fe.Param()),
        "gt":           fmt.Sprintf("%s must be greater than %s", field, fe.Param()),
        "lt":           fmt.Sprintf("%s must be less than %s", field, fe.Param()),
        "eqfield":      fmt.Sprintf("%s must match %s", field, fe.Param()),
        "oneof":        fmt.Sprintf("%s must be one of: %s", field, fe.Param()),
        "url":          fmt.Sprintf("%s must be a valid URL", field),
        "uuid4":        fmt.Sprintf("%s must be a valid UUID", field),
        "alphanum":     fmt.Sprintf("%s must contain only alphanumeric characters", field),
        "numeric":      fmt.Sprintf("%s must be a number", field),
    }

    if msg, ok := messages[fe.Tag()]; ok {
        return ValidationError{Field: field, Message: msg}
    }

    // Default message for unknown tags
    return ValidationError{
        Field:   field,
        Message: fmt.Sprintf("%s failed validation on %s", field, fe.Tag()),
    }
}

// TranslateValidationErrors converts all validation errors to user-friendly format
func TranslateValidationErrors(err error) []ValidationError {
    var errors []ValidationError

    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, fe := range validationErrors {
            errors = append(errors, translateError(fe))
        }
    }

    return errors
}

// UserRequest demonstrates a typical API request
type UserRequest struct {
    Username string `validate:"required,min=3,max=32"`
    Email    string `validate:"required,email"`
    Age      int    `validate:"required,gte=18,lte=120"`
    Website  string `validate:"omitempty,url"`
}

func main() {
    validate := validator.New()

    user := UserRequest{
        Username: "ab",            // Too short
        Email:    "invalid",       // Invalid email
        Age:      15,              // Below minimum
        Website:  "not-a-url",     // Invalid URL
    }

    err := validate.Struct(user)
    if err != nil {
        errors := TranslateValidationErrors(err)
        for _, e := range errors {
            fmt.Printf("[%s] %s\n", e.Field, e.Message)
        }
    }
}
```

### Advanced Translation with Universal Translator

For production applications, use the universal translator for i18n support.

```go
package main

import (
    "fmt"

    "github.com/go-playground/locales/en"
    "github.com/go-playground/locales/es"
    ut "github.com/go-playground/universal-translator"
    "github.com/go-playground/validator/v10"
    en_translations "github.com/go-playground/validator/v10/translations/en"
    es_translations "github.com/go-playground/validator/v10/translations/es"
)

// ValidatorWithTranslator holds the validator and translator instances
type ValidatorWithTranslator struct {
    Validate   *validator.Validate
    Translator ut.Translator
}

// NewValidatorWithTranslator creates a new validator with translation support
func NewValidatorWithTranslator(locale string) (*ValidatorWithTranslator, error) {
    // Create locale translators
    enLocale := en.New()
    esLocale := es.New()

    // Create universal translator with English as fallback
    uni := ut.New(enLocale, enLocale, esLocale)

    // Get translator for requested locale
    trans, found := uni.GetTranslator(locale)
    if !found {
        trans, _ = uni.GetTranslator("en")
    }

    // Create validator
    validate := validator.New()

    // Register translations based on locale
    switch locale {
    case "es":
        es_translations.RegisterDefaultTranslations(validate, trans)
    default:
        en_translations.RegisterDefaultTranslations(validate, trans)
    }

    return &ValidatorWithTranslator{
        Validate:   validate,
        Translator: trans,
    }, nil
}

// ValidateStruct validates a struct and returns translated errors
func (v *ValidatorWithTranslator) ValidateStruct(s interface{}) map[string]string {
    errors := make(map[string]string)

    err := v.Validate.Struct(s)
    if err != nil {
        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                errors[e.Field()] = e.Translate(v.Translator)
            }
        }
    }

    return errors
}

// RegisterRequest represents a registration form
type RegisterRequest struct {
    Username string `validate:"required,min=3,max=20"`
    Email    string `validate:"required,email"`
    Password string `validate:"required,min=8"`
}

func main() {
    // Create validator with English translations
    enValidator, _ := NewValidatorWithTranslator("en")

    // Create validator with Spanish translations
    esValidator, _ := NewValidatorWithTranslator("es")

    request := RegisterRequest{
        Username: "ab",
        Email:    "invalid",
        Password: "short",
    }

    // English errors
    fmt.Println("English errors:")
    for field, msg := range enValidator.ValidateStruct(request) {
        fmt.Printf("  %s: %s\n", field, msg)
    }

    // Spanish errors
    fmt.Println("\nSpanish errors:")
    for field, msg := range esValidator.ValidateStruct(request) {
        fmt.Printf("  %s: %s\n", field, msg)
    }
}
```

### Custom Translation Registration

Register custom error messages for your custom validators.

```go
package main

import (
    "fmt"

    "github.com/go-playground/locales/en"
    ut "github.com/go-playground/universal-translator"
    "github.com/go-playground/validator/v10"
    en_translations "github.com/go-playground/validator/v10/translations/en"
)

// Setup creates a validator with custom translations
func Setup() (*validator.Validate, ut.Translator) {
    enLocale := en.New()
    uni := ut.New(enLocale, enLocale)
    trans, _ := uni.GetTranslator("en")

    validate := validator.New()
    en_translations.RegisterDefaultTranslations(validate, trans)

    // Register custom validator
    validate.RegisterValidation("strongpassword", func(fl validator.FieldLevel) bool {
        // Password validation logic here
        return len(fl.Field().String()) >= 8
    })

    // Register custom translation for the custom validator
    validate.RegisterTranslation("strongpassword", trans,
        // Registration function - defines the translation
        func(ut ut.Translator) error {
            return ut.Add("strongpassword",
                "{0} must contain at least 8 characters with uppercase, lowercase, number, and special character",
                true)
        },
        // Translation function - formats the message
        func(ut ut.Translator, fe validator.FieldError) string {
            t, _ := ut.T("strongpassword", fe.Field())
            return t
        },
    )

    return validate, trans
}

// AccountRequest uses the custom validator
type AccountRequest struct {
    Email    string `validate:"required,email"`
    Password string `validate:"required,strongpassword"`
}

func main() {
    validate, trans := Setup()

    request := AccountRequest{
        Email:    "user@example.com",
        Password: "weak",
    }

    err := validate.Struct(request)
    if err != nil {
        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                fmt.Println(e.Translate(trans))
            }
        }
    }
}
```

## Integration with Web Frameworks

Let's see how to integrate the validator with popular Go web frameworks.

### Integration with Gin

Gin has built-in support for go-playground/validator.

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/gin-gonic/gin/binding"
    "github.com/go-playground/validator/v10"
)

// APIResponse standardizes API responses
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Errors  interface{} `json:"errors,omitempty"`
}

// CreateUserRequest represents user creation payload
type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=32"`
    Email    string `json:"email" binding:"required,email"`
    Age      int    `json:"age" binding:"required,gte=18,lte=120"`
}

// formatValidationErrors converts Gin validation errors to API format
func formatValidationErrors(err error) map[string]string {
    errors := make(map[string]string)

    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, e := range validationErrors {
            errors[e.Field()] = formatFieldError(e)
        }
    }

    return errors
}

// formatFieldError creates a human-readable error message
func formatFieldError(fe validator.FieldError) string {
    switch fe.Tag() {
    case "required":
        return "This field is required"
    case "email":
        return "Must be a valid email address"
    case "min":
        return "Must be at least " + fe.Param() + " characters"
    case "max":
        return "Must not exceed " + fe.Param() + " characters"
    case "gte":
        return "Must be at least " + fe.Param()
    case "lte":
        return "Must be at most " + fe.Param()
    default:
        return "Invalid value"
    }
}

// RegisterCustomValidators adds custom validators to Gin's binding
func RegisterCustomValidators() {
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        // Register custom validators here
        v.RegisterValidation("nowhitespace", func(fl validator.FieldLevel) bool {
            return !contains(fl.Field().String(), " ")
        })
    }
}

func contains(s, substr string) bool {
    for i := 0; i < len(s); i++ {
        if string(s[i]) == substr {
            return true
        }
    }
    return false
}

func main() {
    router := gin.Default()

    // Register custom validators
    RegisterCustomValidators()

    // Create user endpoint
    router.POST("/users", func(c *gin.Context) {
        var request CreateUserRequest

        // ShouldBindJSON automatically validates the request
        if err := c.ShouldBindJSON(&request); err != nil {
            c.JSON(http.StatusBadRequest, APIResponse{
                Success: false,
                Errors:  formatValidationErrors(err),
            })
            return
        }

        // Process valid request
        c.JSON(http.StatusCreated, APIResponse{
            Success: true,
            Data: map[string]interface{}{
                "username": request.Username,
                "email":    request.Email,
                "age":      request.Age,
            },
        })
    })

    router.Run(":8080")
}
```

### Integration with Echo

Echo framework integration with custom validation middleware.

```go
package main

import (
    "net/http"

    "github.com/go-playground/validator/v10"
    "github.com/labstack/echo/v4"
)

// CustomValidator implements echo.Validator interface
type CustomValidator struct {
    validator *validator.Validate
}

// NewCustomValidator creates a validator for Echo
func NewCustomValidator() *CustomValidator {
    v := validator.New()

    // Register custom validators
    v.RegisterValidation("strongpassword", func(fl validator.FieldLevel) bool {
        return len(fl.Field().String()) >= 8
    })

    return &CustomValidator{validator: v}
}

// Validate implements the Validator interface
func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.validator.Struct(i)
}

// ValidationErrorResponse represents validation error format
type ValidationErrorResponse struct {
    Errors map[string]string `json:"errors"`
}

// formatErrors converts validation errors to a map
func formatErrors(err error) map[string]string {
    errors := make(map[string]string)

    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, e := range validationErrors {
            errors[e.Field()] = e.Error()
        }
    }

    return errors
}

// CreateProductRequest represents product creation payload
type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required,min=2,max=100"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Description string  `json:"description" validate:"max=1000"`
    Category    string  `json:"category" validate:"required,oneof=electronics clothing food"`
}

func main() {
    e := echo.New()

    // Set custom validator
    e.Validator = NewCustomValidator()

    // Create product endpoint
    e.POST("/products", func(c echo.Context) error {
        request := new(CreateProductRequest)

        // Bind request body
        if err := c.Bind(request); err != nil {
            return c.JSON(http.StatusBadRequest, map[string]string{
                "error": "Invalid request body",
            })
        }

        // Validate request
        if err := c.Validate(request); err != nil {
            return c.JSON(http.StatusBadRequest, ValidationErrorResponse{
                Errors: formatErrors(err),
            })
        }

        // Process valid request
        return c.JSON(http.StatusCreated, map[string]interface{}{
            "message": "Product created successfully",
            "product": request,
        })
    })

    e.Start(":8080")
}
```

### Integration with Standard Library net/http

Pure standard library integration without third-party frameworks.

```go
package main

import (
    "encoding/json"
    "net/http"
    "sync"

    "github.com/go-playground/validator/v10"
)

// Global validator with singleton pattern
var (
    validate *validator.Validate
    once     sync.Once
)

// getValidator returns the singleton validator instance
func getValidator() *validator.Validate {
    once.Do(func() {
        validate = validator.New()
        // Register custom validators here
    })
    return validate
}

// APIError represents an API error response
type APIError struct {
    Code    int               `json:"code"`
    Message string            `json:"message"`
    Errors  map[string]string `json:"errors,omitempty"`
}

// CreateOrderRequest represents an order creation payload
type CreateOrderRequest struct {
    CustomerID string      `json:"customer_id" validate:"required,uuid4"`
    Items      []OrderItem `json:"items" validate:"required,min=1,dive"`
    Notes      string      `json:"notes" validate:"max=500"`
}

// OrderItem represents an item in an order
type OrderItem struct {
    ProductID string  `json:"product_id" validate:"required"`
    Quantity  int     `json:"quantity" validate:"required,gt=0,lte=100"`
    Price     float64 `json:"price" validate:"required,gt=0"`
}

// validateRequest decodes and validates a JSON request body
func validateRequest(r *http.Request, dst interface{}) *APIError {
    // Decode JSON body
    if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
        return &APIError{
            Code:    http.StatusBadRequest,
            Message: "Invalid JSON format",
        }
    }

    // Validate struct
    if err := getValidator().Struct(dst); err != nil {
        errors := make(map[string]string)

        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                errors[e.Field()] = formatFieldError(e)
            }
        }

        return &APIError{
            Code:    http.StatusBadRequest,
            Message: "Validation failed",
            Errors:  errors,
        }
    }

    return nil
}

// formatFieldError creates user-friendly error messages
func formatFieldError(fe validator.FieldError) string {
    switch fe.Tag() {
    case "required":
        return "This field is required"
    case "uuid4":
        return "Must be a valid UUID"
    case "min":
        return "Must have at least " + fe.Param() + " items"
    case "max":
        return "Must not exceed " + fe.Param() + " characters"
    case "gt":
        return "Must be greater than " + fe.Param()
    case "lte":
        return "Must be at most " + fe.Param()
    default:
        return "Invalid value"
    }
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

// createOrderHandler handles order creation
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        writeJSON(w, http.StatusMethodNotAllowed, APIError{
            Code:    http.StatusMethodNotAllowed,
            Message: "Method not allowed",
        })
        return
    }

    var request CreateOrderRequest

    if apiErr := validateRequest(r, &request); apiErr != nil {
        writeJSON(w, apiErr.Code, apiErr)
        return
    }

    // Process valid request
    writeJSON(w, http.StatusCreated, map[string]interface{}{
        "message":  "Order created successfully",
        "order_id": "ord-123456",
    })
}

func main() {
    http.HandleFunc("/orders", createOrderHandler)
    http.ListenAndServe(":8080", nil)
}
```

## Best Practices

Following best practices ensures your validation layer is maintainable and efficient.

### 1. Use a Singleton Validator

Creating validators is expensive. Always reuse a single instance.

```go
// Good: Singleton pattern
var validate = validator.New()

// Bad: Creating new validator per request
func handleRequest() {
    validate := validator.New() // Expensive!
}
```

### 2. Separate Validation Logic from Handlers

Keep your handlers clean by extracting validation into separate functions.

```go
// validators/user.go
package validators

// UserValidator handles all user-related validations
type UserValidator struct {
    validate *validator.Validate
}

func (v *UserValidator) ValidateCreateUser(req CreateUserRequest) error {
    return v.validate.Struct(req)
}

func (v *UserValidator) ValidateUpdateUser(req UpdateUserRequest) error {
    return v.validate.Struct(req)
}
```

### 3. Use JSON Tags with Validation Tags

Ensure consistent field naming in validation errors.

```go
// Use both json and validate tags
type Request struct {
    Email string `json:"email" validate:"required,email"`
}

// Register json tag name usage
validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
    name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
    if name == "-" {
        return ""
    }
    return name
})
```

### 4. Document Custom Validators

Always document what your custom validators do.

```go
// validateBusinessEmail checks if email belongs to a business domain
// It rejects common personal email providers like gmail.com, yahoo.com
// Usage: validate:"businessemail"
func validateBusinessEmail(fl validator.FieldLevel) bool {
    // Implementation
}
```

### 5. Test Your Validators

Write comprehensive tests for custom validators.

```go
func TestStrongPassword(t *testing.T) {
    tests := []struct {
        name     string
        password string
        want     bool
    }{
        {"valid password", "Password123!", true},
        {"no uppercase", "password123!", false},
        {"no number", "Password!!!", false},
        {"too short", "Pass1!", false},
    }

    validate := validator.New()
    validate.RegisterValidation("strongpassword", strongPassword)

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            type test struct {
                Password string `validate:"strongpassword"`
            }
            err := validate.Struct(test{Password: tt.password})
            got := err == nil
            if got != tt.want {
                t.Errorf("strongPassword(%s) = %v, want %v", tt.password, got, tt.want)
            }
        })
    }
}
```

## Conclusion

The `go-playground/validator` package provides a powerful and flexible way to implement request validation in Go applications. By leveraging struct tags, custom validators, and proper error handling, you can build robust validation layers that ensure data integrity and provide excellent user experience.

Key takeaways:

1. **Use built-in validators** for common cases like email, URL, and length constraints
2. **Create custom validators** for domain-specific rules
3. **Implement struct-level validation** for cross-field dependencies
4. **Translate errors** into user-friendly messages
5. **Integrate with your framework** using middleware or custom validators
6. **Follow best practices** like singleton patterns and proper testing

With these techniques, you can confidently validate incoming requests and protect your application from malformed or malicious data.

## Resources

- [go-playground/validator GitHub Repository](https://github.com/go-playground/validator)
- [Validator Documentation](https://pkg.go.dev/github.com/go-playground/validator/v10)
- [Universal Translator](https://github.com/go-playground/universal-translator)
- [Gin Framework Validation](https://gin-gonic.com/docs/examples/binding-and-validation/)
