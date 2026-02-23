# How to Use the encode_expr Provider Function

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the encode_expr provider function in Terraform to serialize Terraform values into HCL expression strings for dynamic code generation and templating.

---

When you need to convert a Terraform value back into its HCL expression representation as a string, the `encode_expr` provider function is the tool for the job. Introduced alongside other provider-defined functions in Terraform 1.8, `encode_expr` does the reverse of what functions like `decode_tfvars` do. It takes a Terraform value - a string, number, list, map, or any complex type - and produces the HCL expression string that represents it.

This is useful when you are generating Terraform code, building templates, or constructing configuration files that need to contain valid HCL syntax.

## What encode_expr Does

Put simply, `encode_expr` serializes a Terraform value into a string that, if you pasted it into a `.tf` file, would be a valid HCL expression. For example, a list like `["a", "b", "c"]` gets turned into the string `["a", "b", "c"]` - the literal HCL representation.

This is different from `jsonencode`, which produces JSON syntax. While JSON and HCL overlap for simple types, they diverge for things like heredoc strings, object syntax, and how booleans are represented in context.

## Setting Up the Provider

Just like other built-in Terraform provider functions, you need to declare the `hashicorp/terraform` provider:

```hcl
# main.tf - Required provider declaration
terraform {
  required_version = ">= 1.8.0"

  required_providers {
    terraform = {
      source = "hashicorp/terraform"
    }
  }
}
```

After this, the function is available as `provider::terraform::encode_expr`.

## Basic Usage

Here is a simple example that converts different Terraform types into their HCL string representations:

```hcl
locals {
  # Simple string value
  string_expr = provider::terraform::encode_expr("hello world")
  # Result: "hello world"

  # A number
  number_expr = provider::terraform::encode_expr(42)
  # Result: 42

  # A boolean
  bool_expr = provider::terraform::encode_expr(true)
  # Result: true

  # A list of strings
  list_expr = provider::terraform::encode_expr(["us-east-1", "us-west-2", "eu-west-1"])
  # Result: ["us-east-1", "us-west-2", "eu-west-1"]

  # A map
  map_expr = provider::terraform::encode_expr({
    environment = "production"
    team        = "platform"
    cost_center = "engineering"
  })
  # Result: { cost_center = "engineering", environment = "production", team = "platform" }
}

output "encoded_list" {
  value = local.list_expr
}

output "encoded_map" {
  value = local.map_expr
}
```

## Generating Terraform Code

The primary use case for `encode_expr` is when you need to generate Terraform configuration files programmatically. Maybe you have a CI/CD pipeline that generates `.tfvars` files, or you want to create configuration templates:

```hcl
# Generate a tfvars file content dynamically
locals {
  # Define the configuration as native Terraform types
  app_config = {
    instance_type = "t3.large"
    replicas      = 3
    regions       = ["us-east-1", "eu-west-1"]
    enable_cdn    = true
    tags = {
      managed_by = "terraform"
      team       = "infrastructure"
    }
  }

  # Build a tfvars-formatted string
  tfvars_content = join("\n", [
    "instance_type = ${provider::terraform::encode_expr(local.app_config.instance_type)}",
    "replicas      = ${provider::terraform::encode_expr(local.app_config.replicas)}",
    "regions       = ${provider::terraform::encode_expr(local.app_config.regions)}",
    "enable_cdn    = ${provider::terraform::encode_expr(local.app_config.enable_cdn)}",
    "tags          = ${provider::terraform::encode_expr(local.app_config.tags)}",
  ])
}

# Write the generated content to a file using local_file
resource "local_file" "generated_tfvars" {
  content  = local.tfvars_content
  filename = "${path.module}/generated/app.auto.tfvars"
}
```

The output file will contain properly formatted HCL that you could feed into another Terraform configuration.

## Combining with Templates

You can use `encode_expr` inside `templatefile` calls to inject properly formatted HCL values into templates:

```hcl
# template.tftpl - A template for generating module calls
# Note: the template receives already-encoded values

module "app" {
  source = "./modules/app"

  name     = ${name}
  replicas = ${replicas}
  regions  = ${regions}
  tags     = ${tags}
}
```

