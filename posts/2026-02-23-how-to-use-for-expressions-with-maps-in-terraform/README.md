# How to Use For Expressions with Maps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Expressions, Maps, Collection

Description: Learn how to use Terraform for expressions with maps to transform, filter, restructure, and generate map data structures for dynamic infrastructure configuration.

---

Maps are everywhere in Terraform - tags, environment configurations, variable lookups, resource attributes. For expressions let you create, transform, and restructure maps dynamically. The syntax differs slightly from list for expressions, and there are some map-specific patterns that come up constantly in real infrastructure code.

## Producing Maps with For Expressions

To produce a map from a for expression, use curly braces `{ }` instead of square brackets `[ ]`:

```hcl
# Square brackets produce a list
# [for item in collection : transform]

# Curly braces produce a map
# {for item in collection : key_expr => value_expr}

variable "users" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

locals {
  # Create a map from a list
  user_roles = { for user in var.users : user => "developer" }
  # Result: { "alice" = "developer", "bob" = "developer", "charlie" = "developer" }
}
```

The `=>` arrow separates the key from the value. The key must be a string, and each key must be unique.

## Iterating Over Maps

When you iterate over a map, you get both key and value:

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    web    = "t3.micro"
    api    = "t3.small"
    worker = "t3.medium"
  }
}

locals {
  # Transform map values
  instance_descriptions = {
    for name, type in var.instance_types :
    name => "Server '${name}' uses instance type ${type}"
  }
  # Result: {
  #   "web"    = "Server 'web' uses instance type t3.micro"
  #   "api"    = "Server 'api' uses instance type t3.small"
  #   "worker" = "Server 'worker' uses instance type t3.medium"
  # }

  # Change the keys
  prefixed_instances = {
    for name, type in var.instance_types :
    "app-${name}" => type
  }
  # Result: { "app-web" = "t3.micro", "app-api" = "t3.small", "app-worker" = "t3.medium" }
}
```

## Converting Between Lists and Maps

### List of Objects to Map

This is probably the most common map for expression pattern:

```hcl
variable "servers" {
  type = list(object({
    name          = string
    instance_type = string
    subnet_id     = string
  }))
  default = [
    { name = "web-01", instance_type = "t3.micro", subnet_id = "subnet-aaa" },
    { name = "web-02", instance_type = "t3.micro", subnet_id = "subnet-bbb" },
    { name = "api-01", instance_type = "t3.small", subnet_id = "subnet-aaa" },
  ]
}

locals {
  # Convert to a map keyed by name
  server_map = { for s in var.servers : s.name => s }
  # Result: {
  #   "web-01" = { name = "web-01", instance_type = "t3.micro", subnet_id = "subnet-aaa" }
  #   "web-02" = { name = "web-02", instance_type = "t3.micro", subnet_id = "subnet-bbb" }
  #   "api-01" = { name = "api-01", instance_type = "t3.small", subnet_id = "subnet-aaa" }
  # }
}

# Now you can use for_each with stable keys
resource "aws_instance" "servers" {
  for_each = local.server_map

  ami           = var.ami_id
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id

  tags = {
    Name = each.key
  }
}
```

### Map to List of Objects

The reverse transformation:

```hcl
variable "buckets" {
  type = map(string)
  default = {
    logs    = "us-east-1"
    data    = "us-east-1"
    backups = "us-west-2"
  }
}

locals {
  # Convert map to list of objects
  bucket_list = [
    for name, region in var.buckets : {
      name   = name
      region = region
    }
  ]
  # Result: [
  #   { name = "backups", region = "us-west-2" },
  #   { name = "data",    region = "us-east-1" },
  #   { name = "logs",    region = "us-east-1" },
  # ]
}
```

## Filtering Maps

Add an `if` clause to filter map entries:

```hcl
variable "services" {
  type = map(object({
    port        = number
    public      = bool
    environment = string
  }))
  default = {
    web = {
      port        = 80
      public      = true
      environment = "production"
    }
    api = {
      port        = 8080
      public      = true
      environment = "production"
    }
    admin = {
      port        = 8081
      public      = false
      environment = "production"
    }
    debug = {
      port        = 9090
      public      = false
      environment = "dev"
    }
  }
}

locals {
  # Only public services
  public_services = {
    for name, svc in var.services : name => svc
    if svc.public
  }
  # Result: { "web" = {...}, "api" = {...} }

  # Only production services
  prod_services = {
    for name, svc in var.services : name => svc
    if svc.environment == "production"
  }

  # Public production services
  public_prod = {
    for name, svc in var.services : name => svc
    if svc.public && svc.environment == "production"
  }
}
```

## Transforming Map Values

```hcl
variable "base_tags" {
  type = map(string)
  default = {
    project     = "myapp"
    environment = "production"
    team        = "platform"
  }
}

locals {
  # Transform all values to uppercase
  upper_tags = { for k, v in var.base_tags : k => upper(v) }
  # Result: { "project" = "MYAPP", "environment" = "PRODUCTION", "team" = "PLATFORM" }

  # Transform keys to uppercase
  upper_key_tags = { for k, v in var.base_tags : upper(k) => v }
  # Result: { "PROJECT" = "myapp", "ENVIRONMENT" = "production", "TEAM" = "platform" }

  # Add a prefix to all values
  prefixed_tags = { for k, v in var.base_tags : k => "app-${v}" }

  # Selectively transform - keep key, modify value
  labeled_tags = {
    for k, v in var.base_tags :
    k => "${k}: ${v}"
  }
}
```

## Restructuring Maps

### Inverting a Map

```hcl
variable "user_teams" {
  type = map(string)
  default = {
    alice   = "engineering"
    bob     = "engineering"
    charlie = "design"
    diana   = "engineering"
    eve     = "design"
  }
}

