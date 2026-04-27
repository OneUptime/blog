# Using Provider-Defined Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Function

Description: Learn how to use provider-defined functions in OpenTofu 1.7+ to call provider-specific logic directly in your configuration.

OpenTofu 1.7 introduced provider-defined functions - custom functions that providers can expose for use in your configurations. These allow providers to offer complex logic (like ARN parsing, CIDR manipulation, or encoding) directly callable from HCL.

## What Are Provider-Defined Functions?

Provider-defined functions are like built-in functions, but implemented by the provider rather than OpenTofu itself. They are called using the `provider::` prefix:

```hcl
# Call a provider-defined function

result = provider::<provider_name>::<function_name>(<arguments>)
```

## Using AWS Provider Functions

The AWS provider exposes several useful functions:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.49"  # Functions require recent version
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Parse an ARN into its components
locals {
  bucket_arn = "arn:aws:s3:::my-important-bucket"
  arn_parts  = provider::aws::arn_parse(local.bucket_arn)
}

output "arn_service" {
  value = local.arn_parts.service  # "s3"
}

output "arn_region" {
  value = local.arn_parts.region  # "" (S3 is global)
}

output "arn_account" {
  value = local.arn_parts.account_id  # ""
}

output "arn_resource" {
  value = local.arn_parts.resource  # "my-important-bucket"
}
```

## Trimming ARN Suffix

```hcl
# Use AWS functions for IAM role ARN manipulation
resource "aws_iam_role" "app" {
  name = "application-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

locals {
  # Extract the role name from the ARN
  role_arn_parts = provider::aws::arn_parse(aws_iam_role.app.arn)
  role_name_from_arn = split("/", local.role_arn_parts.resource)[1]
}
```

## Custom Provider Functions

When building a custom provider, you can expose functions:

```go
// internal/provider/functions.go
package provider

import (
    "context"
    "fmt"

    "github.com/hashicorp/terraform-plugin-framework/function"
)

type FormatNameFunction struct{}

func NewFormatNameFunction() function.Function {
    return &FormatNameFunction{}
}

func (f *FormatNameFunction) Metadata(_ context.Context, req function.MetadataRequest, resp *function.MetadataResponse) {
    resp.Name = "format_resource_name"
}

func (f *FormatNameFunction) Definition(_ context.Context, _ function.DefinitionRequest, resp *function.DefinitionResponse) {
    resp.Definition = function.Definition{
        Summary:     "Format a resource name",
        Description: "Formats a name with prefix and suffix for consistent naming",
        Parameters: []function.Parameter{
            function.StringParameter{
                Name:        "base_name",
                Description: "The base resource name",
            },
            function.StringParameter{
                Name:        "environment",
                Description: "Environment (dev, staging, prod)",
            },
        },
        Return: function.StringReturn{},
    }
}

func (f *FormatNameFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
    var baseName, environment string
    resp.Error = function.ConcatFuncErrors(
        req.Arguments.Get(ctx, &baseName, &environment),
    )
    if resp.Error != nil {
        return
    }

    result := fmt.Sprintf("%s-%s", environment, baseName)
    resp.Error = resp.Result.Set(ctx, result)
}
```

Register functions in your provider:

```go
func (p *MyProvider) Functions(_ context.Context) []func() function.Function {
    return []func() function.Function{
        NewFormatNameFunction,
    }
}
```

Using the custom function:

```hcl
provider "myprovider" {}

locals {
  db_name = provider::myprovider::format_resource_name("database", "prod")
  # Result: "prod-database"
}

resource "aws_db_instance" "main" {
  identifier = local.db_name
  # ...
}
```

## Real-World Use Case: Consistent Resource Naming

```hcl
provider "aws" {
  region = "us-east-1"
}

# Use provider functions to build consistent resource names
locals {
  app_arn    = "arn:aws:lambda:us-east-1:123456789012:function:my-app"
  parsed_arn = provider::aws::arn_parse(local.app_arn)
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/lambda/${split(":", local.parsed_arn.resource)[1]}"
  retention_in_days = 30
}
```

## Listing Available Provider Functions

```bash
# See what functions a provider exposes
tofu providers schema -json | jq '.provider_schemas."registry.opentofu.org/hashicorp/aws".functions'

# Or check the provider documentation
```

## Conclusion

Provider-defined functions extend OpenTofu's expression language with domain-specific operations. Use the `provider::` prefix to call them in your configurations. As providers increasingly adopt this feature, you'll find powerful utilities for ARN manipulation, CIDR operations, encoding, and more available directly in your HCL - no workarounds needed.
