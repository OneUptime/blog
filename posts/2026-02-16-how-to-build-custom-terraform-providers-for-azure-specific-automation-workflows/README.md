# How to Build Custom Terraform Providers for Azure-Specific Automation Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Custom Provider, Go, Plugin Development, IaC, Automation

Description: Build a custom Terraform provider in Go to manage Azure resources or workflows that are not covered by the official azurerm provider.

---

The official `azurerm` Terraform provider covers hundreds of Azure resource types, but it does not cover everything. Maybe you need to manage a preview Azure service, configure a third-party tool that integrates with Azure, or automate an internal workflow that combines Azure APIs with your own business logic. That is when building a custom Terraform provider makes sense.

Custom providers are written in Go using the Terraform Plugin Framework. This post walks through building a simple custom provider that manages a hypothetical Azure-related resource - an internal service catalog entry that tags and registers Azure resources with your organization's CMDB.

## When You Need a Custom Provider

Before investing the effort, consider whether you actually need a custom provider. Here are legitimate reasons:

- The Azure resource type is in preview and not yet supported by `azurerm`
- You need to manage a non-Azure service that integrates tightly with your Azure infrastructure
- You have internal automation APIs that you want to expose as Terraform resources
- You need to combine multiple Azure API calls into a single atomic Terraform resource

If your need is just a one-off API call, a `null_resource` with a local-exec provisioner might be simpler. But if you want proper plan/apply behavior, state management, and drift detection, a custom provider is the right approach.

## Project Setup

Start by scaffolding the provider project.

```bash
# Create the project directory
mkdir terraform-provider-azurecatalog
cd terraform-provider-azurecatalog

# Initialize the Go module
go mod init github.com/yourorg/terraform-provider-azurecatalog

# Get the Terraform Plugin Framework dependency
go get github.com/hashicorp/terraform-plugin-framework
go get github.com/hashicorp/terraform-plugin-go
```

The project structure looks like this:

```
terraform-provider-azurecatalog/
  internal/
    provider/
      provider.go
    resources/
      catalog_entry.go
  main.go
  go.mod
  go.sum
```

## The Main Entry Point

The `main.go` file is the entry point that registers your provider with the Terraform plugin system.

```go
// main.go
// Entry point for the custom Terraform provider
package main

import (
    "context"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/yourorg/terraform-provider-azurecatalog/internal/provider"
)

func main() {
    opts := providerserver.ServeOpts{
        Address: "registry.terraform.io/yourorg/azurecatalog",
    }

    err := providerserver.Serve(context.Background(), provider.New, opts)
    if err != nil {
        log.Fatal(err.Error())
    }
}
```

## The Provider Definition

The provider definition configures authentication and any global settings.