locals {
  # Invert: go from user->team to team->users
  # Use groupby (...) syntax
  team_members = {
    for user, team in var.user_teams :
    team => user...
  }
  # Result: {
  #   "engineering" = ["alice", "bob", "diana"]
  #   "design"      = ["charlie", "eve"]
  # }
}
```

The `...` (ellipsis) after the value expression tells Terraform to group values with the same key into a list. Without it, duplicate keys would cause an error.

### Flattening Nested Maps

```hcl
variable "environment_config" {
  type = map(map(string))
  default = {
    production = {
      instance_type = "t3.large"
      region        = "us-east-1"
    }
    staging = {
      instance_type = "t3.small"
      region        = "us-east-1"
    }
  }
}

locals {
  # Flatten to a single level with composite keys
  flat_config = merge([
    for env, config in var.environment_config : {
      for key, value in config :
      "${env}_${key}" => value
    }
  ]...)
  # Result: {
  #   "production_instance_type" = "t3.large"
  #   "production_region"        = "us-east-1"
  #   "staging_instance_type"    = "t3.small"
  #   "staging_region"           = "us-east-1"
  # }
}
```

## Grouping with the Ellipsis Operator

The `...` operator is essential for creating maps where multiple items share the same key:

```hcl
variable "instances" {
  type = list(object({
    name = string
    az   = string
    type = string
  }))
  default = [
    { name = "web-1a",  az = "us-east-1a", type = "web" },
    { name = "web-1b",  az = "us-east-1b", type = "web" },
    { name = "api-1a",  az = "us-east-1a", type = "api" },
    { name = "api-1b",  az = "us-east-1b", type = "api" },
    { name = "db-1a",   az = "us-east-1a", type = "db" },
  ]
}

locals {
  # Group instances by AZ
  instances_by_az = {
    for inst in var.instances :
    inst.az => inst.name...
  }
  # Result: {
  #   "us-east-1a" = ["web-1a", "api-1a", "db-1a"]
  #   "us-east-1b" = ["web-1b", "api-1b"]
  # }

  # Group by type
  instances_by_type = {
    for inst in var.instances :
    inst.type => inst...
  }
  # Result: {
  #   "web" = [{ name = "web-1a", ... }, { name = "web-1b", ... }]
  #   "api" = [{ name = "api-1a", ... }, { name = "api-1b", ... }]
  #   "db"  = [{ name = "db-1a", ... }]
  # }
}
```

## Maps with for_each

For expressions that produce maps work perfectly with `for_each`:

```hcl
variable "alarms" {
  type = list(object({
    name      = string
    metric    = string
    threshold = number
    enabled   = bool
  }))
  default = [
    { name = "high-cpu",    metric = "CPUUtilization",    threshold = 80, enabled = true },
    { name = "high-memory", metric = "MemoryUtilization", threshold = 90, enabled = true },
    { name = "disk-usage",  metric = "DiskUsage",         threshold = 85, enabled = false },
    { name = "network-in",  metric = "NetworkIn",         threshold = 1000000, enabled = true },
  ]
}

resource "aws_cloudwatch_metric_alarm" "this" {
  # Filter and convert to map in one expression
  for_each = {
    for alarm in var.alarms : alarm.name => alarm
    if alarm.enabled
  }

  alarm_name          = each.key
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = each.value.metric
  namespace           = "Custom/App"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.threshold
}
```

## Building Tag Maps

```hcl
variable "environment" {
  type = string
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Base tags that every resource gets
  base_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = var.project_name
  }

  # Conditional tags
  conditional_tags = merge(
    var.environment == "production" ? { Critical = "true" } : {},
    var.enable_monitoring ? { Monitored = "true" } : {},
  )

  # Merge all tag sources
  all_tags = merge(
    local.base_tags,
    local.conditional_tags,
    var.extra_tags,
  )

  # Format tags for a specific provider format
  # Some tools want tags as a list of key-value objects
  tag_list = [
    for key, value in local.all_tags : {
      key   = key
      value = value
    }
  ]
}
```

## Merging Maps with For Expressions

```hcl
variable "defaults" {
  type = map(object({
    instance_type = string
    volume_size   = number
  }))
  default = {
    web    = { instance_type = "t3.micro", volume_size = 20 }
    api    = { instance_type = "t3.small", volume_size = 50 }
    worker = { instance_type = "t3.medium", volume_size = 100 }
  }
}

variable "overrides" {
  type = map(object({
    instance_type = optional(string)
    volume_size   = optional(number)
  }))
  default = {
    web = { instance_type = "t3.small" }
    # api and worker use defaults
  }
}

locals {
  # Merge defaults with overrides
  final_config = {
    for name, defaults in var.defaults : name => {
      instance_type = try(var.overrides[name].instance_type, defaults.instance_type)
      volume_size   = try(var.overrides[name].volume_size, defaults.volume_size)
    }
  }
  # Result: {
  #   "web"    = { instance_type = "t3.small", volume_size = 20 }  # overridden instance_type
  #   "api"    = { instance_type = "t3.small", volume_size = 50 }  # defaults
  #   "worker" = { instance_type = "t3.medium", volume_size = 100 } # defaults
  # }
}
```

## Summary

For expressions with maps in Terraform let you create maps from lists, transform existing maps, filter map entries, group data with the ellipsis operator, and restructure data between different map formats. The key syntax difference from list for expressions is using curly braces `{ }` and the `=>` arrow for key-value pairs. The ellipsis `...` operator handles the common case where multiple items map to the same key by collecting them into a list. These patterns come up constantly when working with `for_each`, building tag maps, and transforming configuration data between different structures.
