# How to Implement Provider-Defined Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Provider Functions, Infrastructure as Code, Custom Provider

Description: Learn how to implement provider-defined functions in custom Terraform providers to expose reusable computation logic that users can call directly in their configurations.

---

Provider-defined functions are a relatively new feature in Terraform that allows providers to expose custom functions that users can call directly in their HCL configurations. Unlike data sources, which manage state and make API calls, provider-defined functions are pure computational functions that transform inputs into outputs without side effects.

In this guide, we will cover how to implement provider-defined functions in your custom Terraform provider using the Plugin Framework, including function signatures, parameter handling, and testing.

## What Are Provider-Defined Functions

Provider-defined functions let you extend Terraform's expression language with domain-specific logic. Users call them with the `provider::` prefix in their configurations:

```hcl
locals {
  # Call a provider-defined function
  parsed_id = provider::example::parse_server_id("srv-abc123-us-east-1")

  # Use the result
  server_region = local.parsed_id.region
}
```

Functions are ideal for:
- Parsing complex identifiers or URIs
- Encoding and decoding data formats
- Performing calculations specific to your domain
- Validating and transforming values

## When to Use Functions vs Data Sources

The choice between a function and a data source depends on the behavior you need:

| Feature | Function | Data Source |
|---------|----------|-------------|
| Makes API calls | No | Yes |
| Manages state | No | Yes |
| Pure computation | Yes | Not necessarily |
| Can be used in expressions | Yes | Via attributes |
| Runs during plan | Yes | Depends |

Use functions for pure transformations that do not need API access. Use data sources when you need to fetch data from an external system.

## Implementing a Basic Function

Let us implement a function that parses a server ID into its component parts.

### Define the Function

```go
// internal/provider/function_parse_server_id.go
package provider

import (
    "context"
    "fmt"
    "strings"

    "github.com/hashicorp/terraform-plugin-framework/function"
)

// Ensure the implementation satisfies the expected interface
var _ function.Function = &ParseServerIDFunction{}

// ParseServerIDFunction is the implementation of the parse_server_id function
type ParseServerIDFunction struct{}

// Metadata returns the function name
func (f *ParseServerIDFunction) Metadata(ctx context.Context, req function.MetadataRequest, resp *function.MetadataResponse) {
    resp.Name = "parse_server_id"
}

// Definition describes the function signature
func (f *ParseServerIDFunction) Definition(ctx context.Context, req function.DefinitionRequest, resp *function.DefinitionResponse) {
    resp.Definition = function.Definition{
        // Summary appears in documentation
        Summary: "Parses a server ID into its component parts",
        // Description provides detailed information
        Description: "Given a server ID in the format 'srv-<id>-<region>', " +
            "this function returns an object with the id and region components.",

        // Define the parameters the function accepts
        Parameters: []function.Parameter{
            function.StringParameter{
                Name:        "server_id",
                Description: "The server ID to parse, in format srv-<id>-<region>",
            },
        },

        // Define the return type
        Return: function.ObjectReturn{
            AttributeTypes: map[string]attr.Type{
                "prefix":    types.StringType,
                "id":        types.StringType,
                "region":    types.StringType,
            },
        },
    }
}

// Run executes the function logic
func (f *ParseServerIDFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
    // Read the input parameter
    var serverID string
    resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &serverID))
    if resp.Error != nil {
        return
    }

    // Parse the server ID
    parts := strings.SplitN(serverID, "-", 3)
    if len(parts) != 3 {
        resp.Error = function.NewFuncError(
            fmt.Sprintf("Invalid server ID format: %q. Expected format: srv-<id>-<region>", serverID),
        )
        return
    }

    // Build the result object
    result, diags := types.ObjectValue(
        map[string]attr.Type{
            "prefix": types.StringType,
            "id":     types.StringType,
            "region": types.StringType,
        },
        map[string]attr.Value{
            "prefix": types.StringValue(parts[0]),
            "id":     types.StringValue(parts[1]),
            "region": types.StringValue(parts[2]),
        },
    )
    if diags.HasError() {
        resp.Error = function.FuncErrorFromDiags(ctx, diags)
        return
    }

    // Set the result
    resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, result))
}
```

### Register the Function with the Provider

```go
// internal/provider/provider.go
func (p *ExampleProvider) Functions(ctx context.Context) []func() function.Function {
    return []func() function.Function{
        func() function.Function { return &ParseServerIDFunction{} },
        func() function.Function { return &CIDRContainsFunction{} },
    }
}
```

## Functions with Multiple Parameters

Here is a function that takes multiple parameters:

