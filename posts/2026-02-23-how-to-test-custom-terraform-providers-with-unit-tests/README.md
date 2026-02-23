# How to Test Custom Terraform Providers with Unit Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Unit Testing, Infrastructure as Code, Testing, Go

Description: Learn how to write effective unit tests for custom Terraform providers covering validators, plan modifiers, type conversions, and helper functions without external API calls.

---

Unit tests are the foundation of a reliable Terraform provider. They are fast, do not require external API access, and can be run on every commit without any special setup. While acceptance tests verify that your provider works with real infrastructure, unit tests let you verify individual components in isolation.

In this guide, we will cover how to write unit tests for the various components of a custom Terraform provider, including validators, plan modifiers, type conversion functions, and helper utilities.

## Why Unit Tests Matter for Providers

Terraform providers contain a significant amount of logic beyond just making API calls. Validators check input values, plan modifiers compute defaults and handle change detection, type conversion functions translate between Terraform types and Go types, and helper functions handle things like pagination and retry logic. All of this logic can and should be unit tested.

Unit tests provide several advantages:

- They run in seconds, not minutes
- They do not need API credentials or network access
- They can easily cover edge cases and error conditions
- They provide fast feedback during development
- They are deterministic and never flaky due to external factors

## Testing Validators

Validators are one of the easiest components to unit test because they have a simple interface: given an input value, they either produce errors or they do not.

```go
// internal/validators/port_validator_test.go
package validators

import (
    "context"
    "testing"

    "github.com/hashicorp/terraform-plugin-framework/schema/validator"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

func TestPortValidator(t *testing.T) {
    t.Parallel()

    // Define test cases as a table
    testCases := map[string]struct {
        value       types.Int64
        expectError bool
    }{
        "valid port - minimum": {
            value:       types.Int64Value(1),
            expectError: false,
        },
        "valid port - maximum": {
            value:       types.Int64Value(65535),
            expectError: false,
        },
        "valid port - common": {
            value:       types.Int64Value(8080),
            expectError: false,
        },
        "invalid port - zero": {
            value:       types.Int64Value(0),
            expectError: true,
        },
        "invalid port - negative": {
            value:       types.Int64Value(-1),
            expectError: true,
        },
        "invalid port - too high": {
            value:       types.Int64Value(65536),
            expectError: true,
        },
        "null value - skip validation": {
            value:       types.Int64Null(),
            expectError: false,
        },
        "unknown value - skip validation": {
            value:       types.Int64Unknown(),
            expectError: false,
        },
    }

    for name, tc := range testCases {
        // Capture loop variable for parallel tests
        name, tc := name, tc
        t.Run(name, func(t *testing.T) {
            t.Parallel()

            // Create the request and response
            request := validator.Int64Request{
                ConfigValue: tc.value,
            }
            response := validator.Int64Response{}

            // Run the validator
            ValidPort().ValidateInt64(context.Background(), request, &response)

            // Check the result
            if tc.expectError && !response.Diagnostics.HasError() {
                t.Fatal("expected error but got none")
            }
            if !tc.expectError && response.Diagnostics.HasError() {
                t.Fatalf("unexpected error: %s", response.Diagnostics.Errors())
            }
        })
    }
}
```

## Testing Plan Modifiers

Plan modifiers require a bit more setup because they need state, config, and plan values:

```go
// internal/planmodifiers/default_value_test.go
package planmodifiers

import (
    "context"
    "testing"

    "github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/tfsdk"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

func TestDefaultStringModifier(t *testing.T) {
    t.Parallel()

    testCases := map[string]struct {
        configValue   types.String
        stateValue    types.String
        planValue     types.String
        defaultValue  string
        expectedValue types.String
    }{
        "null config uses default": {
            configValue:   types.StringNull(),
            stateValue:    types.StringNull(),
            planValue:     types.StringNull(),
            defaultValue:  "us-east-1",
            expectedValue: types.StringValue("us-east-1"),
        },
        "config value overrides default": {
            configValue:   types.StringValue("eu-west-1"),
            stateValue:    types.StringNull(),
            planValue:     types.StringValue("eu-west-1"),
            defaultValue:  "us-east-1",
            expectedValue: types.StringValue("eu-west-1"),
        },
        "existing state with null config keeps default": {
            configValue:   types.StringNull(),
            stateValue:    types.StringValue("us-east-1"),
            planValue:     types.StringNull(),
            defaultValue:  "us-east-1",
            expectedValue: types.StringValue("us-east-1"),
        },
    }

    for name, tc := range testCases {
        name, tc := name, tc
        t.Run(name, func(t *testing.T) {
            t.Parallel()

            // Build the request with the test case values
            req := planmodifier.StringRequest{
                ConfigValue: tc.configValue,
                StateValue:  tc.stateValue,
                PlanValue:   tc.planValue,
            }
            resp := planmodifier.StringResponse{
                PlanValue: tc.planValue,
            }

            // Run the plan modifier
            DefaultString(tc.defaultValue).PlanModifyString(context.Background(), req, &resp)

            // Verify no errors
            if resp.Diagnostics.HasError() {
                t.Fatalf("unexpected error: %s", resp.Diagnostics.Errors())
            }

            // Verify the plan value
            if !resp.PlanValue.Equal(tc.expectedValue) {
                t.Fatalf("expected %s, got %s", tc.expectedValue, resp.PlanValue)
            }
        })
    }
}
```

