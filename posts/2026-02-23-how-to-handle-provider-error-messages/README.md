# How to Handle Provider Error Messages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Error Handling, Diagnostics, Infrastructure as Code

Description: Learn how to implement clear, actionable error messages in custom Terraform providers using diagnostics, error classification, and user-friendly formatting for better debugging.

---

Error handling can make or break the user experience of a Terraform provider. When something goes wrong, the error message is the only thing standing between the user and hours of debugging. A good error message tells the user what went wrong, why it happened, and how to fix it. A bad error message leaves them searching through logs and documentation.

In this guide, we will cover how to implement effective error handling in your custom Terraform provider using the diagnostics system, error classification, and best practices for writing error messages that actually help users.

## Understanding Terraform Diagnostics

The Plugin Framework uses a diagnostics system for reporting errors and warnings. There are two levels of diagnostics:

- **Errors** - These stop the operation and prevent Terraform from proceeding
- **Warnings** - These inform the user but allow the operation to continue

```go
// Adding an error diagnostic
resp.Diagnostics.AddError(
    "Error Creating Server",                    // Summary (short, descriptive title)
    "Could not create server: API returned 403", // Detail (full explanation)
)

// Adding a warning diagnostic
resp.Diagnostics.AddWarning(
    "Deprecated Feature",
    "The 'size' attribute is deprecated and will be removed in v2.0.0. Use 'cpu' and 'memory' instead.",
)
```

### Attribute-Level Diagnostics

When an error is related to a specific attribute, use `AddAttributeError` to point the user to the exact location:

```go
// Point the error to a specific attribute in the configuration
resp.Diagnostics.AddAttributeError(
    path.Root("region"),
    "Invalid Region",
    fmt.Sprintf(
        "The region %q is not available. Valid regions are: %s",
        plan.Region.ValueString(),
        strings.Join(validRegions, ", "),
    ),
)
```

This produces output that highlights the problematic attribute:

```
Error: Invalid Region

  on main.tf line 5, in resource "example_server" "web":
   5:   region = "invalid-region"

The region "invalid-region" is not available. Valid regions are:
us-east-1, us-west-2, eu-west-1, ap-southeast-1
```

## Structuring Error Messages

A well-structured error message has three parts:

1. **Summary** - A brief title that describes the error category
2. **Detail** - The full explanation with context and guidance
3. **Resolution** - How to fix the problem (included in the detail)

### Good Error Message Pattern

```go
resp.Diagnostics.AddError(
    "Error Creating Server",
    fmt.Sprintf(
        "Could not create server %q in region %q.\n\n"+
            "The API returned: %s\n\n"+
            "Please verify that your API key has the 'servers:create' permission "+
            "and that the specified region is available for your account.",
        plan.Name.ValueString(),
        plan.Region.ValueString(),
        err.Error(),
    ),
)
```

### Bad Error Message Pattern

```go
// Too vague - does not help the user
resp.Diagnostics.AddError("Error", err.Error())

// Missing context - which server? What was being done?
resp.Diagnostics.AddError("API Error", "403 Forbidden")
```

## Classifying API Errors

Different API errors require different handling and messaging. Create an error classification system:

```go
// internal/client/errors.go
package client

import (
    "fmt"
    "net/http"
)

// APIError represents a structured API error
type APIError struct {
    StatusCode int
    Code       string
    Message    string
    RequestID  string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("%s (HTTP %d, code: %s, request_id: %s)",
        e.Message, e.StatusCode, e.Code, e.RequestID)
}

// IsNotFound returns true if the error indicates the resource was not found
func IsNotFound(err error) bool {
    if apiErr, ok := err.(*APIError); ok {
        return apiErr.StatusCode == http.StatusNotFound
    }
    return false
}

// IsConflict returns true if the error indicates a resource conflict
func IsConflict(err error) bool {
    if apiErr, ok := err.(*APIError); ok {
        return apiErr.StatusCode == http.StatusConflict
    }
    return false
}

// IsAuthError returns true if the error is an authentication failure
func IsAuthError(err error) bool {
    if apiErr, ok := err.(*APIError); ok {
        return apiErr.StatusCode == http.StatusUnauthorized ||
            apiErr.StatusCode == http.StatusForbidden
    }
    return false
}

// IsValidationError returns true if the error is a validation failure
func IsValidationError(err error) bool {
    if apiErr, ok := err.(*APIError); ok {
        return apiErr.StatusCode == http.StatusBadRequest ||
            apiErr.StatusCode == http.StatusUnprocessableEntity
    }
    return false
}
```

## Using Error Classification in CRUD Operations

Use the error classification to provide context-specific error messages:

