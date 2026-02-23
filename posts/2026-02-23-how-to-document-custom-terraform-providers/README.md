# How to Document Custom Terraform Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Documentation, Infrastructure as Code, Developer Experience

Description: Learn how to create comprehensive documentation for custom Terraform providers using tfplugindocs, schema descriptions, and examples to ensure a great developer experience.

---

Good documentation is the difference between a provider that people love and one that people avoid. When users adopt your custom Terraform provider, documentation is often their first interaction. Clear, complete, and accurate docs reduce support burden, increase adoption, and make your provider a pleasure to use.

In this guide, we will cover how to document your custom Terraform provider using the official tooling, schema descriptions, and best practices for creating documentation that your users will appreciate.

## Documentation Structure

Terraform provider documentation follows a specific structure that the Terraform Registry expects. The documentation lives in a `docs/` directory at the root of your provider repository:

```
terraform-provider-example/
  docs/
    index.md                    # Provider documentation
    resources/
      server.md                 # Resource documentation
      database.md
    data-sources/
      server.md                 # Data source documentation
      regions.md
    guides/
      getting-started.md        # Guide documentation
      authentication.md
    functions/
      parse_id.md               # Function documentation
```

## Using tfplugindocs

The `tfplugindocs` tool generates documentation from your provider's schema. This ensures that your docs stay in sync with your code.

### Installation

```bash
# Install tfplugindocs
go install github.com/hashicorp/terraform-plugin-docs/cmd/tfplugindocs@latest
```

### Generating Documentation

Run the generator from your provider's root directory:

```bash
# Generate docs from schema
tfplugindocs generate

# Validate the generated docs
tfplugindocs validate
```

### Using Templates

You can create templates to customize the generated documentation. Place templates in the `templates/` directory:

```
terraform-provider-example/
  templates/
    index.md.tmpl               # Provider template
    resources/
      server.md.tmpl            # Resource template
    data-sources/
      server.md.tmpl            # Data source template
```

Here is an example resource template:

```markdown
---
page_title: "{{.Name}} {{.Type}} - {{.ProviderName}}"
subcategory: ""
description: |-
  {{ .Description | plainmarkdown | trimspace | prefixlines "  " }}
---

# {{.Name}} ({{.Type}})

{{ .Description | trimspace }}

## Example Usage

{{ tffile "examples/resources/example_server/resource.tf" }}

{{ .SchemaMarkdown | trimspace }}

## Import

Import is supported using the following syntax:

{{ codefile "shell" "examples/resources/example_server/import.sh" }}
```

## Schema Descriptions

The most important source of documentation is your schema descriptions. These descriptions are used by `tfplugindocs` to generate the attribute documentation.

### Writing Good Schema Descriptions

```go
func (r *ServerResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
    resp.Schema = schema.Schema{
        // Top-level resource description
        Description: "Manages a server instance in the Example Cloud platform.",
        MarkdownDescription: "Manages a server instance in the Example Cloud platform. " +
            "Servers are the primary compute resources and can be configured with " +
            "different sizes, regions, and networking options.",

        Attributes: map[string]schema.Attribute{
            "id": schema.StringAttribute{
                Computed:    true,
                Description: "The unique identifier for the server.",
            },
            "name": schema.StringAttribute{
                Required: true,
                Description: "The name of the server. Must be between 3 and 64 characters " +
                    "and can only contain alphanumeric characters, hyphens, and underscores.",
            },
            "region": schema.StringAttribute{
                Required: true,
                Description: "The region where the server will be deployed. " +
                    "Once set, this value cannot be changed without recreating the server.",
                MarkdownDescription: "The region where the server will be deployed. " +
                    "See the [regions guide](../guides/regions.md) for available options. " +
                    "Once set, this value cannot be changed without recreating the server.",
            },
            "size": schema.StringAttribute{
                Required: true,
                Description: "The size of the server. Valid values are: small, medium, large, xlarge.",
            },
            "ip_address": schema.StringAttribute{
                Computed:    true,
                Description: "The public IP address assigned to the server after creation.",
            },
            "enable_monitoring": schema.BoolAttribute{
                Optional:    true,
                Computed:    true,
                Description: "Whether to enable monitoring for the server. Defaults to true.",
            },
            "tags": schema.MapAttribute{
                Optional:    true,
                ElementType: types.StringType,
                Description: "A map of tags to assign to the server. Tags are key-value pairs " +
                    "that help organize and categorize resources.",
            },
        },
    }
}
```

### Description Best Practices

When writing descriptions, follow these guidelines:

