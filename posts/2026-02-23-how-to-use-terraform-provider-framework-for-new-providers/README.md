# How to Use Terraform Provider Framework for New Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Plugin Framework, Infrastructure as Code, Go

Description: Learn how to build a new custom Terraform provider from scratch using the Terraform Plugin Framework, including project setup, schema definition, CRUD operations, and testing.

---

If you are building a new Terraform provider today, the Terraform Plugin Framework is the recommended approach. It is the successor to the older SDKv2 and provides a more modern, type-safe, and ergonomic API for building providers. The Plugin Framework leverages Go's type system to catch errors at compile time and provides better support for complex schemas.

In this guide, we will walk through building a complete Terraform provider from scratch using the Plugin Framework, covering project setup, provider configuration, resource implementation, data source implementation, and testing.

## Setting Up the Project

### Initialize the Go Module

```bash
# Create the project directory
mkdir terraform-provider-example
cd terraform-provider-example

# Initialize the Go module
go mod init github.com/example/terraform-provider-example

# Add the required dependencies
go get github.com/hashicorp/terraform-plugin-framework
go get github.com/hashicorp/terraform-plugin-go
go get github.com/hashicorp/terraform-plugin-testing
go get github.com/hashicorp/terraform-plugin-log
```

### Project Structure

Organize your code with this structure:

```
terraform-provider-example/
  main.go
  internal/
    provider/
      provider.go               # Provider definition
      provider_test.go           # Test helpers
      server_resource.go         # Resource implementation
      server_resource_test.go    # Resource tests
      servers_data_source.go     # Data source implementation
      servers_data_source_test.go
  examples/
    provider/provider.tf
    resources/example_server/resource.tf
  docs/                          # Generated documentation
  .goreleaser.yml
```

### Entry Point

Create the `main.go` file:

```go
// main.go
package main

import (
    "context"
    "flag"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/example/terraform-provider-example/internal/provider"
)

// Version is set during the build process via ldflags
var version string = "dev"

func main() {
    var debug bool

    flag.BoolVar(&debug, "debug", false, "set to true to run with debugger support")
    flag.Parse()

    opts := providerserver.ServeOpts{
        // The address must match the registry path
        Address: "registry.terraform.io/example/example",
        Debug:   debug,
    }

    err := providerserver.Serve(context.Background(), provider.New(version), opts)
    if err != nil {
        log.Fatal(err.Error())
    }
}
```

## Implementing the Provider

The provider is the top-level component that configures shared settings like API credentials:

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

// Ensure the implementation satisfies the provider interface
var _ provider.Provider = &ExampleProvider{}

// ExampleProvider defines the provider implementation
type ExampleProvider struct {
    version string
}

// ExampleProviderModel describes the provider configuration
type ExampleProviderModel struct {
    APIURL types.String `tfsdk:"api_url"`
    APIKey types.String `tfsdk:"api_key"`
}

// New returns a new provider instance
func New(version string) func() provider.Provider {
    return func() provider.Provider {
        return &ExampleProvider{
            version: version,
        }
    }
}

// Metadata returns the provider type name
func (p *ExampleProvider) Metadata(ctx context.Context, req provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "example"
    resp.Version = p.version
}

// Schema defines the provider configuration schema
func (p *ExampleProvider) Schema(ctx context.Context, req provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "The Example provider manages resources in the Example Cloud platform.",
        Attributes: map[string]schema.Attribute{
            "api_url": schema.StringAttribute{
                Optional:    true,
                Description: "The API URL. Defaults to EXAMPLE_API_URL env var or https://api.example.com.",
            },
            "api_key": schema.StringAttribute{
                Optional:    true,
                Sensitive:   true,
                Description: "The API key for authentication. Can also be set via EXAMPLE_API_KEY env var.",
            },
        },
    }
}

// Configure sets up the provider with the given configuration
func (p *ExampleProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
    var config ExampleProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Determine API URL from config or environment
    apiURL := "https://api.example.com"
    if !config.APIURL.IsNull() {
        apiURL = config.APIURL.ValueString()
    } else if envURL := os.Getenv("EXAMPLE_API_URL"); envURL != "" {
        apiURL = envURL
    }

    // Determine API key from config or environment
    apiKey := ""
    if !config.APIKey.IsNull() {
        apiKey = config.APIKey.ValueString()
    } else if envKey := os.Getenv("EXAMPLE_API_KEY"); envKey != "" {
        apiKey = envKey
    }

    if apiKey == "" {
        resp.Diagnostics.AddError(
            "Missing API Key",
            "The provider requires an API key. Set it in the provider configuration "+
                "or via the EXAMPLE_API_KEY environment variable.",
        )
        return
    }

    // Create the API client
    client := NewAPIClient(apiURL, apiKey)

    // Make the client available to resources and data sources
    resp.DataSourceData = client
    resp.ResourceData = client
}

// Resources returns the list of resources this provider supports
func (p *ExampleProvider) Resources(ctx context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewServerResource,
    }
}

// DataSources returns the list of data sources this provider supports
func (p *ExampleProvider) DataSources(ctx context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewServersDataSource,
    }
}
```

## Implementing a Resource

Resources are the core of a Terraform provider. They manage the full lifecycle of an infrastructure component:

```go
// internal/provider/server_resource.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/hashicorp/terraform-plugin-log/tflog"
)

// Ensure the implementation satisfies the resource interface
var _ resource.Resource = &ServerResource{}
var _ resource.ResourceWithImportState = &ServerResource{}

