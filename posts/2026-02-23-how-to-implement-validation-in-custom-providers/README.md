# How to Implement Validation in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Validation, Infrastructure as Code, Custom Providers

Description: Learn how to implement attribute validation in custom Terraform providers using validators, plan modifiers, and custom validation logic to ensure correct configurations.

---

Validation is one of the most important aspects of building a custom Terraform provider. Without proper validation, users can submit invalid configurations that only fail at apply time, leading to frustration and wasted effort. By catching errors early during the plan phase, you create a much better user experience and prevent costly mistakes.

In this guide, we will walk through the different validation mechanisms available in the Terraform Plugin Framework and show you how to implement them effectively in your custom provider.

## Why Validation Matters

When users write Terraform configurations, they expect immediate feedback when something is wrong. If a user sets a port number to 99999 or provides an invalid email address, that error should surface during `terraform plan`, not during `terraform apply` when resources are already being modified.

Good validation provides clear, actionable error messages that tell users exactly what went wrong and how to fix it. This is especially important for custom providers where users may not be familiar with the underlying API constraints.

## Types of Validation in Terraform Providers

The Terraform Plugin Framework offers several validation mechanisms:

1. **Attribute validators** - validate individual attribute values
2. **Schema validators** - validate combinations of attributes
3. **Custom validators** - implement complex validation logic
4. **Plan-time validation** - validate during the planning phase

## Implementing Attribute Validators

The simplest form of validation is attribute-level validation. The Plugin Framework provides built-in validators for common cases, and you can create custom ones for specific needs.

### Using Built-in Validators

The `terraform-plugin-framework-validators` module provides many ready-to-use validators:

```go
// Import the validators package
import (
    "github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
    "github.com/hashicorp/terraform-plugin-framework-validators/int64validator"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/schema/validator"
)

// Define a schema with built-in validators
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            // String length validation
            "name": schema.StringAttribute{
                Required: true,
                Validators: []validator.String{
                    stringvalidator.LengthBetween(3, 64),
                    stringvalidator.RegexMatches(
                        regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9-]*$`),
                        "must start with a letter and contain only alphanumeric characters and hyphens",
                    ),
                },
            },
            // Integer range validation
            "port": schema.Int64Attribute{
                Required: true,
                Validators: []validator.Int64{
                    int64validator.Between(1, 65535),
                },
            },
            // String enum validation
            "environment": schema.StringAttribute{
                Required: true,
                Validators: []validator.String{
                    stringvalidator.OneOf("development", "staging", "production"),
                },
            },
        },
    }
}
```

### Creating Custom Validators

When built-in validators do not cover your needs, you can create custom validators. Here is how to create a validator that checks if a string is a valid URL:

```go
// urlValidator implements the validator.String interface
type urlValidator struct{}

// Description returns a plain text description of the validator
func (v urlValidator) Description(ctx context.Context) string {
    return "value must be a valid URL"
}

// MarkdownDescription returns a markdown description of the validator
func (v urlValidator) MarkdownDescription(ctx context.Context) string {
    return "value must be a valid URL"
}

// ValidateString performs the actual validation logic
func (v urlValidator) ValidateString(ctx context.Context, req validator.StringRequest, resp *validator.StringResponse) {
    // Skip validation if the value is unknown or null
    if req.ConfigValue.IsUnknown() || req.ConfigValue.IsNull() {
        return
    }

    value := req.ConfigValue.ValueString()

    // Parse the URL and check for validity
    parsedURL, err := url.Parse(value)
    if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
        resp.Diagnostics.AddAttributeError(
            req.Path,
            "Invalid URL",
            fmt.Sprintf("The value %q is not a valid URL. Expected format: https://example.com", value),
        )
    }
}

// ValidURL returns an instance of the URL validator
func ValidURL() validator.String {
    return urlValidator{}
}
```

You can then use this validator in your schema:

```go
"callback_url": schema.StringAttribute{
    Optional: true,
    Validators: []validator.String{
        ValidURL(),
    },
},
```

## Cross-Attribute Validation

Sometimes you need to validate combinations of attributes. For example, you might require that if `enable_ssl` is true, then `certificate_path` must also be set.

### Using ConfigValidators

The `ConfigValidators` method on resources lets you implement cross-attribute validation:

```go
// ConfigValidators returns a list of config validators for the resource
func (r *ServerResource) ConfigValidators(ctx context.Context) []resource.ConfigValidator {
    return []resource.ConfigValidator{
        // Use the built-in conflict validator
        resourcevalidator.AtLeastOneOf(
            path.MatchRoot("inline_policy"),
            path.MatchRoot("policy_arn"),
        ),
        // Use a custom config validator
        &sslConfigValidator{},
    }
}

// sslConfigValidator checks that SSL-related attributes are consistent
type sslConfigValidator struct{}

func (v *sslConfigValidator) Description(ctx context.Context) string {
    return "validates SSL configuration consistency"
}

func (v *sslConfigValidator) MarkdownDescription(ctx context.Context) string {
    return "validates SSL configuration consistency"
}

