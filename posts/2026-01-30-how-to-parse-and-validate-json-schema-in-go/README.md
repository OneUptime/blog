# How to Parse and Validate JSON Schema in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, JSON, Validation, API

Description: Learn how to parse and validate JSON data against schemas in Go using popular libraries for robust API validation.

---

When building APIs in Go, validating incoming JSON data is essential for maintaining data integrity and preventing bugs. JSON Schema provides a standardized way to define the structure and constraints of your JSON data. In this post, we will explore how to parse and validate JSON against schemas in Go.

## What is JSON Schema?

JSON Schema is a vocabulary that allows you to annotate and validate JSON documents. It defines the expected structure, data types, required fields, and constraints for your JSON data. Here is a simple example:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    }
  },
  "required": ["name", "email"]
}
```

This schema defines an object with a required name and email, plus an optional age field with constraints.

## Using gojsonschema Library

The `gojsonschema` library is one of the most popular choices for JSON Schema validation in Go. Let's start by installing it:

```bash
go get github.com/xeipuuv/gojsonschema
```

Here is a basic example of validating JSON against a schema:

```go
package main

import (
    "fmt"
    "github.com/xeipuuv/gojsonschema"
)

func main() {
    // Define the JSON schema
    schemaLoader := gojsonschema.NewStringLoader(`{
        "type": "object",
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "email": {"type": "string", "format": "email"},
            "age": {"type": "integer", "minimum": 0}
        },
        "required": ["name", "email"]
    }`)

    // Define the JSON document to validate
    documentLoader := gojsonschema.NewStringLoader(`{
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
    }`)

    // Perform validation
    result, err := gojsonschema.Validate(schemaLoader, documentLoader)
    if err != nil {
        fmt.Printf("Validation error: %v\n", err)
        return
    }

    // Check if the document is valid
    if result.Valid() {
        fmt.Println("Document is valid!")
    } else {
        fmt.Println("Document is invalid:")
        for _, desc := range result.Errors() {
            fmt.Printf("  - %s\n", desc)
        }
    }
}
```

## Loading Schemas from Files

For production applications, you will often load schemas from files:

```go
package main

import (
    "fmt"
    "github.com/xeipuuv/gojsonschema"
)

func validateFromFile(schemaPath, documentPath string) error {
    // Load schema from file using file:// URI
    schemaLoader := gojsonschema.NewReferenceLoader("file://" + schemaPath)

    // Load document from file
    documentLoader := gojsonschema.NewReferenceLoader("file://" + documentPath)

    result, err := gojsonschema.Validate(schemaLoader, documentLoader)
    if err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    if !result.Valid() {
        // Collect all validation errors
        var errMsg string
        for _, desc := range result.Errors() {
            errMsg += fmt.Sprintf("%s; ", desc)
        }
        return fmt.Errorf("invalid document: %s", errMsg)
    }

    return nil
}
```

## Building a Custom Validator

For reusable validation logic, wrap the functionality in a custom validator struct:

```go
package validator

import (
    "encoding/json"
    "fmt"
    "github.com/xeipuuv/gojsonschema"
)

// JSONValidator handles JSON schema validation
type JSONValidator struct {
    schema *gojsonschema.Schema
}

// NewJSONValidator creates a validator with the given schema
func NewJSONValidator(schemaJSON string) (*JSONValidator, error) {
    schemaLoader := gojsonschema.NewStringLoader(schemaJSON)

    // Compile the schema once for reuse
    schema, err := gojsonschema.NewSchema(schemaLoader)
    if err != nil {
        return nil, fmt.Errorf("invalid schema: %w", err)
    }

    return &JSONValidator{schema: schema}, nil
}

// Validate checks if the data conforms to the schema
func (v *JSONValidator) Validate(data interface{}) error {
    // Convert data to JSON bytes
    jsonBytes, err := json.Marshal(data)
    if err != nil {
        return fmt.Errorf("failed to marshal data: %w", err)
    }

    // Create a loader from the JSON bytes
    documentLoader := gojsonschema.NewBytesLoader(jsonBytes)

    // Run validation
    result, err := v.schema.Validate(documentLoader)
    if err != nil {
        return fmt.Errorf("validation error: %w", err)
    }

    if !result.Valid() {
        return &ValidationError{Errors: result.Errors()}
    }

    return nil
}

// ValidationError contains all validation errors
type ValidationError struct {
    Errors []gojsonschema.ResultError
}

func (e *ValidationError) Error() string {
    msg := "validation failed:"
    for _, err := range e.Errors {
        msg += fmt.Sprintf(" [%s: %s]", err.Field(), err.Description())
    }
    return msg
}
```

## Validating API Requests

Here is a practical example of validating HTTP API requests:

```go
package main

import (
    "encoding/json"
    "net/http"
)

// userSchema defines the expected structure for user creation
const userSchema = `{
    "type": "object",
    "properties": {
        "username": {
            "type": "string",
            "minLength": 3,
            "maxLength": 50,
            "pattern": "^[a-zA-Z0-9_]+$"
        },
        "email": {
            "type": "string",
            "format": "email"
        },
        "password": {
            "type": "string",
            "minLength": 8
        }
    },
    "required": ["username", "email", "password"],
    "additionalProperties": false
}`

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    // Initialize the validator
    validator, err := NewJSONValidator(userSchema)
    if err != nil {
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }

    // Parse the request body
    var requestData map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
        http.Error(w, "Invalid JSON format", http.StatusBadRequest)
        return
    }

    // Validate against schema
    if err := validator.Validate(requestData); err != nil {
        // Return detailed validation errors to the client
        response := map[string]string{"error": err.Error()}
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(response)
        return
    }

    // Process the valid request
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "User created"})
}
```

## Error Handling Best Practices

When handling validation errors, provide clear feedback to API consumers:

```go
// FormatValidationErrors converts validation errors to a structured response
func FormatValidationErrors(result *gojsonschema.Result) map[string][]string {
    errors := make(map[string][]string)

    for _, err := range result.Errors() {
        field := err.Field()
        if field == "(root)" {
            field = "_root"
        }
        errors[field] = append(errors[field], err.Description())
    }

    return errors
}
```

## Conclusion

JSON Schema validation in Go provides a robust way to ensure data integrity in your APIs. The `gojsonschema` library offers comprehensive support for JSON Schema drafts and integrates well with Go's type system. By implementing schema validation at your API boundaries, you can catch invalid data early and provide meaningful error messages to your clients.

Key takeaways:
- Use JSON Schema to define clear contracts for your API data
- Compile schemas once and reuse them for better performance
- Provide detailed error messages to help API consumers fix issues
- Consider using custom validators to encapsulate validation logic
