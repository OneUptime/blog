# How to Develop a Custom OpenTofu Provider in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Provider, Go

Description: Learn the fundamentals of developing a custom OpenTofu provider in Go using the Plugin Framework to manage resources in any API.

## Introduction

A custom OpenTofu provider lets you manage resources in any API - internal services, proprietary systems, or APIs not covered by community providers. Providers are written in Go using the Terraform Plugin Framework, which is also compatible with OpenTofu.

## Prerequisites

- Go 1.21 or later
- Basic Go knowledge
- OpenTofu installed for testing

## Project Setup

```bash
# Create a new provider project

mkdir terraform-provider-petstore
cd terraform-provider-petstore

# Initialize Go module (name must start with terraform-provider-)
go mod init github.com/your-org/terraform-provider-petstore

# Add the plugin framework
go get github.com/hashicorp/terraform-plugin-framework@latest
```

## Provider Structure

```text
terraform-provider-petstore/
├── main.go                   # Entry point
├── internal/
│   └── provider/
│       ├── provider.go       # Provider definition
│       └── pet_resource.go   # Resource implementation
└── examples/
    └── main.tf               # Usage example
```

## Provider Definition

```go
// internal/provider/provider.go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/provider/schema"
)

type PetstoreProvider struct{}

func (p *PetstoreProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "endpoint": schema.StringAttribute{
                Required:    true,
                Description: "Petstore API endpoint URL",
            },
            "api_key": schema.StringAttribute{
                Required:    true,
                Sensitive:   true,
                Description: "API key for authentication",
            },
        },
    }
}
```

## Resource Implementation

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
    ID   types.String `tfsdk:"id"`
    Name types.String `tfsdk:"name"`
    Kind types.String `tfsdk:"kind"`
}

func (r *PetResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        Attributes: map[string]schema.Attribute{
            "id":   schema.StringAttribute{Computed: true},
            "name": schema.StringAttribute{Required: true},
            "kind": schema.StringAttribute{Required: true},
        },
    }
}

func (r *PetResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
    var data PetModel
    resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)

    // Call your API here
    data.ID = types.StringValue("pet-123")

    resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
}
```

## Main Entry Point

```go
// main.go
package main

import (
    "context"

    tfprovider "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/your-org/terraform-provider-petstore/internal/provider"
)

func main() {
    providerserver.Serve(context.Background(), func() tfprovider.Provider {
        return &provider.PetstoreProvider{}
    }, providerserver.ServeOpts{
        Address: "registry.opentofu.org/your-org/petstore",
    })
}
```

## Building and Testing Locally

```bash
# Build the provider binary
go build -o terraform-provider-petstore

# Configure OpenTofu to use the local binary
cat > ~/.tofurc << 'EOF'
provider_installation {
  dev_overrides {
    "your-org/petstore" = "/path/to/terraform-provider-petstore"
  }
  direct {}
}
EOF

# Test with a minimal configuration
tofu apply
```

## Conclusion

Custom OpenTofu providers bridge the gap between OpenTofu and APIs that lack community support. The Terraform Plugin Framework handles the gRPC communication with OpenTofu core, leaving you to implement schema definitions and CRUD operations. Start with a single resource, build up test coverage, and publish to the registry when ready.
