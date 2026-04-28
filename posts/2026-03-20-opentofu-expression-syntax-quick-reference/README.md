# How to Use the OpenTofu Expression Syntax Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Expression, HCL, Quick Reference, Infrastructure as Code

Description: A quick reference for OpenTofu expression syntax including references, operators, conditionals, for expressions, and splat expressions.

## Introduction

HCL expressions compute values dynamically from variables, resource attributes, locals, and built-in functions. This quick reference covers all expression types with practical examples.

## References

```hcl
# Resource attributes

aws_s3_bucket.main.id
aws_s3_bucket.main.arn
aws_s3_bucket.main.bucket_regional_domain_name

# for_each resource instances
aws_s3_bucket.env["prod"].id
aws_s3_bucket.env["staging"].arn

# count-based instances
aws_instance.web[0].id
aws_instance.web[count.index].private_ip

# Variables
var.environment
var.instance_types["prod"]
var.tags["Name"]

# Locals
local.name_prefix
local.common_tags

# Module outputs
module.vpc.id
module.networking.private_subnet_ids

# Data sources
data.aws_ami.ubuntu.id
data.aws_caller_identity.current.account_id

# Path references
path.module     # directory of current module
path.root       # directory of root module
path.cwd        # current working directory
```

## String Expressions

```hcl
# Template strings
"myapp-${var.environment}"
"arn:aws:s3:::${aws_s3_bucket.main.bucket}/*"
"${var.prefix}-${local.suffix}-${formatdate("YYYYMMDD", timestamp())}"

# Multi-line heredoc
<<-EOT
  This is line 1
  This is line 2 with ${var.name}
EOT
```

## Operators

```hcl
# Arithmetic
count = var.base_count + var.extra_count
size  = var.gb * 1024

# Comparison
is_prod    = var.environment == "prod"
is_not_dev = var.environment != "dev"
is_large   = var.instance_count >= 10

# Logical
enabled    = var.feature_a && var.feature_b
optional   = var.use_a || var.use_b
inverted   = !var.disable_feature

# Null coalescing
name = coalesce(var.custom_name, local.default_name)
```

## Conditional Expressions

```hcl
# Ternary
instance_type = var.environment == "prod" ? "m5.large" : "t3.micro"

# Nested ternary (use locals for clarity)
locals {
  size = var.env == "prod" ? "large" : var.env == "staging" ? "medium" : "small"
}

# Null conditional
key_name = var.ssh_key_name != "" ? var.ssh_key_name : null
```

## for Expressions

```hcl
# List comprehension
upper_names = [for name in var.names : upper(name)]

# List with filter
long_names = [for name in var.names : name if length(name) > 5]

# Map comprehension
bucket_arns = {for k, v in aws_s3_bucket.env : k => v.arn}

# Transform keys
tagged = {for k, v in var.raw_tags : lower(k) => trimspace(v)}

# Complex: list of objects to map
sg_map = {for sg in var.security_groups : sg.name => sg.id}

# Nested for (flatten first)
all_ips = flatten([for server in var.servers : server.ip_addresses])
```

## Splat Expressions

```hcl
# Splat expression ([*]) - extract attributes from list of resources
all_ids   = aws_instance.web[*].id
all_arns  = aws_instance.web[*].arn

# Splat applied to any list of objects
all_azs   = aws_subnet.private[*].availability_zone

# Legacy attribute-only splat (.*) - older, less flexible form
legacy_arns = aws_instance.web.*.arn

# for expression (more flexible alternative)
all_ids   = [for i in aws_instance.web : i.id]
```

## Dynamic Expressions

```hcl
# can() - evaluate without error
is_valid = can(regex("^\\d{12}$", var.account_id))

# try() - return first non-error value
value = try(var.map["key"], "default_value")

# one() - expect at most one element
single_id = one(aws_subnet.private[*].id)  # null if 0, errors if > 1
```

## Template Directives

```hcl
# if directive in template strings (escape inner quotes)
message = "%{ if var.environment == \"prod\" }PRODUCTION%{ else }NON-PROD%{ endif }"

# for directive in template strings
names = "%{~ for name in var.names ~}${name},%{~ endfor ~}"
```

## Summary

OpenTofu expressions let you compute values dynamically from any combination of variables, resource attributes, data sources, locals, and built-in functions. Master the ternary conditional for simple branching, `for` expressions for collection transformations, and splat expressions for bulk attribute extraction. Use `tofu console` to test expressions interactively before committing them to configuration files.
