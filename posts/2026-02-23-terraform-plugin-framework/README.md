# How to Use the Terraform Plugin Framework

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Plugin Framework, Provider Development, Go, Infrastructure as Code

Description: Learn how to use the Terraform Plugin Framework to build providers with strong typing, built-in validation, and modern Go patterns for managing infrastructure resources.

---

The Terraform Plugin Framework is the modern, recommended way to build Terraform providers. It replaced the older Plugin SDKv2 with a redesigned architecture that provides strong typing through Go generics, built-in attribute validation, plan modification capabilities, and a cleaner development experience. If you are starting a new provider today, you should use the Plugin Framework.

In this guide, we will explore the key concepts and patterns of the Plugin Framework. You will learn how the framework structures providers, resources, and data sources, and how to take advantage of its features for building robust providers.

## Plugin Framework vs SDKv2

Before diving in, it is worth understanding why the Plugin Framework exists. The SDKv2 used `map[string]*schema.Schema` to define resource schemas, which provided no compile-time type safety. You could misspell an attribute name and only discover the error at runtime. The Plugin Framework uses Go structs with struct tags, giving you compile-time verification that your code matches your schema.

The Framework also handles plan modification and validation natively, whereas SDKv2 required workarounds. And it supports protocol version 6, which enables advanced features like nested attributes and stricter type checking.

## The Provider Interface

Every provider must implement the `provider.Provider` interface, which requires five methods.

```go
// provider.Provider interface that every provider must implement
type Provider interface {
    // Metadata returns the provider type name and version
    Metadata(context.Context, MetadataRequest, *MetadataResponse)

    // Schema defines the provider-level configuration attributes
    Schema(context.Context, SchemaRequest, *SchemaResponse)

    // Configure processes the provider configuration and creates the API client
    Configure(context.Context, ConfigureRequest, *ConfigureResponse)

    // Resources returns the list of resource types this provider implements
    Resources(context.Context) []func() resource.Resource

    // DataSources returns the list of data source types this provider implements
    DataSources(context.Context) []func() datasource.DataSource
}
```

Here is a complete implementation.

```go
package provider

import (
    "context"
    "os"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

type ExampleProvider struct {
    version string
}

// Model for the provider configuration
// Struct tags define the HCL attribute names
type ExampleProviderModel struct {
    Host    types.String `tfsdk:"host"`
    Token   types.String `tfsdk:"token"`
    Timeout types.Int64  `tfsdk:"timeout"`
}

func (p *ExampleProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "example"
    resp.Version = p.version
}

func (p *ExampleProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Example provider for demonstration purposes.",
        Attributes: map[string]schema.Attribute{
            "host": schema.StringAttribute{
                Description: "The API host URL. Can also be set with the EXAMPLE_HOST environment variable.",
                Optional:    true,
            },
            "token": schema.StringAttribute{
                Description: "Authentication token. Can also be set with the EXAMPLE_TOKEN environment variable.",
                Optional:    true,
                Sensitive:   true,
            },
            "timeout": schema.Int64Attribute{
                Description: "Request timeout in seconds.",
                Optional:    true,
            },
        },
    }
}

func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ExampleProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Allow environment variable overrides
    host := os.Getenv("EXAMPLE_HOST")
    if !config.Host.IsNull() {
        host = config.Host.ValueString()
    }

    token := os.Getenv("EXAMPLE_TOKEN")
    if !config.Token.IsNull() {
        token = config.Token.ValueString()
    }

    // Validate required values
    if host == "" {
        resp.Diagnostics.AddError(
            "Missing Host",
            "The provider requires a host to be configured via the 'host' attribute or EXAMPLE_HOST environment variable.",
        )
    }

    if token == "" {
        resp.Diagnostics.AddError(
            "Missing Token",
            "The provider requires a token via the 'token' attribute or EXAMPLE_TOKEN environment variable.",
        )
    }

    if resp.Diagnostics.HasError() {
        return
    }

    // Create the API client
    timeout := int64(30)
    if !config.Timeout.IsNull() {
        timeout = config.Timeout.ValueInt64()
    }

    client := NewAPIClient(host, token, timeout)

    // Share the client with resources and data sources
    resp.DataSourceData = client
    resp.ResourceData = client
}

func (p *ExampleProvider) Resources(_ context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewServerResource,
        NewDatabaseResource,
        NewNetworkResource,
    }
}

func (p *ExampleProvider) DataSources(_ context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewServerDataSource,
        NewServersDataSource,
    }
}
```