- Start with what the attribute does
- Include valid values for enumerated attributes
- Mention default values for optional attributes
- Note if changing the value forces recreation
- Use `MarkdownDescription` for links and formatting
- Keep descriptions concise but complete

## Example Files

Examples are crucial for documentation. Create them in an `examples/` directory:

```
examples/
  provider/
    provider.tf                 # Provider configuration example
  resources/
    example_server/
      resource.tf               # Basic resource example
      import.sh                 # Import command example
  data-sources/
    example_server/
      data-source.tf            # Data source example
```

### Provider Example

```hcl
# examples/provider/provider.tf

# Configure the Example provider
provider "example" {
  # API key for authentication
  # Can also be set via the EXAMPLE_API_KEY environment variable
  api_key = var.example_api_key

  # API endpoint (optional)
  # Defaults to https://api.example.com
  api_url = "https://api.example.com"

  # Region for the provider (optional)
  # Defaults to us-east-1
  region = "us-east-1"
}
```

### Resource Example

```hcl
# examples/resources/example_server/resource.tf

# Create a basic server
resource "example_server" "web" {
  name   = "web-server-01"
  region = "us-east-1"
  size   = "medium"

  enable_monitoring = true

  tags = {
    environment = "production"
    team        = "platform"
  }
}

# Create a server with all options
resource "example_server" "api" {
  name   = "api-server-01"
  region = "us-west-2"
  size   = "large"

  enable_monitoring = true
  backup_enabled    = true
  backup_schedule   = "daily"

  network_config {
    vpc_id    = example_vpc.main.id
    subnet_id = example_subnet.private.id
  }

  tags = {
    environment = "production"
    team        = "backend"
    service     = "api"
  }
}
```

### Import Example

```bash
# examples/resources/example_server/import.sh

# Import a server using its ID
terraform import example_server.web srv-abc123def456
```

## Writing Guides

Guides help users understand broader concepts and workflows. They complement the reference documentation for individual resources.

### Getting Started Guide

```markdown
---
page_title: "Getting Started with the Example Provider"
subcategory: ""
description: |-
  A guide to getting started with the Example Terraform provider.
---

# Getting Started with the Example Provider

This guide walks you through setting up the Example provider
and creating your first resources.

## Prerequisites

Before you begin, you will need:
- An Example Cloud account
- An API key with appropriate permissions
- Terraform 1.0 or later

## Authentication

The provider supports two authentication methods:

### Environment Variable

Set the `EXAMPLE_API_KEY` environment variable:

~> **Note:** Keep your API key secure.
Never commit it to version control.

### Provider Configuration

You can also set the API key directly in the provider configuration,
though environment variables are recommended for security:

## Creating Your First Server

Here is a complete example that creates a server:

## Next Steps

Now that you have created your first resource, explore the
full provider documentation to learn about all available
resources and data sources.
```

## Automating Documentation Checks

Add documentation validation to your CI pipeline:

```yaml
# .github/workflows/docs.yml
name: Documentation
on:
  pull_request:
    paths:
      - 'internal/**'
      - 'docs/**'
      - 'templates/**'
      - 'examples/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - name: Generate docs
        run: |
          go install github.com/hashicorp/terraform-plugin-docs/cmd/tfplugindocs@latest
          tfplugindocs generate
      - name: Check for diff
        run: |
          # Fail if generated docs differ from committed docs
          git diff --exit-code docs/
      - name: Validate docs
        run: tfplugindocs validate
```

## Best Practices

**Keep docs in sync with code.** Use `tfplugindocs` to generate docs from schema and check for drift in CI.

**Include examples for every resource.** Users often copy-paste examples, so make sure they work and cover common use cases.

**Document every attribute.** Even if an attribute seems obvious, add a description. Users should not have to guess.

**Show complete configurations.** Examples should include the provider block and all required attributes, so users can copy and use them directly.

**Document breaking changes.** When you release new versions, clearly document any breaking changes and migration paths.

**Use consistent formatting.** Follow the same structure across all resources and data sources for a consistent user experience.

## Conclusion

Good documentation is essential for a successful Terraform provider. By using `tfplugindocs`, writing detailed schema descriptions, providing comprehensive examples, and automating documentation checks, you can create a documentation experience that makes your provider easy to adopt and use.

For more on provider development, see our guides on [publishing custom providers to the registry](https://oneuptime.com/blog/post/2026-02-23-how-to-publish-custom-terraform-providers-to-registry/view) and [versioning custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-version-custom-terraform-providers/view).
