# How to Use Variables of Type Map in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Maps, HCL, Infrastructure as Code

Description: Learn how to declare and use map-type variables in Terraform for key-value lookups, resource tagging, environment-specific configuration, and dynamic resource creation.

---

Map variables in Terraform store key-value pairs where every key is a string and every value is the same type. They are incredibly useful for lookups, resource tags, environment-specific settings, and any situation where you need to associate named values. If you have worked with dictionaries in Python or objects in JavaScript, Terraform maps will feel familiar.

This post walks through declaring maps, operating on them, and putting them to work in real configurations.

## Declaring Map Variables

A map variable is declared with `type = map(value_type)`:

```hcl
# variables.tf

# Map of strings - the most common type
variable "tags" {
  description = "Resource tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Team        = "platform"
    ManagedBy   = "terraform"
  }
}

# Map of numbers
variable "port_mapping" {
  description = "Service name to port number mapping"
  type        = map(number)
  default = {
    http  = 80
    https = 443
    api   = 8080
  }
}

# Map of booleans
variable "feature_flags" {
  description = "Feature toggle flags"
  type        = map(bool)
  default = {
    enable_cdn     = true
    enable_waf     = false
    enable_logging = true
  }
}
```

All keys in a Terraform map are strings. All values must be the same type (all strings, all numbers, etc.). If you need mixed value types, use an `object` type instead.

## Providing Map Values

### In terraform.tfvars

```hcl
# terraform.tfvars

tags = {
  Environment = "production"
  Team        = "platform"
  CostCenter  = "eng-retail"
  Compliance  = "pci-dss"
}

instance_types = {
  dev     = "t3.micro"
  staging = "t3.small"
  prod    = "t3.xlarge"
}
```

### On the Command Line

```bash
terraform apply -var='tags={Environment="prod", Team="platform"}'
```

### Via Environment Variables

```bash
export TF_VAR_tags='{"Environment":"production","Team":"platform"}'
```

### In JSON

```json
{
  "tags": {
    "Environment": "production",
    "Team": "platform",
    "CostCenter": "eng-retail"
  }
}
```

## Accessing Map Values

### By Key

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.xlarge"
  }
}

variable "environment" {
  type = string
}