## Schema Types and Attributes

The Plugin Framework provides a rich set of attribute types that map to Terraform's type system.

```go
func (r *ServerResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a server instance.",
        Attributes: map[string]schema.Attribute{
            // String attribute - maps to Terraform string type
            "id": schema.StringAttribute{
                Description: "Unique identifier for the server.",
                Computed:    true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.UseStateForUnknown(),
                },
            },

            // Required string - must be provided by the user
            "name": schema.StringAttribute{
                Description: "Human-readable name for the server.",
                Required:    true,
            },

            // Optional string with default
            "region": schema.StringAttribute{
                Description: "Deployment region.",
                Optional:    true,
                Computed:    true,
                Default:     stringdefault.StaticString("us-east-1"),
            },

            // Int64 attribute
            "cpu_count": schema.Int64Attribute{
                Description: "Number of CPU cores.",
                Required:    true,
                Validators: []validator.Int64{
                    int64validator.Between(1, 128),
                },
            },

            // Float64 attribute
            "monthly_cost": schema.Float64Attribute{
                Description: "Estimated monthly cost in USD.",
                Computed:    true,
            },

            // Boolean attribute
            "public_ip_enabled": schema.BoolAttribute{
                Description: "Whether to assign a public IP address.",
                Optional:    true,
                Computed:    true,
                Default:     booldefault.StaticBool(false),
            },

            // List attribute (list of strings)
            "dns_names": schema.ListAttribute{
                Description: "DNS names assigned to this server.",
                Computed:    true,
                ElementType: types.StringType,
            },

            // Map attribute
            "tags": schema.MapAttribute{
                Description: "Tags to apply to the server.",
                Optional:    true,
                ElementType: types.StringType,
            },

            // Set attribute (unordered, unique values)
            "security_group_ids": schema.SetAttribute{
                Description: "Security group IDs to attach.",
                Optional:    true,
                ElementType: types.StringType,
            },

            // Nested single object attribute
            "network_config": schema.SingleNestedAttribute{
                Description: "Network configuration for the server.",
                Required:    true,
                Attributes: map[string]schema.Attribute{
                    "vpc_id": schema.StringAttribute{
                        Description: "VPC ID to deploy into.",
                        Required:    true,
                    },
                    "subnet_id": schema.StringAttribute{
                        Description: "Subnet ID for the primary network interface.",
                        Required:    true,
                    },
                    "private_ip": schema.StringAttribute{
                        Description: "Assigned private IP address.",
                        Computed:    true,
                    },
                },
            },

            // List of nested objects
            "disks": schema.ListNestedAttribute{
                Description: "Disk configurations.",
                Optional:    true,
                NestedObject: schema.NestedAttributeObject{
                    Attributes: map[string]schema.Attribute{
                        "size_gb": schema.Int64Attribute{
                            Description: "Disk size in gigabytes.",
                            Required:    true,
                        },
                        "type": schema.StringAttribute{
                            Description: "Disk type (ssd or hdd).",
                            Optional:    true,
                            Computed:    true,
                            Default:     stringdefault.StaticString("ssd"),
                        },
                        "device_name": schema.StringAttribute{
                            Description: "Device name assigned by the system.",
                            Computed:    true,
                        },
                    },
                },
            },
        },
    }
}
```

## Data Models with Struct Tags

Each schema maps to a Go struct that the framework uses for serialization.

```go
// ServerResourceModel matches the schema defined above
type ServerResourceModel struct {
    ID              types.String `tfsdk:"id"`
    Name            types.String `tfsdk:"name"`
    Region          types.String `tfsdk:"region"`
    CPUCount        types.Int64  `tfsdk:"cpu_count"`
    MonthlyCost     types.Float64 `tfsdk:"monthly_cost"`
    PublicIPEnabled types.Bool   `tfsdk:"public_ip_enabled"`
    DNSNames        types.List   `tfsdk:"dns_names"`
    Tags            types.Map    `tfsdk:"tags"`
    SecurityGroupIDs types.Set   `tfsdk:"security_group_ids"`
    NetworkConfig   types.Object `tfsdk:"network_config"`
    Disks           types.List   `tfsdk:"disks"`
}

// NetworkConfigModel for the nested attribute
type NetworkConfigModel struct {
    VPCID     types.String `tfsdk:"vpc_id"`
    SubnetID  types.String `tfsdk:"subnet_id"`
    PrivateIP types.String `tfsdk:"private_ip"`
}

// DiskModel for the nested list attribute
type DiskModel struct {
    SizeGB     types.Int64  `tfsdk:"size_gb"`
    Type       types.String `tfsdk:"type"`
    DeviceName types.String `tfsdk:"device_name"`
}
```