```hcl
# main.tf - Render the template with encoded values
locals {
  module_block = templatefile("${path.module}/template.tftpl", {
    name     = provider::terraform::encode_expr("my-application")
    replicas = provider::terraform::encode_expr(3)
    regions  = provider::terraform::encode_expr(["us-east-1", "eu-west-1"])
    tags     = provider::terraform::encode_expr({
      environment = "production"
      team        = "platform"
    })
  })
}

output "generated_module_block" {
  value = local.module_block
}
```

This approach is cleaner than trying to manually format HCL strings with string interpolation, especially when dealing with nested maps and lists.

## encode_expr vs jsonencode

You might wonder why not just use `jsonencode` for everything. The difference matters when the output needs to be valid HCL specifically:

```hcl
locals {
  example_map = {
    name    = "web-server"
    enabled = true
  }

  # jsonencode produces JSON syntax
  json_version = jsonencode(local.example_map)
  # Result: {"enabled":true,"name":"web-server"}

  # encode_expr produces HCL syntax
  hcl_version = provider::terraform::encode_expr(local.example_map)
  # Result: { enabled = true, name = "web-server" }
}
```

JSON uses colons and requires quoted keys. HCL uses equals signs and does not require quoted keys (for simple identifiers). If you are generating files meant to be read by Terraform or other HCL-based tools (like Packer or Nomad), `encode_expr` gives you the right format.

## Practical Example - Dynamic Backend Configuration

Here is a more realistic scenario. Suppose you manage multiple Terraform workspaces and want to generate backend configuration files for each:

```hcl
variable "workspaces" {
  description = "Map of workspace names to their backend config"
  type = map(object({
    bucket         = string
    key            = string
    region         = string
    dynamodb_table = string
    encrypt        = bool
  }))
  default = {
    dev = {
      bucket         = "my-terraform-state-dev"
      key            = "infrastructure/terraform.tfstate"
      region         = "us-east-1"
      dynamodb_table = "terraform-locks-dev"
      encrypt        = true
    }
    prod = {
      bucket         = "my-terraform-state-prod"
      key            = "infrastructure/terraform.tfstate"
      region         = "us-east-1"
      dynamodb_table = "terraform-locks-prod"
      encrypt        = true
    }
  }
}

# Generate a backend config file for each workspace
resource "local_file" "backend_config" {
  for_each = var.workspaces

  filename = "${path.module}/backends/${each.key}.hcl"
  content  = join("\n", [
    "# Auto-generated backend configuration for ${each.key}",
    "bucket         = ${provider::terraform::encode_expr(each.value.bucket)}",
    "key            = ${provider::terraform::encode_expr(each.value.key)}",
    "region         = ${provider::terraform::encode_expr(each.value.region)}",
    "dynamodb_table = ${provider::terraform::encode_expr(each.value.dynamodb_table)}",
    "encrypt        = ${provider::terraform::encode_expr(each.value.encrypt)}",
    "",
  ])
}
```

Each generated file will contain properly formatted HCL that you can use with `terraform init -backend-config=backends/dev.hcl`.

## Handling Null and Special Values

The function handles special Terraform values correctly:

```hcl
locals {
  # Null values
  null_expr = provider::terraform::encode_expr(null)
  # Result: null

  # Empty structures
  empty_list = provider::terraform::encode_expr([])
  # Result: []

  empty_map = provider::terraform::encode_expr({})
  # Result: {}
}
```

This is important when you are generating configuration that might include optional values. Null gets serialized as the literal `null`, which is valid HCL.

## Limitations to Keep in Mind

There are a few things to be aware of when working with `encode_expr`:

1. The output is always a single-line representation. If you need pretty-printed, multi-line HCL for deeply nested structures, you may need to do additional formatting.

2. Map keys are sorted alphabetically in the output. If key order matters to you for readability, you will need to handle that separately.

3. The function works only with values that Terraform can fully evaluate at plan time. You cannot encode values that depend on resources that have not been created yet (values that are "known after apply").

## Summary

The `encode_expr` function is the complement to `decode_tfvars`. Where `decode_tfvars` reads HCL into Terraform values, `encode_expr` writes Terraform values back out as HCL. It is most useful when you are generating Terraform or HCL configuration files programmatically, building templates, or creating tooling that produces valid HCL output. Combined with `templatefile` and `local_file`, it gives you a clean pipeline for dynamic code generation within Terraform itself.

For the complementary parsing function, see [How to Use the decode_tfvars Provider Function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-decode-tfvars-provider-function/view). To test these functions interactively, check out [How to Debug Function Outputs Using terraform console](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-function-outputs-using-terraform-console/view).