```go
// CIDRContainsFunction checks if an IP address is within a CIDR range
type CIDRContainsFunction struct{}

func (f *CIDRContainsFunction) Metadata(ctx context.Context, req function.MetadataRequest, resp *function.MetadataResponse) {
    resp.Name = "cidr_contains"
}

func (f *CIDRContainsFunction) Definition(ctx context.Context, req function.DefinitionRequest, resp *function.DefinitionResponse) {
    resp.Definition = function.Definition{
        Summary:     "Checks if an IP address is within a CIDR range",
        Description: "Returns true if the given IP address falls within the specified CIDR block.",

        Parameters: []function.Parameter{
            function.StringParameter{
                Name:        "cidr_block",
                Description: "The CIDR block to check against (e.g., 10.0.0.0/16)",
            },
            function.StringParameter{
                Name:        "ip_address",
                Description: "The IP address to check",
            },
        },

        Return: function.BoolReturn{},
    }
}

func (f *CIDRContainsFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
    var cidrBlock string
    var ipAddress string

    // Read both parameters
    resp.Error = function.ConcatFuncErrors(
        resp.Error,
        req.Arguments.Get(ctx, &cidrBlock, &ipAddress),
    )
    if resp.Error != nil {
        return
    }

    // Parse the CIDR block
    _, network, err := net.ParseCIDR(cidrBlock)
    if err != nil {
        resp.Error = function.NewFuncError(
            fmt.Sprintf("Invalid CIDR block %q: %s", cidrBlock, err),
        )
        return
    }

    // Parse the IP address
    ip := net.ParseIP(ipAddress)
    if ip == nil {
        resp.Error = function.NewFuncError(
            fmt.Sprintf("Invalid IP address: %q", ipAddress),
        )
        return
    }

    // Check if the IP is in the network
    result := network.Contains(ip)
    resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, result))
}
```

## Functions with Variadic Parameters

Functions can accept a variable number of arguments:

```go
// JoinPathFunction joins multiple path segments
type JoinPathFunction struct{}

func (f *JoinPathFunction) Definition(ctx context.Context, req function.DefinitionRequest, resp *function.DefinitionResponse) {
    resp.Definition = function.Definition{
        Summary:     "Joins path segments into a single path",
        Description: "Concatenates multiple path segments with the appropriate separator.",

        // Variadic parameter accepts zero or more values
        VariadicParameter: function.StringParameter{
            Name:        "segments",
            Description: "Path segments to join",
        },

        Return: function.StringReturn{},
    }
}

func (f *JoinPathFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
    var segments []string

    resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &segments))
    if resp.Error != nil {
        return
    }

    result := strings.Join(segments, "/")
    resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, result))
}
```

Users call variadic functions like this:

```hcl
locals {
  path = provider::example::join_path("api", "v1", "servers")
  # Result: "api/v1/servers"
}
```

## Testing Provider-Defined Functions

Test functions using the `terraform-plugin-testing` framework:

```go
func TestParseServerIDFunction(t *testing.T) {
    resource.UnitTest(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `
                    output "test" {
                        value = provider::example::parse_server_id("srv-abc123-us-east-1")
                    }
                `,
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckOutput("test.prefix", "srv"),
                    resource.TestCheckOutput("test.id", "abc123"),
                    resource.TestCheckOutput("test.region", "us-east-1"),
                ),
            },
        },
    })
}

func TestParseServerIDFunction_invalidInput(t *testing.T) {
    resource.UnitTest(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `
                    output "test" {
                        value = provider::example::parse_server_id("invalid")
                    }
                `,
                ExpectError: regexp.MustCompile(`Invalid server ID format`),
            },
        },
    })
}
```

You can also unit test the function logic directly:

```go
func TestParseServerIDLogic(t *testing.T) {
    testCases := map[string]struct {
        input       string
        expectError bool
        expected    map[string]string
    }{
        "valid ID": {
            input:       "srv-abc123-us-east-1",
            expectError: false,
            expected: map[string]string{
                "prefix": "srv",
                "id":     "abc123",
                "region": "us-east-1",
            },
        },
        "invalid format": {
            input:       "invalid",
            expectError: true,
        },
    }

    for name, tc := range testCases {
        t.Run(name, func(t *testing.T) {
            parts := strings.SplitN(tc.input, "-", 3)
            if tc.expectError {
                if len(parts) == 3 {
                    t.Fatal("expected parsing to fail")
                }
                return
            }
            if parts[0] != tc.expected["prefix"] {
                t.Errorf("prefix: expected %s, got %s", tc.expected["prefix"], parts[0])
            }
        })
    }
}
```

## Best Practices

**Keep functions pure.** Functions should not make API calls, modify state, or have side effects. They should produce the same output for the same input every time.

**Provide clear error messages.** When a function receives invalid input, return an error message that explains the expected format and what was wrong.

**Document thoroughly.** Include the Summary, Description, and parameter descriptions. Users will see this in the provider documentation.

**Handle edge cases.** Consider empty strings, null values, and boundary conditions in your function logic.

**Name functions clearly.** Function names should describe what they do. Use snake_case and include the domain context.

## Conclusion

Provider-defined functions extend Terraform's expression language with domain-specific logic that makes configurations cleaner and more maintainable. By implementing functions for common transformations and calculations, you reduce the need for external scripts and complex workarounds in user configurations.

For more on provider development, see our guides on [using the Terraform provider framework](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-provider-framework-for-new-providers/view) and [handling complex nested schemas](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view).