// ServerResource defines the resource implementation
type ServerResource struct {
    client *APIClient
}

// ServerResourceModel maps the resource schema to a Go struct
type ServerResourceModel struct {
    ID        types.String `tfsdk:"id"`
    Name      types.String `tfsdk:"name"`
    Region    types.String `tfsdk:"region"`
    Size      types.String `tfsdk:"size"`
    IPAddress types.String `tfsdk:"ip_address"`
    Status    types.String `tfsdk:"status"`
}

// NewServerResource creates a new resource instance
func NewServerResource() resource.Resource {
    return &ServerResource{}
}

// Metadata sets the resource type name
func (r *ServerResource) Metadata(ctx context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
    resp.TypeName = req.ProviderTypeName + "_server"
}

// Schema defines the resource attributes
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a server instance.",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed:    true,
                Description: "The unique identifier for the server.",
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.UseStateForUnknown(),
                },
            },
            "name": schema.StringAttribute{
                Required:    true,
                Description: "The name of the server.",
            },
            "region": schema.StringAttribute{
                Required:    true,
                Description: "The deployment region.",
                PlanModifiers: []planmodifier.String{
                    stringplanmodifier.RequiresReplace(),
                },
            },
            "size": schema.StringAttribute{
                Required:    true,
                Description: "Server size (small, medium, large).",
            },
            "ip_address": schema.StringAttribute{
                Computed:    true,
                Description: "The assigned public IP address.",
            },
            "status": schema.StringAttribute{
                Computed:    true,
                Description: "The current server status.",
            },
        },
    }
}

// Configure gets the API client from the provider
func (r *ServerResource) Configure(ctx context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
    if req.ProviderData == nil {
        return
    }
    client, ok := req.ProviderData.(*APIClient)
    if !ok {
        resp.Diagnostics.AddError("Unexpected Resource Configure Type",
            "Expected *APIClient, got something else.")
        return
    }
    r.client = client
}

// Create creates a new server resource
func (r *ServerResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    tflog.Info(ctx, "Creating server", map[string]interface{}{
        "name":   plan.Name.ValueString(),
        "region": plan.Region.ValueString(),
    })

    // Call the API to create the server
    server, err := r.client.CreateServer(ctx, plan.Name.ValueString(), plan.Region.ValueString(), plan.Size.ValueString())
    if err != nil {
        resp.Diagnostics.AddError("Error Creating Server", err.Error())
        return
    }

    // Map response to model
    plan.ID = types.StringValue(server.ID)
    plan.IPAddress = types.StringValue(server.IPAddress)
    plan.Status = types.StringValue(server.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Read refreshes the server state from the API
func (r *ServerResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    var state ServerResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.GetServer(ctx, state.ID.ValueString())
    if err != nil {
        resp.Diagnostics.AddError("Error Reading Server", err.Error())
        return
    }

    state.Name = types.StringValue(server.Name)
    state.Region = types.StringValue(server.Region)
    state.Size = types.StringValue(server.Size)
    state.IPAddress = types.StringValue(server.IPAddress)
    state.Status = types.StringValue(server.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

// Update modifies the server
func (r *ServerResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
    var plan ServerResourceModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    server, err := r.client.UpdateServer(ctx, plan.ID.ValueString(), plan.Name.ValueString(), plan.Size.ValueString())
    if err != nil {
        resp.Diagnostics.AddError("Error Updating Server", err.Error())
        return
    }

    plan.IPAddress = types.StringValue(server.IPAddress)
    plan.Status = types.StringValue(server.Status)

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Delete removes the server
func (r *ServerResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    var state ServerResourceModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    err := r.client.DeleteServer(ctx, state.ID.ValueString())
    if err != nil {
        resp.Diagnostics.AddError("Error Deleting Server", err.Error())
        return
    }
}

// ImportState supports importing existing servers
func (r *ServerResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
    resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}
```

## Building and Using Locally

To test your provider locally during development:

```bash
# Build the provider
go build -o terraform-provider-example

# Create a dev override in your Terraform CLI config
cat >> ~/.terraformrc << EOF
provider_installation {
  dev_overrides {
    "example/example" = "/path/to/your/build/directory"
  }
  direct {}
}
EOF
```

Then create a test configuration:

```hcl
terraform {
  required_providers {
    example = {
      source = "example/example"
    }
  }
}

provider "example" {
  api_key = "test-key"
}

resource "example_server" "web" {
  name   = "web-server"
  region = "us-east-1"
  size   = "small"
}
```

## Best Practices

**Use the Plugin Framework for all new providers.** The SDKv2 is in maintenance mode and the Plugin Framework is the future.

**Implement ImportState for every resource.** Users expect to be able to import existing infrastructure.

**Use plan modifiers for computed attributes.** `UseStateForUnknown` prevents unnecessary diffs for stable computed values.

**Log operations with tflog.** Structured logging helps users debug issues.

**Handle not-found in Read.** Remove the resource from state when the API returns 404.

## Conclusion

The Terraform Plugin Framework provides a modern, type-safe foundation for building Terraform providers. By following the patterns shown in this guide, you can create a well-structured provider that is easy to develop, test, and maintain.

For more on provider development, see our guides on [implementing validation](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view) and [testing with acceptance tests](https://oneuptime.com/blog/post/2026-02-23-how-to-test-custom-terraform-providers-with-acceptance-tests/view).