func (v *sslConfigValidator) ValidateResource(ctx context.Context, req resource.ValidateConfigRequest, resp *resource.ValidateConfigResponse) {
    var enableSSL types.Bool
    var certPath types.String

    // Read the attribute values from config
    resp.Diagnostics.Append(req.Config.GetAttribute(ctx, path.Root("enable_ssl"), &enableSSL)...)
    resp.Diagnostics.Append(req.Config.GetAttribute(ctx, path.Root("certificate_path"), &certPath)...)

    if resp.Diagnostics.HasError() {
        return
    }

    // If SSL is enabled, certificate path must be set
    if !enableSSL.IsNull() && enableSSL.ValueBool() {
        if certPath.IsNull() || certPath.ValueString() == "" {
            resp.Diagnostics.AddError(
                "Missing Certificate Path",
                "When enable_ssl is true, certificate_path must be provided.",
            )
        }
    }
}
```

## Validation with External API Calls

In some cases, you may want to validate attribute values against an external API. For example, checking if a region name is valid by querying the API. Be cautious with this approach because validation runs during plan, and making API calls during plan can slow things down or cause issues when the API is unavailable.

```go
// apiRegionValidator validates regions against the API
type apiRegionValidator struct {
    client *api.Client
}

func (v apiRegionValidator) ValidateString(ctx context.Context, req validator.StringRequest, resp *validator.StringResponse) {
    if req.ConfigValue.IsUnknown() || req.ConfigValue.IsNull() {
        return
    }

    region := req.ConfigValue.ValueString()

    // Cache the valid regions to avoid repeated API calls
    validRegions, err := v.client.ListRegions(ctx)
    if err != nil {
        // Log a warning but do not fail validation
        // The apply step will catch invalid regions
        tflog.Warn(ctx, "Unable to validate region against API", map[string]interface{}{
            "error": err.Error(),
        })
        return
    }

    for _, r := range validRegions {
        if r.Name == region {
            return
        }
    }

    resp.Diagnostics.AddAttributeError(
        req.Path,
        "Invalid Region",
        fmt.Sprintf("Region %q is not valid. Valid regions: %s", region, strings.Join(regionNames(validRegions), ", ")),
    )
}
```

## Best Practices for Validation

Here are several best practices to follow when implementing validation in your custom provider:

**Always handle unknown and null values.** During plan, some values may be unknown (they depend on other resources). Always check `IsUnknown()` and `IsNull()` before validating, and skip validation for these cases.

**Provide clear error messages.** Your error messages should tell the user exactly what is wrong, what the expected format or range is, and how to fix the problem. Include the invalid value in the error message when appropriate.

**Use attribute paths.** When reporting errors, use `AddAttributeError` with the correct path so that Terraform can point users to the exact attribute that has the problem.

**Prefer plan-time validation over apply-time validation.** The sooner you catch errors, the better the user experience. Move as much validation as possible to the plan phase.

**Do not make validation too strict.** Avoid validating things that might change in the future, like the exact list of valid regions. If the API adds a new region, users should not have to wait for a provider update.

**Test your validators.** Write unit tests for every custom validator. Validation logic is easy to test in isolation and should have full coverage.

## Testing Validators

You can test validators using the standard Go testing framework:

```go
func TestValidURL(t *testing.T) {
    t.Parallel()

    testCases := map[string]struct {
        value       string
        expectError bool
    }{
        "valid https URL": {
            value:       "https://example.com",
            expectError: false,
        },
        "valid http URL": {
            value:       "http://example.com/path",
            expectError: false,
        },
        "missing scheme": {
            value:       "example.com",
            expectError: true,
        },
        "empty string": {
            value:       "",
            expectError: true,
        },
    }

    for name, tc := range testCases {
        t.Run(name, func(t *testing.T) {
            t.Parallel()
            request := validator.StringRequest{
                ConfigValue: types.StringValue(tc.value),
            }
            response := validator.StringResponse{}
            ValidURL().ValidateString(context.Background(), request, &response)

            if tc.expectError && !response.Diagnostics.HasError() {
                t.Fatal("expected error, got none")
            }
            if !tc.expectError && response.Diagnostics.HasError() {
                t.Fatalf("unexpected error: %s", response.Diagnostics.Errors())
            }
        })
    }
}
```

## Conclusion

Implementing proper validation in your custom Terraform provider is essential for providing a great user experience. By using attribute validators, cross-attribute validators, and custom validation logic, you can catch configuration errors early and provide clear, actionable feedback to your users.

Start with the built-in validators from the `terraform-plugin-framework-validators` module, and create custom validators only when needed. Always handle unknown and null values gracefully, and make sure to test your validation logic thoroughly.

For more on building custom Terraform providers, check out our guide on [how to test custom Terraform providers with unit tests](https://oneuptime.com/blog/post/2026-02-23-how-to-test-custom-terraform-providers-with-unit-tests/view) and [how to handle provider error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-error-messages/view).