```go
// internal/provider/provider.go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/yourorg/terraform-provider-azurecatalog/internal/resources"
)

// Ensure the provider satisfies the expected interfaces
var _ provider.Provider = &AzureCatalogProvider{}

// AzureCatalogProvider defines the provider implementation
type AzureCatalogProvider struct {
    version string
}

// AzureCatalogProviderModel maps provider schema to a Go struct
type AzureCatalogProviderModel struct {
    CatalogEndpoint types.String `tfsdk:"catalog_endpoint"`
    ApiKey          types.String `tfsdk:"api_key"`
    SubscriptionId  types.String `tfsdk:"subscription_id"`
}

// New creates a new provider instance
func New() provider.Provider {
    return &AzureCatalogProvider{
        version: "0.1.0",
    }
}

// Metadata returns the provider type name
func (p *AzureCatalogProvider) Metadata(
    ctx context.Context,
    req provider.MetadataRequest,
    resp *provider.MetadataResponse,
) {
    resp.TypeName = "azurecatalog"
}

// Schema defines the provider configuration schema
func (p *AzureCatalogProvider) Schema(
    ctx context.Context,
    req provider.SchemaRequest,
    resp *provider.SchemaResponse,
) {
    resp.Schema = schema.Schema{
        Description: "Provider for managing Azure resource catalog entries",
        Attributes: map[string]schema.Attribute{
            "catalog_endpoint": schema.StringAttribute{
                Description: "The URL of the internal catalog API",
                Required:    true,
            },
            "api_key": schema.StringAttribute{
                Description: "API key for authentication",
                Required:    true,
                Sensitive:   true,
            },
            "subscription_id": schema.StringAttribute{
                Description: "Azure subscription ID for resource lookups",
                Required:    true,
            },
        },
    }
}

// Configure prepares the API client for data sources and resources
func (p *AzureCatalogProvider) Configure(
    ctx context.Context,
    req provider.ConfigureRequest,
    resp *provider.ConfigureResponse,
) {
    var config AzureCatalogProviderModel
    resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Create the API client and make it available to resources
    client := &CatalogClient{
        Endpoint:       config.CatalogEndpoint.ValueString(),
        ApiKey:         config.ApiKey.ValueString(),
        SubscriptionId: config.SubscriptionId.ValueString(),
    }

    resp.DataSourceData = client
    resp.ResourceData = client
}

// Resources returns the list of resources this provider manages
func (p *AzureCatalogProvider) Resources(ctx context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        resources.NewCatalogEntryResource,
    }
}

// DataSources returns the list of data sources this provider supports
func (p *AzureCatalogProvider) DataSources(ctx context.Context) []func() datasource.DataSource {
    return nil
}

// CatalogClient is the API client shared between resources
type CatalogClient struct {
    Endpoint       string
    ApiKey         string
    SubscriptionId string
}
```

## The Resource Implementation

Now for the actual resource. This is where you implement CRUD operations.

```go
// internal/resources/catalog_entry.go
package resources

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
    "github.com/yourorg/terraform-provider-azurecatalog/internal/provider"
)

var _ resource.Resource = &CatalogEntryResource{}

type CatalogEntryResource struct {
    client *provider.CatalogClient
}

// CatalogEntryModel maps the resource schema to a Go struct
type CatalogEntryModel struct {
    Id            types.String `tfsdk:"id"`
    ResourceId    types.String `tfsdk:"azure_resource_id"`
    ServiceName   types.String `tfsdk:"service_name"`
    Owner         types.String `tfsdk:"owner"`
    CostCenter    types.String `tfsdk:"cost_center"`
    Environment   types.String `tfsdk:"environment"`
    Classification types.String `tfsdk:"classification"`
}

func NewCatalogEntryResource() resource.Resource {
    return &CatalogEntryResource{}
}

func (r *CatalogEntryResource) Metadata(
    ctx context.Context,
    req resource.MetadataRequest,
    resp *resource.MetadataResponse,
) {
    resp.TypeName = req.ProviderTypeName + "_entry"
}

func (r *CatalogEntryResource) Schema(
    ctx context.Context,
    req resource.SchemaRequest,
    resp *resource.SchemaResponse,
) {
    resp.Schema = schema.Schema{
        Description: "Manages a catalog entry for an Azure resource",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed:    true,
                Description: "The catalog entry ID",
            },
            "azure_resource_id": schema.StringAttribute{
                Required:    true,
                Description: "The Azure resource ID to register",
            },
            "service_name": schema.StringAttribute{
                Required:    true,
                Description: "The service name for this resource",
            },
            "owner": schema.StringAttribute{
                Required:    true,
                Description: "The team or person owning this resource",
            },
            "cost_center": schema.StringAttribute{
                Required:    true,
                Description: "Cost center code",
            },
            "environment": schema.StringAttribute{
                Required:    true,
                Description: "Deployment environment",
            },
            "classification": schema.StringAttribute{
                Optional:    true,
                Computed:    true,
                Description: "Data classification level",
            },
        },
    }
}

// Configure receives the provider client
func (r *CatalogEntryResource) Configure(
    ctx context.Context,
    req resource.ConfigureRequest,
    resp *resource.ConfigureResponse,
) {
    if req.ProviderData == nil {
        return
    }
    r.client = req.ProviderData.(*provider.CatalogClient)
}

// Create handles resource creation
func (r *CatalogEntryResource) Create(
    ctx context.Context,
    req resource.CreateRequest,
    resp *resource.CreateResponse,
) {
    var plan CatalogEntryModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Call your internal API to create the catalog entry
    // This is where you would make HTTP calls to your catalog service
    entryId := fmt.Sprintf("cat-%s", plan.ResourceId.ValueString())

    plan.Id = types.StringValue(entryId)
    if plan.Classification.IsNull() {
        plan.Classification = types.StringValue("internal")
    }

    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Read refreshes the resource state
func (r *CatalogEntryResource) Read(
    ctx context.Context,
    req resource.ReadRequest,
    resp *resource.ReadResponse,
) {
    var state CatalogEntryModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Query the catalog API and update state
    // If the resource no longer exists, call resp.State.RemoveResource(ctx)

    resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

// Update handles resource updates
func (r *CatalogEntryResource) Update(
    ctx context.Context,
    req resource.UpdateRequest,
    resp *resource.UpdateResponse,
) {
    var plan CatalogEntryModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Call your API to update the entry
    resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Delete handles resource deletion
func (r *CatalogEntryResource) Delete(
    ctx context.Context,
    req resource.DeleteRequest,
    resp *resource.DeleteResponse,
) {
    var state CatalogEntryModel
    resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Call your API to delete the entry
    // State is automatically removed on successful delete
}
```