## Validators

The Plugin Framework includes built-in validators and lets you create custom ones.

```go
import (
    "github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
    "github.com/hashicorp/terraform-plugin-framework-validators/int64validator"
    "github.com/hashicorp/terraform-plugin-framework-validators/listvalidator"
)

// Using built-in validators
"name": schema.StringAttribute{
    Required: true,
    Validators: []validator.String{
        stringvalidator.LengthBetween(3, 64),
        stringvalidator.RegexMatches(
            regexp.MustCompile(`^[a-z][a-z0-9-]*$`),
            "must start with lowercase letter and contain only lowercase letters, numbers, and hyphens",
        ),
    },
},

"size": schema.StringAttribute{
    Required: true,
    Validators: []validator.String{
        stringvalidator.OneOf("small", "medium", "large", "xlarge"),
    },
},

"replicas": schema.Int64Attribute{
    Required: true,
    Validators: []validator.Int64{
        int64validator.Between(1, 10),
    },
},
```

## Plan Modifiers

Plan modifiers customize how Terraform calculates the plan for an attribute.

```go
import (
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
)

// UseStateForUnknown keeps the existing value during updates
"id": schema.StringAttribute{
    Computed: true,
    PlanModifiers: []planmodifier.String{
        stringplanmodifier.UseStateForUnknown(),
    },
},

// RequiresReplace forces resource recreation when the attribute changes
"region": schema.StringAttribute{
    Required: true,
    PlanModifiers: []planmodifier.String{
        stringplanmodifier.RequiresReplace(),
    },
},
```

## The Resource Interface

Resources must implement CRUD operations through the resource.Resource interface.

```go
// Full resource interface
type Resource interface {
    Metadata(context.Context, MetadataRequest, *MetadataResponse)
    Schema(context.Context, SchemaRequest, *SchemaResponse)
    Create(context.Context, CreateRequest, *CreateResponse)
    Read(context.Context, ReadRequest, *ReadResponse)
    Update(context.Context, UpdateRequest, *UpdateResponse)
    Delete(context.Context, DeleteRequest, *DeleteResponse)
}

// Optional interfaces for additional capabilities
type ResourceWithConfigure interface {
    Configure(context.Context, ConfigureRequest, *ConfigureResponse)
}

type ResourceWithImportState interface {
    ImportState(context.Context, ImportStateRequest, *ImportStateResponse)
}

type ResourceWithModifyPlan interface {
    ModifyPlan(context.Context, ModifyPlanRequest, *ModifyPlanResponse)
}

type ResourceWithValidateConfig interface {
    ValidateConfig(context.Context, ValidateConfigRequest, *ValidateConfigResponse)
}
```

## Best Practices

Use the struct-based models consistently. Every attribute in your schema should have a corresponding field in your model struct. The framework catches mismatches at runtime, but keeping them aligned prevents confusing errors.

Prefer computed attributes with `UseStateForUnknown` for server-generated values. This tells Terraform that the value will not change between plan and apply unless the resource is recreated.

Use validators extensively. Catching invalid input at plan time produces much better error messages than failing during an API call.

Handle null and unknown values explicitly. The framework distinguishes between null (not set), unknown (will be determined during apply), and actual values. Your CRUD methods need to handle all three states.

For the complete provider development workflow, see our guide on [Setting Up the Terraform Provider Development Environment](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-development-environment/view).

## Conclusion

The Terraform Plugin Framework provides a modern, type-safe foundation for building Terraform providers. Its struct-based schemas, built-in validators, and plan modifiers make it easier to build providers that handle edge cases correctly. Start by understanding the core interfaces, then build up your provider one resource at a time, using the framework's features to handle validation, plan customization, and state management.
