# How to Use Provider-Defined Functions Introduced in OpenTofu 1.7

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider Functions, OpenTofu 1.7, HCL, Infrastructure as Code

Description: Learn how to use provider-defined functions in OpenTofu 1.7 that extend HCL with custom functions provided by providers, such as AWS ARN parsing.

## Introduction

OpenTofu 1.7 introduced provider-defined functions, allowing providers to expose custom functions usable in HCL configurations. These functions are called with the `provider::<provider_name>::<function_name>()` syntax and enable richer data transformations without external data sources.

## Enabling and Using Provider Functions

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.44.0"  # includes arn_parse, arn_build, and trim_iam_role_path
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## AWS Provider ARN Functions

The AWS provider exposes functions for parsing and constructing ARNs.

```hcl
# Parse an ARN into its components

locals {
  bucket_arn = "arn:aws:s3:::my-example-bucket"

  # provider::aws::arn_parse() returns an object with ARN components
  parsed_arn = provider::aws::arn_parse(local.bucket_arn)
}

output "arn_partition" {
  value = local.parsed_arn.partition  # "aws"
}

output "arn_service" {
  value = local.parsed_arn.service   # "s3"
}

output "arn_region" {
  value = local.parsed_arn.region    # "" (S3 ARNs have no region)
}

output "arn_account_id" {
  value = local.parsed_arn.account_id # ""
}

output "arn_resource" {
  value = local.parsed_arn.resource   # "my-example-bucket"
}
```

## Using Functions in Resource Configuration

```hcl
data "aws_caller_identity" "current" {}

locals {
  # Extract account ID from the caller's ARN
  caller_arn   = data.aws_caller_identity.current.arn
  parsed_caller = provider::aws::arn_parse(local.caller_arn)

  # Use the extracted account ID in resource names
  bucket_name = "my-app-${local.parsed_caller.account_id}"
}

resource "aws_s3_bucket" "app" {
  bucket = local.bucket_name
}
```

## Trimming IAM Role Paths

```hcl
# Some services require IAM role ARNs without a path prefix
locals {
  role_arn = "arn:aws:iam::123456789012:role/team/MyRole"

  # trim_iam_role_path() removes the path and keeps the role name
  base_arn = provider::aws::trim_iam_role_path(local.role_arn)
}
```

## Writing Provider Functions (Provider Authors)

If you're writing a custom provider, you can define functions using the Plugin Framework:

```go
// In your provider implementation (Go)
func (p *ExampleProvider) Functions(_ context.Context) []func() function.Function {
    return []func() function.Function{
        NewParseResourceIDFunction,
    }
}

type parseResourceIDFunction struct{}

func NewParseResourceIDFunction() function.Function {
    return &parseResourceIDFunction{}
}

func (f *parseResourceIDFunction) Metadata(_ context.Context, _ function.MetadataRequest, resp *function.MetadataResponse) {
    resp.Name = "parse_resource_id"
}

func (f *parseResourceIDFunction) Definition(_ context.Context, _ function.DefinitionRequest, resp *function.DefinitionResponse) {
    resp.Definition = function.Definition{
        Summary: "Parse a compound resource ID",
        Parameters: []function.Parameter{
            function.StringParameter{
                Name: "id",
            },
        },
        Return: function.ObjectReturn{
            AttributeTypes: map[string]attr.Type{
                "org":  types.StringType,
                "name": types.StringType,
            },
        },
    }
}

func (f *parseResourceIDFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
    var id string

    resp.Error = function.ConcatFuncErrors(req.Arguments.Get(ctx, &id))
    if resp.Error != nil {
        return
    }

    parts := strings.SplitN(id, "/", 2)
    if len(parts) != 2 {
        resp.Error = function.ConcatFuncErrors(resp.Error, function.NewFuncError("expected ID in the form org/name"))
        return
    }

    result, diags := types.ObjectValue(
        map[string]attr.Type{
            "org":  types.StringType,
            "name": types.StringType,
        },
        map[string]attr.Value{
            "org":  types.StringValue(parts[0]),
            "name": types.StringValue(parts[1]),
        },
    )
    if diags.HasError() {
        resp.Error = function.ConcatFuncErrors(resp.Error, function.FuncErrorFromDiags(ctx, diags))
        return
    }

    resp.Error = function.ConcatFuncErrors(resp.Result.Set(ctx, result))
}
```

## Checking Available Functions

```bash
# After init, provider functions are documented in the provider's registry page
# Or check via the provider's source code

# You can also test functions using the console from a module where the provider is initialized
echo 'provider::aws::arn_parse("arn:aws:s3:::my-bucket")' | tofu console
```

## Summary

Provider-defined functions in OpenTofu 1.7 extend HCL with provider-specific operations like ARN parsing, reducing the need for complex string manipulation with `split()` and `regex()`. The `provider::<name>::<function>()` syntax makes provider functions discoverable and explicitly scoped. As more providers adopt the Plugin Framework, the ecosystem of available functions will grow.