## Testing Type Conversion Functions

Provider code often includes functions that convert between API response types and Terraform model types. These are excellent candidates for unit testing:

```go
// internal/provider/models_test.go
package provider

import (
    "testing"

    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/example/api-client"
)

func TestFlattenServerToModel(t *testing.T) {
    t.Parallel()

    testCases := map[string]struct {
        input    *api.Server
        expected ServerResourceModel
    }{
        "full server response": {
            input: &api.Server{
                ID:        "srv-123",
                Name:      "web-server",
                Region:    "us-east-1",
                IPAddress: "10.0.0.1",
                Status:    "running",
                Tags:      map[string]string{"env": "prod"},
            },
            expected: ServerResourceModel{
                ID:        types.StringValue("srv-123"),
                Name:      types.StringValue("web-server"),
                Region:    types.StringValue("us-east-1"),
                IPAddress: types.StringValue("10.0.0.1"),
                Status:    types.StringValue("running"),
            },
        },
        "server with nil optional fields": {
            input: &api.Server{
                ID:     "srv-456",
                Name:   "db-server",
                Region: "us-west-2",
                Status: "stopped",
            },
            expected: ServerResourceModel{
                ID:        types.StringValue("srv-456"),
                Name:      types.StringValue("db-server"),
                Region:    types.StringValue("us-west-2"),
                IPAddress: types.StringNull(),
                Status:    types.StringValue("stopped"),
            },
        },
    }

    for name, tc := range testCases {
        name, tc := name, tc
        t.Run(name, func(t *testing.T) {
            t.Parallel()

            result := flattenServerToModel(tc.input)

            if !result.ID.Equal(tc.expected.ID) {
                t.Errorf("ID: expected %s, got %s", tc.expected.ID, result.ID)
            }
            if !result.Name.Equal(tc.expected.Name) {
                t.Errorf("Name: expected %s, got %s", tc.expected.Name, result.Name)
            }
            if !result.Region.Equal(tc.expected.Region) {
                t.Errorf("Region: expected %s, got %s", tc.expected.Region, result.Region)
            }
        })
    }
}
```

## Testing Expand Functions

Expand functions convert from Terraform model types to API request types:

```go
func TestExpandServerFromModel(t *testing.T) {
    t.Parallel()

    testCases := map[string]struct {
        input    ServerResourceModel
        expected *api.CreateServerRequest
    }{
        "full model": {
            input: ServerResourceModel{
                Name:   types.StringValue("web-server"),
                Region: types.StringValue("us-east-1"),
                Size:   types.StringValue("medium"),
            },
            expected: &api.CreateServerRequest{
                Name:   "web-server",
                Region: "us-east-1",
                Size:   "medium",
            },
        },
        "model with optional fields null": {
            input: ServerResourceModel{
                Name:   types.StringValue("web-server"),
                Region: types.StringValue("us-east-1"),
                Size:   types.StringNull(),
            },
            expected: &api.CreateServerRequest{
                Name:   "web-server",
                Region: "us-east-1",
                // Size should be empty when null
            },
        },
    }

    for name, tc := range testCases {
        name, tc := name, tc
        t.Run(name, func(t *testing.T) {
            t.Parallel()

            result := expandServerFromModel(&tc.input)

            if result.Name != tc.expected.Name {
                t.Errorf("Name: expected %s, got %s", tc.expected.Name, result.Name)
            }
            if result.Region != tc.expected.Region {
                t.Errorf("Region: expected %s, got %s", tc.expected.Region, result.Region)
            }
            if result.Size != tc.expected.Size {
                t.Errorf("Size: expected %s, got %s", tc.expected.Size, result.Size)
            }
        })
    }
}
```

## Testing Helper Functions

Providers often include utility functions for retry logic, pagination, error handling, and more. These should all have unit tests:

