# How to Define Provider Schema in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Schema, Provider Development, Go, Infrastructure as Code

Description: Learn how to define provider schemas in Terraform custom providers, covering attribute types, nested objects, validation, defaults, and sensitive values for both SDKv2 and Plugin Framework.

---

The provider schema is the contract between your Terraform provider and its users. It defines what configuration attributes the provider accepts, what types those attributes use, which are required versus optional, and how they are validated. Getting the schema right is critical because changing it later can break existing configurations. This guide covers schema definition in depth for both the Plugin Framework and SDKv2.

## Schema Basics

A Terraform provider has two levels of schema. The provider schema defines configuration that applies to all resources, like API endpoints and authentication credentials. Resource schemas define the attributes for each individual resource type.

Users interact with the provider schema through the provider block in their HCL configuration.

```hcl
# This is what users write - your schema defines what goes here
provider "yourservice" {
  api_url     = "https://api.example.com"
  api_key     = "secret-key-here"
  timeout     = 30
  retry_count = 3
}
```

## Defining Provider Schema with the Plugin Framework

The Plugin Framework uses Go structs and schema types for a type-safe definition.

```go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
    "github.com/hashicorp/terraform-plugin-framework/schema/validator"
)

// The model struct defines the Go types that map to schema attributes
// Each field has a tfsdk struct tag matching the HCL attribute name
type ProviderModel struct {
    APIURL     types.String `tfsdk:"api_url"`
    APIKey     types.String `tfsdk:"api_key"`
    Timeout    types.Int64  `tfsdk:"timeout"`
    RetryCount types.Int64  `tfsdk:"retry_count"`
    Region     types.String `tfsdk:"region"`
    Debug      types.Bool   `tfsdk:"debug"`
}

func (p *YourProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        // Description appears in generated documentation
        Description: "The YourService provider configures the API client used to manage YourService resources.",

        // MarkdownDescription supports markdown in docs
        MarkdownDescription: "The **YourService** provider configures the API client used to manage YourService resources.",

        Attributes: map[string]schema.Attribute{
            // Required string attribute
            "api_url": schema.StringAttribute{
                Description: "Base URL of the YourService API. Can be set with the YOURSERVICE_API_URL environment variable.",
                Required:    true,
                Validators: []validator.String{
                    stringvalidator.LengthAtLeast(1),
                    // Validate URL format
                    stringvalidator.RegexMatches(
                        regexp.MustCompile(`^https?://`),
                        "must be a valid HTTP or HTTPS URL",
                    ),
                },
            },

            // Required sensitive attribute
            "api_key": schema.StringAttribute{
                Description: "API key for authentication. Can be set with the YOURSERVICE_API_KEY environment variable.",
                Required:    true,
                Sensitive:   true,  // Value is masked in plan output and logs
            },

            // Optional attribute with default value
            "timeout": schema.Int64Attribute{
                Description: "API request timeout in seconds.",
                Optional:    true,
                Computed:    true,  // Computed is needed when using Default
                Default:     int64default.StaticInt64(30),
                Validators: []validator.Int64{
                    int64validator.Between(5, 300),
                },
            },

            // Optional attribute with default
            "retry_count": schema.Int64Attribute{
                Description: "Number of times to retry failed API requests.",
                Optional:    true,
                Computed:    true,
                Default:     int64default.StaticInt64(3),
                Validators: []validator.Int64{
                    int64validator.Between(0, 10),
                },
            },

            // Optional string with enum-like validation
            "region": schema.StringAttribute{
                Description: "Default region for resources. Can be overridden per resource.",
                Optional:    true,
                Validators: []validator.String{
                    stringvalidator.OneOf(
                        "us-east-1", "us-west-2", "eu-west-1",
                        "eu-central-1", "ap-southeast-1",
                    ),
                },
            },

            // Optional boolean
            "debug": schema.BoolAttribute{
                Description: "Enable debug logging for API requests.",
                Optional:    true,
                Computed:    true,
                Default:     booldefault.StaticBool(false),
            },
        },
    }
}
```

## Defining Provider Schema with SDKv2

The SDKv2 approach uses maps of schema definitions.

```go
func Provider() *schema.Provider {
    return &schema.Provider{
        Schema: map[string]*schema.Schema{
            "api_url": {
                Type:        schema.TypeString,
                Required:    true,
                Description: "Base URL of the API.",
                // DefaultFunc reads from environment variable if not set in HCL
                DefaultFunc: schema.EnvDefaultFunc("YOURSERVICE_API_URL", nil),
                ValidateFunc: validation.IsURLWithHTTPorHTTPS,
            },

            "api_key": {
                Type:        schema.TypeString,
                Required:    true,
                Sensitive:   true,
                Description: "API authentication key.",
                DefaultFunc: schema.EnvDefaultFunc("YOURSERVICE_API_KEY", nil),
            },

            "timeout": {
                Type:         schema.TypeInt,
                Optional:     true,
                Default:      30,
                Description:  "Request timeout in seconds.",
                ValidateFunc: validation.IntBetween(5, 300),
            },

            "region": {
                Type:        schema.TypeString,
                Optional:    true,
                Description: "Default region for resources.",
                ValidateFunc: validation.StringInSlice([]string{
                    "us-east-1", "us-west-2", "eu-west-1",
                }, false),
            },

            "debug": {
                Type:        schema.TypeBool,
                Optional:    true,
                Default:     false,
                Description: "Enable debug logging.",
            },
        },
        ConfigureContextFunc: configureProvider,
    }
}
```

## Resource Schema Patterns

Resource schemas follow the same patterns but include additional concepts like computed attributes, ForceNew, and nested blocks.

```go
// Plugin Framework resource schema
func (r *ServerResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a server in YourService.",

        Attributes: map[string]schema.Attribute{
            // ID - computed, stable across updates
            "id": schema.StringAttribute{
                Description: "Server identifier.",
                Computed:    true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.UseStateForUnknown(),
                },
            },

            // Required attribute
            "name": schema.StringAttribute{
                Description: "Server name. Must be unique within the project.",
                Required:    true,
                Validators: []validator.String{
                    stringvalidator.LengthBetween(1, 128),
                },
            },

            // Attribute that forces replacement
            "region": schema.StringAttribute{
                Description: "Deployment region. Changing this destroys and recreates the server.",
                Required:    true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.RequiresReplace(),
                },
            },

            // Attribute with complex default logic
            "hostname": schema.StringAttribute{
                Description: "Custom hostname. Defaults to the server name.",
                Optional:    true,
                Computed:    true,
                // Custom plan modifier to default to name if not set
                PlanModifiers: []planmodifier.String{
                    &defaultToNameModifier{},
                },
            },

            // Nested single object
            "network": schema.SingleNestedAttribute{
                Description: "Network configuration.",
                Required:    true,
                Attributes: map[string]schema.Attribute{
                    "vpc_id": schema.StringAttribute{
                        Required:    true,
                        Description: "VPC to deploy into.",
                    },
                    "subnet_id": schema.StringAttribute{
                        Required:    true,
                        Description: "Subnet for the primary interface.",
                    },
                    "private_ip": schema.StringAttribute{
                        Computed:    true,
                        Description: "Assigned private IP.",
                    },
                    "public_ip": schema.StringAttribute{
                        Computed:    true,
                        Description: "Assigned public IP, if enabled.",
                    },
                },
            },

            // Nested list of objects
            "disk": schema.ListNestedAttribute{
                Description: "Disk configurations. At least one disk is required.",
                Required:    true,
                NestedObject: schema.NestedAttributeObject{
                    Attributes: map[string]schema.Attribute{
                        "size_gb": schema.Int64Attribute{
                            Required:    true,
                            Description: "Disk size in gigabytes.",
                            Validators: []validator.Int64{
                                int64validator.AtLeast(10),
                            },
                        },
                        "type": schema.StringAttribute{
                            Optional:    true,
                            Computed:    true,
                            Default:     stringdefault.StaticString("ssd"),
                            Description: "Disk type: ssd or hdd.",
                            Validators: []validator.String{
                                stringvalidator.OneOf("ssd", "hdd"),
                            },
                        },
                        "mount_point": schema.StringAttribute{
                            Optional:    true,
                            Description: "Mount point path.",
                        },
                        "device_id": schema.StringAttribute{
                            Computed:    true,
                            Description: "System-assigned device ID.",
                        },
                    },
                },
                Validators: []validator.List{
                    listvalidator.SizeAtLeast(1),
                    listvalidator.SizeAtMost(8),
                },
            },

            // Map of strings
            "tags": schema.MapAttribute{
                Description: "Key-value tags.",
                Optional:    true,
                ElementType: types.StringType,
            },

            // Computed timestamps
            "created_at": schema.StringAttribute{
                Computed:    true,
                Description: "Creation timestamp.",
            },
            "updated_at": schema.StringAttribute{
                Computed:    true,
                Description: "Last update timestamp.",
            },
        },
    }
}
```

## Environment Variable Fallbacks

A common pattern is allowing provider configuration through environment variables.

```go
// Plugin Framework: Check environment variables in Configure
func (p *YourProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Priority: explicit config > environment variable
    apiURL := os.Getenv("YOURSERVICE_API_URL")
    if !config.APIURL.IsNull() {
        apiURL = config.APIURL.ValueString()
    }

    apiKey := os.Getenv("YOURSERVICE_API_KEY")
    if !config.APIKey.IsNull() {
        apiKey = config.APIKey.ValueString()
    }

    if apiURL == "" {
        resp.Diagnostics.AddAttributeError(
            path.Root("api_url"),
            "Missing API URL",
            "Set the api_url attribute or YOURSERVICE_API_URL environment variable.",
        )
    }

    if apiKey == "" {
        resp.Diagnostics.AddAttributeError(
            path.Root("api_key"),
            "Missing API Key",
            "Set the api_key attribute or YOURSERVICE_API_KEY environment variable.",
        )
    }

    if resp.Diagnostics.HasError() {
        return
    }

    client := NewClient(apiURL, apiKey)
    resp.DataSourceData = client
    resp.ResourceData = client
}
```

## Schema Design Best Practices

Make breaking changes impossible by planning your schema carefully before release. Once users depend on an attribute, removing it or changing its type is a breaking change that requires a major version bump.

Use `Computed: true` with `PlanModifiers: UseStateForUnknown` for server-generated IDs. This tells Terraform the value will be filled in after creation and should not change on subsequent plans.

Mark sensitive attributes with `Sensitive: true`. This prevents their values from appearing in plan output, logs, and state file diffs.

Use consistent naming conventions. Attribute names should be lowercase with underscores. Boolean attributes should read naturally as questions: `public_ip_enabled` is clearer than `enable_public_ip`.

Validate early and with clear messages. Every constraint your API enforces should also be enforced in the schema validators. Users should never see a raw API error when a validator could have caught the problem first.

For more on implementing the resources that use these schemas, see our guide on [Implementing Resource CRUD Operations in Terraform Providers](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-crud-operations/view).

## Conclusion

Provider schemas are the foundation of a good Terraform provider experience. A well-designed schema with appropriate types, clear descriptions, sensible defaults, and thorough validation makes your provider intuitive to use and hard to misconfigure. Whether you use the Plugin Framework or SDKv2, the principles are the same: be explicit about requirements, validate everything you can at plan time, and design for forward compatibility from the start.