locals {
  # Look up a value by key
  current_instance_type = var.instance_types[var.environment]

  # Same thing using the lookup function (with a fallback)
  safe_instance_type = lookup(var.instance_types, var.environment, "t3.micro")
}
```

The `lookup()` function is safer because it provides a default value if the key does not exist. Direct bracket access will cause an error if the key is missing.

### Getting Keys and Values

```hcl
locals {
  # Get all keys as a list
  all_environments = keys(var.instance_types)
  # Result: ["dev", "prod", "staging"] (alphabetically sorted)

  # Get all values as a list
  all_types = values(var.instance_types)
  # Result: ["t3.micro", "t3.xlarge", "t3.small"] (matching key order)
}
```

## Using Maps with for_each

Maps and `for_each` are a natural pair. Each key becomes the resource identifier, and the value is accessible via `each.value`:

```hcl
variable "buckets" {
  description = "S3 bucket configurations"
  type        = map(string)
  default = {
    logs    = "private"
    assets  = "public-read"
    backups = "private"
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.buckets

  bucket = "mycompany-${each.key}-${var.environment}"

  tags = {
    Name       = each.key
    AccessType = each.value
  }
}
```

This creates three buckets: `mycompany-logs-dev`, `mycompany-assets-dev`, `mycompany-backups-dev`. The resource addresses will be `aws_s3_bucket.buckets["logs"]`, `aws_s3_bucket.buckets["assets"]`, etc. - much more readable than numeric indexes.

## Map Operations

### Merging Maps

The `merge()` function combines maps. Later arguments override earlier ones for duplicate keys.

```hcl
variable "default_tags" {
  type = map(string)
  default = {
    ManagedBy = "terraform"
    Project   = "web-store"
  }
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Merge default tags with extra tags
  # extra_tags override default_tags for duplicate keys
  all_tags = merge(var.default_tags, var.extra_tags, {
    Environment = var.environment
  })
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = local.all_tags
}
```

### Filtering Maps

```hcl
variable "services" {
  type = map(number)
  default = {
    web    = 80
    api    = 8080
    admin  = 9090
    debug  = 9999
  }
}

locals {
  # Keep only services with ports below 9000
  production_services = {
    for name, port in var.services :
    name => port
    if port < 9000
  }
  # Result: {web = 80, api = 8080}
}
```

### Transforming Maps

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    dev  = "t3.micro"
    prod = "t3.large"
  }
}

locals {
  # Transform values
  instance_descriptions = {
    for env, type in var.instance_types :
    env => "Environment ${env} uses ${type}"
  }
  # Result: {dev = "Environment dev uses t3.micro", prod = "Environment prod uses t3.large"}

  # Transform keys
  upper_keys = {
    for env, type in var.instance_types :
    upper(env) => type
  }
  # Result: {DEV = "t3.micro", PROD = "t3.large"}
}
```

### Converting Between Maps and Lists

```hcl
locals {
  # Map to list of keys
  env_names = keys(var.instance_types)

  # Map to list of objects
  env_list = [
    for env, type in var.instance_types : {
      environment   = env
      instance_type = type
    }
  ]
}
```

## Practical Examples

### Environment-Specific Configuration

```hcl
variable "environment" {
  type = string
}

variable "config" {
  description = "Per-environment configuration"
  type = map(object({
    instance_type  = string
    instance_count = number
    multi_az       = bool
  }))
  default = {
    dev = {
      instance_type  = "t3.micro"
      instance_count = 1
      multi_az       = false
    }
    staging = {
      instance_type  = "t3.small"
      instance_count = 2
      multi_az       = false
    }
    prod = {
      instance_type  = "t3.large"
      instance_count = 3
      multi_az       = true
    }
  }
}

locals {
  env_config = var.config[var.environment]
}

resource "aws_instance" "app" {
  count         = local.env_config.instance_count
  instance_type = local.env_config.instance_type
  ami           = var.ami_id

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
  }
}
```

### Resource Tagging Strategy

```hcl
variable "required_tags" {
  description = "Tags required on all resources"
  type        = map(string)
}

variable "resource_tags" {
  description = "Additional tags for specific resources"
  type        = map(map(string))
  default     = {}
}

locals {
  # Build per-resource tag sets
  vpc_tags = merge(var.required_tags, lookup(var.resource_tags, "vpc", {}))
  ec2_tags = merge(var.required_tags, lookup(var.resource_tags, "ec2", {}))
  rds_tags = merge(var.required_tags, lookup(var.resource_tags, "rds", {}))
}
```

```hcl
# terraform.tfvars

required_tags = {
  Project     = "web-store"
  Environment = "production"
  ManagedBy   = "terraform"
  CostCenter  = "eng-retail"
}

resource_tags = {
  vpc = {
    NetworkTier = "production"
  }
  ec2 = {
    BackupSchedule = "daily"
    PatchGroup     = "production-weekly"
  }
  rds = {
    DataClassification = "confidential"
  }
}
```

### DNS Records

```hcl
variable "dns_records" {
  description = "DNS A records to create"
  type        = map(string)
  default = {
    "api"     = "10.0.1.100"
    "web"     = "10.0.1.101"
    "admin"   = "10.0.1.102"
    "monitor" = "10.0.1.103"
  }
}

resource "aws_route53_record" "records" {
  for_each = var.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

## Validation for Map Variables

```hcl
variable "tags" {
  type = map(string)

  validation {
    condition     = contains(keys(var.tags), "Environment")
    error_message = "Tags must include an 'Environment' key."
  }

  validation {
    condition     = length(var.tags) >= 2
    error_message = "At least 2 tags must be provided."
  }
}
```

## Wrapping Up

Map variables are one of Terraform's most versatile features. They let you do key-value lookups, build per-environment configurations, manage resource tags cleanly, and create multiple resources with meaningful identifiers. The combination of maps with `for_each` produces stable, readable resource addresses that do not break when you add or remove entries. For more complex per-key structures, use `map(object({...}))` to define exactly what each entry should contain.

For related topics, see our guides on [list variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-list-in-terraform/view) and [object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-object-in-terraform/view) in Terraform.
