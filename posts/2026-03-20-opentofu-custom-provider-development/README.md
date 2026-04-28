# Developing a Custom Provider for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Custom-provider, Go

Description: Learn the fundamentals of developing a custom OpenTofu provider to manage resources in your own APIs and services.

Custom providers let you manage any resource through OpenTofu - internal APIs, specialized services, or systems not covered by existing providers. Providers are written in Go using the Terraform Plugin Framework.

## Prerequisites

- Go 1.21+
- OpenTofu or Terraform installed
- Basic Go knowledge

## Project Structure

```text
terraform-provider-petstore/
├── main.go
├── go.mod
├── go.sum
├── internal/
│   └── provider/
│       ├── provider.go          # Provider definition
│       ├── pet_resource.go      # Resource implementation
│       └── pet_data_source.go   # Data source implementation
└── examples/
    └── main.tf
```

## Setting Up the Module

```bash
mkdir terraform-provider-petstore && cd terraform-provider-petstore
go mod init terraform-provider-petstore
go get github.com/hashicorp/terraform-plugin-framework@latest
```

## Provider Definition

```go
// internal/provider/provider.go
package provider

import (
    "context"
    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
    "github.com/hashicorp/terraform-plugin-framework/resource"
)

type PetstoreProvider struct{}

func New() provider.Provider {
    return &PetstoreProvider{}
}

func (p *PetstoreProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "petstore"
    resp.Version = "1.0.0"
}

func (p *PetstoreProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "endpoint": schema.StringAttribute{
                Required:    true,
                Description: "Petstore API endpoint URL",
            },
            "api_key": schema.StringAttribute{
                Optional:    true,
                Sensitive:   true,
                Description: "API key for authentication",
            },
        },
    }
}

func (p *PetstoreProvider) Configure(_ context.Context, _ provider.ConfigureRequest, _ *provider.ConfigureResponse) {
    // Read provider config and initialize an API client here.
}

func (p *PetstoreProvider) Resources(_ context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewPetResource,
    }
}

func (p *PetstoreProvider) DataSources(_ context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewPetDataSource,
    }
}
```

Resource Implementation

```go
// internal/provider/pet_resource.go
package provider

import (
    "context"
    "github.com/hashicorp/terraform-plugin-framework/resource"
    "github.com/hashicorp/terraform-plugin-framework/resource/schema"
    "github.com/hashicorp/terraform-plugin-framework/types"
)

type PetResource struct{}
type PetModel struct {
    ID     types.String `tfsdk:"id"`
    Name   types.String `tfsdk:"name"`
    Status types.String `tfsdk:"status"`
}

func NewPetResource() resource.Resource {
    return &PetResource{}
}

func (r *PetResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
    resp.TypeName = req.ProviderTypeName + "_pet"
}

func (r *PetResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Description: "Manages a pet in the petstore",
        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed:    true,
                Description: "Pet identifier",
            },
            "name": schema.StringAttribute{
                Required:    true,
                Description: "Pet name",
            },
            "status": schema.StringAttribute{
                Optional:    true,
                Computed:    true,
                Description: "Pet status: available, pending, sold",
            },
        },
    }
}

func (r *PetResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var data PetModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)
    if resp.Diagnostics.HasError() {
        return
    }

    // Call your API here
    // pet, err := client.CreatePet(data.Name.ValueString())
    // if err != nil { ... }

    data.ID = types.StringValue("pet-123")
    data.Status = types.StringValue("available")

    resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
}

func (r *PetResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
    // Implement Read...
}

func (r *PetResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
    // Implement Update...
}

func (r *PetResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
    // Implement Delete...
}
```

## Using the Custom Provider

```hcl
terraform {
  required_providers {
    petstore = {
      source  = "myorg/petstore"
      version = "~> 1.0"
    }
  }
}

provider "petstore" {
  endpoint = "https://petstore.example.com/api"
  api_key  = var.petstore_api_key
}

resource "petstore_pet" "fluffy" {
  name   = "Fluffy"
  status = "available"
}

output "pet_id" {
  value = petstore_pet.fluffy.id
}
```

## Building and Local Testing

```bash
# Build the provider

go build -o terraform-provider-petstore

# Install locally for testing (OpenTofu resolves bare source addresses
# under registry.opentofu.org by default)
mkdir -p ~/.terraform.d/plugins/registry.opentofu.org/myorg/petstore/1.0.0/linux_amd64/
cp terraform-provider-petstore ~/.terraform.d/plugins/registry.opentofu.org/myorg/petstore/1.0.0/linux_amd64/

# Or use dev_overrides
cat > ~/.tofurc << 'EOF'
provider_installation {
  dev_overrides {
    "myorg/petstore" = "/home/user/go/bin"
  }
  direct {}
}
EOF

# Build and install to GOPATH
go install .

# Test your provider
cd examples/
tofu plan
```

## Conclusion

Building a custom provider opens up OpenTofu to manage any resource accessible via an API. Use the Terraform Plugin Framework for new providers, follow the CRUD (Create, Read, Update, Delete) pattern for resources, and test thoroughly with acceptance tests. Once ready, you can publish to the OpenTofu or Terraform registry for community use.
