# How to Migrate from SDK v2 to Plugin Framework

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Migration, Plugin Framework, SDK v2

Description: Learn how to migrate your existing Terraform provider from the legacy SDK v2 to the modern Plugin Framework with a step-by-step approach using the mux server for gradual migration.

---

If you have an existing Terraform provider built with SDK v2, you are probably wondering whether and how to migrate to the newer Plugin Framework. The Plugin Framework offers better type safety, a more ergonomic API, and is where all new development is happening. The good news is that you do not need to migrate everything at once. Terraform provides a mux server that lets you run both SDK v2 and Plugin Framework resources side by side.

In this guide, we will cover the migration strategy, the mux server setup, and how to convert resources from SDK v2 to the Plugin Framework one at a time.

## Why Migrate

The SDK v2 is in maintenance mode, meaning it receives bug fixes but no new features. The Plugin Framework, on the other hand, provides:

- Type-safe schema definitions using Go structs
- Better support for nested attributes
- Provider-defined functions (not available in SDK v2)
- Improved plan modification capabilities
- Better diagnostics and error handling
- Active development with new features

You do not need to migrate all at once, but starting the migration now ensures you are building on the foundation that will be supported long-term.

## Migration Strategy

The recommended approach is incremental migration:

1. Set up the mux server to serve both SDK v2 and Plugin Framework resources
2. Migrate new resources to the Plugin Framework
3. Gradually migrate existing resources one at a time
4. Remove SDK v2 dependency when all resources are migrated

This approach lets you ship migrations with regular releases without needing a major version bump.

## Setting Up the Mux Server

The mux server combines an SDK v2 provider and a Plugin Framework provider into a single provider server:

```go
// main.go
package main

import (
    "context"
    "flag"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6/tf6server"
    "github.com/hashicorp/terraform-plugin-mux/tf6muxserver"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    "github.com/hashicorp/terraform-plugin-sdk/v2/plugin"

    frameworkProvider "github.com/example/terraform-provider-example/internal/provider"
    sdkProvider "github.com/example/terraform-provider-example/internal/sdkprovider"
)

var version string = "dev"

func main() {
    var debug bool
    flag.BoolVar(&debug, "debug", false, "set to true to run with debugger support")
    flag.Parse()

    ctx := context.Background()

    // Create the SDK v2 provider server (upgraded to protocol v6)
    sdkv2Provider := sdkProvider.New(version)()
    upgradedSdkServer, err := tf6server.UpgradeServer(
        ctx,
        func() tfprotov5.ProviderServer {
            return schema.NewGRPCProviderServer(sdkv2Provider)
        },
    )

    // Create the Plugin Framework provider server
    frameworkServer := providerserver.NewProtocol6(frameworkProvider.New(version)())

    // Combine them using the mux server
    muxServer, err := tf6muxserver.NewMuxServer(ctx,
        func() tfprotov6.ProviderServer { return upgradedSdkServer },
        frameworkServer,
    )
    if err != nil {
        log.Fatal(err)
    }

    // Serve the combined provider
    var serveOpts []tf6server.ServeOpt
    if debug {
        serveOpts = append(serveOpts, tf6server.WithManagedDebug())
    }

    err = tf6server.Serve(
        "registry.terraform.io/example/example",
        muxServer.ProviderServer,
        serveOpts...,
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

## Migrating the Provider Configuration

Start by creating the Plugin Framework provider alongside the existing SDK v2 provider:

### SDK v2 Provider (Before)

```go
// internal/sdkprovider/provider.go
package sdkprovider

import (
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func New(version string) func() *schema.Provider {
    return func() *schema.Provider {
        return &schema.Provider{
            Schema: map[string]*schema.Schema{
                "api_url": {
                    Type:        schema.TypeString,
                    Optional:    true,
                    DefaultFunc: schema.EnvDefaultFunc("EXAMPLE_API_URL", "https://api.example.com"),
                },
                "api_key": {
                    Type:        schema.TypeString,
                    Optional:    true,
                    Sensitive:   true,
                    DefaultFunc: schema.EnvDefaultFunc("EXAMPLE_API_KEY", nil),
                },
            },
            ResourcesMap: map[string]*schema.Resource{
                "example_server":   resourceServer(),
                "example_database": resourceDatabase(),
            },
            DataSourcesMap: map[string]*schema.Resource{
                "example_servers": dataSourceServers(),
            },
            ConfigureContextFunc: configureProvider,
        }
    }
}
```

### Plugin Framework Provider (After)

```go
// internal/provider/provider.go
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

type ExampleProviderModel struct {
    APIURL types.String `tfsdk:"api_url"`
    APIKey types.String `tfsdk:"api_key"`
}

func New(version string) func() provider.Provider {
    return func() provider.Provider {
        return &ExampleProvider{version: version}
    }
}

func (p *ExampleProvider) Schema(ctx context.Context, req provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "api_url": schema.StringAttribute{
                Optional:    true,
                Description: "API URL. Defaults to EXAMPLE_API_URL env var.",
            },
            "api_key": schema.StringAttribute{
                Optional:  true,
                Sensitive: true,
                Description: "API key. Can be set via EXAMPLE_API_KEY env var.",
            },
        },
    }
}