```go
// internal/helpers/retry_test.go
package helpers

import (
    "context"
    "errors"
    "testing"
    "time"
)

func TestRetryWithBackoff(t *testing.T) {
    t.Parallel()

    t.Run("succeeds on first attempt", func(t *testing.T) {
        t.Parallel()

        attempts := 0
        err := RetryWithBackoff(context.Background(), 3, 10*time.Millisecond, func() error {
            attempts++
            return nil
        })

        if err != nil {
            t.Fatalf("unexpected error: %v", err)
        }
        if attempts != 1 {
            t.Fatalf("expected 1 attempt, got %d", attempts)
        }
    })

    t.Run("succeeds after retries", func(t *testing.T) {
        t.Parallel()

        attempts := 0
        err := RetryWithBackoff(context.Background(), 3, 10*time.Millisecond, func() error {
            attempts++
            if attempts < 3 {
                return errors.New("temporary error")
            }
            return nil
        })

        if err != nil {
            t.Fatalf("unexpected error: %v", err)
        }
        if attempts != 3 {
            t.Fatalf("expected 3 attempts, got %d", attempts)
        }
    })

    t.Run("fails after max retries", func(t *testing.T) {
        t.Parallel()

        attempts := 0
        err := RetryWithBackoff(context.Background(), 3, 10*time.Millisecond, func() error {
            attempts++
            return errors.New("persistent error")
        })

        if err == nil {
            t.Fatal("expected error but got none")
        }
        if attempts != 3 {
            t.Fatalf("expected 3 attempts, got %d", attempts)
        }
    })

    t.Run("respects context cancellation", func(t *testing.T) {
        t.Parallel()

        ctx, cancel := context.WithCancel(context.Background())
        cancel() // Cancel immediately

        err := RetryWithBackoff(ctx, 10, 1*time.Second, func() error {
            return errors.New("should not retry")
        })

        if err == nil {
            t.Fatal("expected error but got none")
        }
    })
}
```

## Testing with Mock API Clients

For testing CRUD operations without making real API calls, use interfaces and mocks:

```go
// internal/provider/client.go
// Define an interface for your API client
type APIClient interface {
    GetServer(ctx context.Context, id string) (*api.Server, error)
    CreateServer(ctx context.Context, req *api.CreateServerRequest) (*api.Server, error)
    UpdateServer(ctx context.Context, id string, req *api.UpdateServerRequest) (*api.Server, error)
    DeleteServer(ctx context.Context, id string) error
}

// internal/provider/mock_client_test.go
// Create a mock implementation for testing
type mockAPIClient struct {
    getServerFunc    func(ctx context.Context, id string) (*api.Server, error)
    createServerFunc func(ctx context.Context, req *api.CreateServerRequest) (*api.Server, error)
    updateServerFunc func(ctx context.Context, id string, req *api.UpdateServerRequest) (*api.Server, error)
    deleteServerFunc func(ctx context.Context, id string) error
}

func (m *mockAPIClient) GetServer(ctx context.Context, id string) (*api.Server, error) {
    return m.getServerFunc(ctx, id)
}

func (m *mockAPIClient) CreateServer(ctx context.Context, req *api.CreateServerRequest) (*api.Server, error) {
    return m.createServerFunc(ctx, req)
}

func (m *mockAPIClient) UpdateServer(ctx context.Context, id string, req *api.UpdateServerRequest) (*api.Server, error) {
    return m.updateServerFunc(ctx, id, req)
}

func (m *mockAPIClient) DeleteServer(ctx context.Context, id string) error {
    return m.deleteServerFunc(ctx, id)
}
```

## Running Unit Tests

Unit tests run with the standard Go test command and do not need `TF_ACC`:

```bash
# Run all unit tests
go test ./internal/... -v

# Run tests for a specific package
go test ./internal/validators/ -v

# Run a specific test
go test ./internal/validators/ -v -run TestPortValidator

# Run tests with coverage
go test ./internal/... -v -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Best Practices

**Use table-driven tests.** Go's table-driven test pattern makes it easy to test many cases with minimal code duplication.

**Test edge cases.** Always test null values, unknown values, empty strings, boundary conditions, and error cases.

**Keep tests fast.** Unit tests should run in milliseconds. Avoid any external dependencies like network calls or file system operations.

**Use parallel tests.** Mark tests with `t.Parallel()` to run them concurrently and catch race conditions.

**Aim for high coverage.** While 100% coverage is not always practical, aim for at least 80% coverage on validators, plan modifiers, and helper functions.

## Conclusion

Unit tests are an essential part of building a high-quality Terraform provider. By testing validators, plan modifiers, type conversions, and helper functions in isolation, you can catch bugs early and maintain confidence in your code as it evolves.

Combine unit tests with [acceptance tests](https://oneuptime.com/blog/post/2026-02-23-how-to-test-custom-terraform-providers-with-acceptance-tests/view) for comprehensive coverage that validates both individual components and end-to-end behavior. For more on provider development, see our guide on [implementing validation in custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view).