## Building and Installing

Build the provider binary and put it where Terraform can find it.

```bash
# Build the provider
go build -o terraform-provider-azurecatalog

# Create the local plugin directory
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/yourorg/azurecatalog/0.1.0/darwin_arm64

# Copy the binary
cp terraform-provider-azurecatalog ~/.terraform.d/plugins/registry.terraform.io/yourorg/azurecatalog/0.1.0/darwin_arm64/
```

## Using Your Custom Provider

Now you can use it in a Terraform configuration alongside the standard `azurerm` provider.

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    azurecatalog = {
      source  = "yourorg/azurecatalog"
      version = "0.1.0"
    }
  }
}

provider "azurecatalog" {
  catalog_endpoint = "https://catalog.internal.company.com/api"
  api_key          = var.catalog_api_key
  subscription_id  = var.subscription_id
}

# Create an Azure resource with the standard provider
resource "azurerm_storage_account" "data" {
  name                     = "stdataprod001"
  resource_group_name      = "rg-data"
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "GRS"
}

# Register it in the catalog with the custom provider
resource "azurecatalog_entry" "data_storage" {
  azure_resource_id = azurerm_storage_account.data.id
  service_name      = "data-platform"
  owner             = "data-engineering"
  cost_center       = "CC-4200"
  environment       = "production"
  classification    = "confidential"
}
```

## Testing Your Provider

Write acceptance tests that verify the CRUD operations work correctly.

```go
// internal/resources/catalog_entry_test.go
package resources_test

import (
    "testing"

    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAccCatalogEntry_basic(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `
                    resource "azurecatalog_entry" "test" {
                        azure_resource_id = "/subscriptions/xxx/resourceGroups/rg-test"
                        service_name      = "test-service"
                        owner             = "platform-team"
                        cost_center       = "CC-1000"
                        environment       = "test"
                    }
                `,
                Check: resource.ComposeTestCheckFunc(
                    resource.TestCheckResourceAttr(
                        "azurecatalog_entry.test", "service_name", "test-service"),
                    resource.TestCheckResourceAttrSet(
                        "azurecatalog_entry.test", "id"),
                ),
            },
        },
    })
}
```

## Conclusion

Building a custom Terraform provider is more work than using provisioners or external scripts, but the result is a first-class Terraform experience with proper state management, plan output, and drift detection. For Azure-specific automation that falls outside what the official provider handles, this gives your team a clean, maintainable way to manage those resources alongside everything else in their Terraform configurations.