```go
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.CreateServer(ctx, &api.CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
        Size:   plan.Size.ValueString(),
    })
    if err != nil {
        // Provide specific error messages based on error type
        handleCreateError(resp, plan, err)
        return
    }

    // ... rest of create logic ...
}

func handleCreateError(resp *resource.CreateResponse, plan ServerResourceModel, err error) {
    if client.IsAuthError(err) {
        resp.Diagnostics.AddError(
            "Authentication Error",
            "The provider could not authenticate with the API. "+
                "Please verify your API key is correct and has the required permissions.\n\n"+
                fmt.Sprintf("API error: %s", err),
        )
        return
    }

    if client.IsConflict(err) {
        resp.Diagnostics.AddError(
            "Server Already Exists",
            fmt.Sprintf(
                "A server with the name %q already exists in region %q. "+
                    "Either use a different name or import the existing server.\n\n"+
                    "To import: terraform import example_server.<name> <server-id>",
                plan.Name.ValueString(),
                plan.Region.ValueString(),
            ),
        )
        return
    }

    if client.IsValidationError(err) {
        resp.Diagnostics.AddError(
            "Invalid Server Configuration",
            fmt.Sprintf(
                "The API rejected the server configuration. This usually means "+
                    "one or more attribute values are invalid.\n\n"+
                    "API error: %s\n\n"+
                    "Please check the attribute values and try again.",
                err,
            ),
        )
        return
    }

    // Generic error for unexpected cases
    resp.Diagnostics.AddError(
        "Error Creating Server",
        fmt.Sprintf(
            "An unexpected error occurred while creating server %q: %s\n\n"+
                "If this error persists, please file an issue at "+
                "https://github.com/example/terraform-provider-example/issues",
            plan.Name.ValueString(),
            err,
        ),
    )
}
```

## Handling Not Found During Read

A common pattern in Terraform providers is handling the case where a resource has been deleted outside of Terraform:

```go
func (r *ServerResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state ServerResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.GetServer(ctx, state.ID.ValueString())
    if err != nil {
        if client.IsNotFound(err) {
            // Resource was deleted outside of Terraform
            // Remove it from state so Terraform knows to recreate it
            tflog.Warn(ctx, "Server not found, removing from state", map[string]interface{}{
                "server_id": state.ID.ValueString(),
            })
            resp.State.RemoveResource(ctx)
            return
        }

        resp.Diagnostics.AddError(
            "Error Reading Server",
            fmt.Sprintf(
                "Could not read server %s: %s",
                state.ID.ValueString(),
                err,
            ),
        )
        return
    }

    // ... update state with server data ...
}
```

## Including Request IDs

When API errors occur, including the request ID helps both users and support teams debug issues:

```go
func formatAPIError(operation string, resourceName string, err error) (string, string) {
    summary := fmt.Sprintf("Error %s %s", operation, resourceName)

    detail := fmt.Sprintf("An error occurred while %s: %s", strings.ToLower(operation), err)

    // Include request ID if available
    if apiErr, ok := err.(*client.APIError); ok && apiErr.RequestID != "" {
        detail += fmt.Sprintf(
            "\n\nRequest ID: %s\n"+
                "If you need to contact support, please include this request ID.",
            apiErr.RequestID,
        )
    }

    return summary, detail
}
```

## Collecting Multiple Errors

Sometimes an operation can produce multiple errors. Use the diagnostics system to collect them all rather than stopping at the first one:

```go
func (r *BulkResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan BulkResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Validate all items before creating any
    for i, item := range plan.Items {
        if item.Name.ValueString() == "" {
            resp.Diagnostics.AddAttributeError(
                path.Root("items").AtListIndex(i).AtName("name"),
                "Missing Item Name",
                fmt.Sprintf("Item at index %d must have a name.", i),
            )
        }
    }

    // Stop if there were validation errors
    if resp.Diagnostics.HasError() {
        return
    }

    // Proceed with creation...
}
```

## Best Practices

**Be specific about what failed.** Include the resource name, ID, and operation in every error message.

**Tell users how to fix it.** Do not just report the error; suggest a solution or next step.

**Include API error details.** Show the actual API error message so users can search for solutions.

**Use attribute errors when possible.** Pointing to the exact problematic attribute saves users significant debugging time.

**Handle not-found gracefully.** When a resource is deleted outside Terraform, remove it from state instead of erroring.

**Include request IDs.** When the API provides request IDs, include them in error messages for easier support interactions.

**Log before you error.** Use `tflog` to log details at the debug level before adding a diagnostic, so users can get additional context with `TF_LOG=debug`.

**Do not expose sensitive data in errors.** Never include API keys, passwords, or other sensitive data in error messages.

## Conclusion

Effective error handling is one of the most impactful things you can do for your provider's user experience. By classifying errors, providing specific messages with actionable guidance, and using the diagnostics system correctly, you make your provider much easier to use and debug.

For more on provider development, see our guides on [implementing validation](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view) and [provider logging and debugging](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-logging-and-debugging/view).