// Resources lists only the resources that have been migrated to the framework
func (p *ExampleProvider) Resources(ctx context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        // Add migrated resources here as you convert them
        // NewServerResource,
    }
}

// DataSources lists only the data sources migrated to the framework
func (p *ExampleProvider) DataSources(ctx context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        // Add migrated data sources here
    }
}
```

## Migrating a Resource

Let us walk through migrating a resource from SDK v2 to the Plugin Framework.

### SDK v2 Resource (Before)

```go
// internal/sdkprovider/resource_server.go
func resourceServer() *schema.Resource {
    return &schema.Resource{
        CreateContext: resourceServerCreate,
        ReadContext:   resourceServerRead,
        UpdateContext: resourceServerUpdate,
        DeleteContext: resourceServerDelete,
        Importer: &schema.ResourceImporter{
            StateContext: schema.ImportStatePassthroughContext,
        },
        Schema: map[string]*schema.Schema{
            "name": {
                Type:     schema.TypeString,
                Required: true,
            },
            "region": {
                Type:     schema.TypeString,
                Required: true,
                ForceNew: true,
            },
            "size": {
                Type:     schema.TypeString,
                Required: true,
            },
            "ip_address": {
                Type:     schema.TypeString,
                Computed: true,
            },
        },
    }
}

func resourceServerCreate(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*APIClient)

    server, err := client.CreateServer(ctx, &CreateServerRequest{
        Name:   d.Get("name").(string),
        Region: d.Get("region").(string),
        Size:   d.Get("size").(string),
    })
    if err != nil {
        return diag.FromErr(err)
    }

    d.SetId(server.ID)
    d.Set("ip_address", server.IPAddress)

    return nil
}
```

### Plugin Framework Resource (After)

```go
// internal/provider/server_resource.go
type ServerResource struct {
    client *APIClient
}

type ServerResourceModel struct {
    ID        types.String `tfsdk:"id"`
    Name      types.String `tfsdk:"name"`
    Region    types.String `tfsdk:"region"`
    Size      types.String `tfsdk:"size"`
    IPAddress types.String `tfsdk:"ip_address"`
}

func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a server instance.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed: true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.UseStateForUnknown(),
                },
            },
            "name": schema.StringAttribute{
                Required: true,
            },
            "region": schema.StringAttribute{
                Required: true,
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.RequiresReplace(),
                },
            },
            "size": schema.StringAttribute{
                Required: true,
            },
            "ip_address": schema.StringAttribute{
                Computed: true,
            },
        },
    }
}

func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.CreateServer(ctx, &CreateServerRequest{
        Name:   plan.Name.ValueString(),
        Region: plan.Region.ValueString(),
        Size:   plan.Size.ValueString(),
    })
    if err != nil {
        resp.Diagnostics.AddError("Error Creating Server", err.Error())
        return
    }

    plan.ID = types.StringValue(server.ID)
    plan.IPAddress = types.StringValue(server.IPAddress)
    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}
```

## Key Differences to Watch For

Here is a quick reference of the main differences when migrating:

| SDK v2 | Plugin Framework |
|--------|-----------------|
| `schema.TypeString` | `schema.StringAttribute{}` |
| `ForceNew: true` | `stringplanmodifier.RequiresReplace()` |
| `Default: "value"` | `stringdefault.StaticString("value")` |
| `d.Get("name").(string)` | `plan.Name.ValueString()` |
| `d.Set("name", value)` | `plan.Name = types.StringValue(value)` |
| `d.SetId(id)` | `plan.ID = types.StringValue(id)` |
| `diag.FromErr(err)` | `resp.Diagnostics.AddError(...)` |
| `ValidateFunc` | `Validators: []validator.String{...}` |

## Moving Resources Between Providers

When you are ready to move a resource from the SDK v2 provider to the Plugin Framework provider:

1. Create the new resource in the Plugin Framework provider
2. Add it to the `Resources()` list in the framework provider
3. Remove it from the `ResourcesMap` in the SDK v2 provider
4. Run all acceptance tests to verify behavior is identical

```go
// internal/provider/provider.go
func (p *ExampleProvider) Resources(ctx context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewServerResource,  // Moved from SDK v2
    }
}

// internal/sdkprovider/provider.go
// Remove "example_server" from ResourcesMap
ResourcesMap: map[string]*schema.Resource{
    // "example_server" has been migrated to the Plugin Framework
    "example_database": resourceDatabase(),
},
```

## Best Practices

**Migrate one resource at a time.** Test thoroughly after each migration before moving on.

**Keep the same behavior.** The migration should be transparent to users. No configuration changes should be required.

**Run acceptance tests after each migration.** Your existing acceptance tests should pass without modification.

**Update documentation.** Regenerate docs after migration to ensure schema descriptions are preserved.

**Do not change functionality during migration.** Keep the migration purely mechanical. Add new features in separate commits.

## Conclusion

Migrating from SDK v2 to the Plugin Framework is a worthwhile investment that sets your provider up for long-term success. The mux server makes it possible to migrate gradually without disrupting users, and the Plugin Framework's improved APIs make your code cleaner and more maintainable.

For more on the Plugin Framework, see our guides on [using the framework for new providers](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-provider-framework-for-new-providers/view) and [handling complex nested schemas](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view).
