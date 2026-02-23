# How to Use Collection Functions for Data Transformation Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collections, Best Practices

Description: Learn how to build data transformation pipelines in Terraform by combining collection functions to reshape complex inputs into resource-ready configurations.

---

Real-world Terraform configurations rarely have data in the exact shape that resources need. Input variables come from various sources - CSV files, JSON configs, module outputs, data sources - and each has its own structure. Building data transformation pipelines from collection functions is how you bridge the gap between the data you have and the data your resources need.

## What is a Data Transformation Pipeline?

A data transformation pipeline in Terraform is a series of locals that progressively reshape data from its input format to its output format. Each local applies one or more collection functions to transform the data one step at a time.

```hcl
# Raw input
variable "raw_data" { ... }

locals {
  # Step 1: Parse and normalize
  parsed = ...

  # Step 2: Filter and validate
  filtered = ...

  # Step 3: Transform and enrich
  enriched = ...

  # Step 4: Shape for resource consumption
  final = ...
}

resource "some_resource" "main" {
  for_each = local.final
  # ...
}
```

## Pipeline 1: CSV-like Input to Resources

Suppose your team provides configuration in a simple flat format and you need to create complex resources:

```hcl
variable "server_configs" {
  description = "Server configurations in a flat format"
  type = list(object({
    name        = string
    env         = string
    role        = string
    size        = string
    ports       = string  # comma-separated
    az_index    = number
  }))
  default = [
    { name = "web-1",    env = "prod", role = "web",    size = "medium", ports = "80,443",      az_index = 0 },
    { name = "web-2",    env = "prod", role = "web",    size = "medium", ports = "80,443",      az_index = 1 },
    { name = "api-1",    env = "prod", role = "api",    size = "large",  ports = "8080,8443",   az_index = 0 },
    { name = "worker-1", env = "prod", role = "worker", size = "xlarge", ports = "9090",        az_index = 0 },
    { name = "test-1",   env = "dev",  role = "web",    size = "small",  ports = "80",          az_index = 0 },
  ]
}

locals {
  # Step 1: Parse comma-separated ports into lists of numbers
  parsed_configs = [
    for config in var.server_configs : merge(config, {
      port_list = [for p in split(",", config.ports) : tonumber(trimspace(p))]
    })
  ]

  # Step 2: Map size names to instance types
  size_map = {
    small  = "t3.small"
    medium = "t3.medium"
    large  = "t3.large"
    xlarge = "m5.xlarge"
  }

  # Step 3: Enrich with computed values
  enriched_configs = [
    for config in local.parsed_configs : {
      name          = config.name
      env           = config.env
      role          = config.role
      instance_type = local.size_map[config.size]
      ports         = config.port_list
      az            = data.aws_availability_zones.available.names[config.az_index]
      tags = merge(
        local.common_tags,
        {
          Name        = config.name
          Role        = config.role
          Environment = config.env
        }
      )
    }
  ]

  # Step 4: Convert to map for for_each
  server_map = { for config in local.enriched_configs : config.name => config }

  # Step 5: Create flat list of security group rules (cross-product of servers and ports)
  sg_rules = { for rule in flatten([
    for config in local.enriched_configs : [
      for port in config.ports : {
        key     = "${config.name}-${port}"
        sg_name = config.role
        port    = port
      }
    ]
  ]) : rule.key => rule }
}
```

## Pipeline 2: Hierarchical Config to Flat Resources

Convert a nested configuration structure into flat resources:

```hcl
variable "app_config" {
  type = map(object({
    domains = list(string)
    routes = list(object({
      path    = string
      service = string
      port    = number
    }))
  }))
  default = {
    frontend = {
      domains = ["www.example.com", "example.com"]
      routes = [
        { path = "/",      service = "web",   port = 80 },
        { path = "/api",   service = "api",   port = 8080 },
        { path = "/admin", service = "admin", port = 8443 },
      ]
    }
    api = {
      domains = ["api.example.com"]
      routes = [
        { path = "/v1",  service = "api-v1", port = 8080 },
        { path = "/v2",  service = "api-v2", port = 8081 },
      ]
    }
  }
}

locals {
  # Step 1: Flatten domains across all apps
  all_domains = distinct(flatten([
    for app_name, app in var.app_config : app.domains
  ]))
  # Result: ["api.example.com", "example.com", "www.example.com"]

  # Step 2: Flatten routes with their app context
  all_routes = flatten([
    for app_name, app in var.app_config : [
      for domain in app.domains : [
        for route in app.routes : {
          key     = "${domain}${route.path}"
          domain  = domain
          path    = route.path
          service = route.service
          port    = route.port
          app     = app_name
        }
      ]
    ]
  ])

  # Step 3: Convert to map for for_each
  route_map = { for route in local.all_routes : route.key => route }

  # Step 4: Extract unique services for target group creation
  unique_services = { for route in local.all_routes :
    route.service => {
      name = route.service
      port = route.port
    }...
  }

  # Deduplicate services (take the first definition)
  service_configs = { for name, configs in local.unique_services :
    name => configs[0]
  }
}
```

## Pipeline 3: Multi-Environment Deployment

Transform a compact environment definition into full deployment configurations:

```hcl
variable "environments" {
  type = map(object({
    region       = string
    instance_count = number
    instance_type  = string
    features       = list(string)
  }))
  default = {
    dev = {
      region         = "us-east-1"
      instance_count = 1
      instance_type  = "t3.small"
      features       = ["debug", "hot-reload"]
    }
    staging = {
      region         = "us-east-1"
      instance_count = 2
      instance_type  = "t3.medium"
      features       = ["monitoring"]
    }
    production = {
      region         = "us-east-1"
      instance_count = 5
      instance_type  = "t3.large"
      features       = ["monitoring", "cdn", "waf", "multi-az"]
    }
  }
}

locals {
  # Step 1: Compute feature flags for each environment
  env_features = {
    for env_name, env in var.environments : env_name => {
      enable_monitoring = contains(env.features, "monitoring")
      enable_cdn        = contains(env.features, "cdn")
      enable_waf        = contains(env.features, "waf")
      enable_multi_az   = contains(env.features, "multi-az")
      enable_debug      = contains(env.features, "debug")
    }
  }

  # Step 2: Build instance configurations (flat list)
  instance_configs = flatten([
    for env_name, env in var.environments : [
      for i in range(env.instance_count) : {
        key           = "${env_name}-${i}"
        env           = env_name
        instance_type = env.instance_type
        index         = i
        az_index      = local.env_features[env_name].enable_multi_az ? (i % 3) : 0
        tags = {
          Name        = "${env_name}-app-${i}"
          Environment = env_name
          Index       = tostring(i)
        }
      }
    ]
  ])

  # Step 3: Convert to map
  instance_map = { for inst in local.instance_configs : inst.key => inst }

  # Step 4: Aggregate summary statistics
  summary = {
    total_instances = sum([for env in var.environments : env.instance_count])
    envs_with_monitoring = length([
      for env_name, env in var.environments : env_name
      if contains(env.features, "monitoring")
    ])
    all_regions = sort(distinct([for env in values(var.environments) : env.region]))
  }
}
```

## Pipeline 4: Network CIDR Allocation

Compute network addresses from a high-level specification:

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_tiers" {
  type = list(object({
    name    = string
    newbits = number
    count   = number
    public  = bool
  }))
  default = [
    { name = "public",   newbits = 4, count = 3, public = true },
    { name = "private",  newbits = 4, count = 3, public = false },
    { name = "database", newbits = 6, count = 3, public = false },
  ]
}

locals {
  # Step 1: Calculate subnet offset for each tier
  tier_offsets = {
    for i, tier in var.subnet_tiers : tier.name => sum([
      for j in range(i) : var.subnet_tiers[j].count
    ])
  }

  # Step 2: Generate all subnets with their CIDRs
  all_subnets = flatten([
    for tier in var.subnet_tiers : [
      for i in range(tier.count) : {
        key    = "${tier.name}-${i}"
        name   = tier.name
        index  = i
        cidr   = cidrsubnet(var.vpc_cidr, tier.newbits, local.tier_offsets[tier.name] + i)
        public = tier.public
        az     = data.aws_availability_zones.available.names[i % length(data.aws_availability_zones.available.names)]
      }
    ]
  ])

  # Step 3: Create lookup maps
  subnet_map = { for s in local.all_subnets : s.key => s }

  # Step 4: Group by tier for easy access
  subnets_by_tier = {
    for tier_name in distinct([for s in local.all_subnets : s.name]) :
    tier_name => [for s in local.all_subnets : s if s.name == tier_name]
  }

  # Step 5: Extract specific groups
  public_cidrs   = [for s in local.all_subnets : s.cidr if s.public]
  private_cidrs  = [for s in local.all_subnets : s.cidr if !s.public]
}
```

## Pipeline Design Principles

Here are some guidelines for building effective transformation pipelines:

### 1. Name Each Step Clearly

```hcl
locals {
  # BAD - unclear names
  step1 = ...
  step2 = ...
  result = ...

  # GOOD - descriptive names
  parsed_configs  = ...
  filtered_active = ...
  enriched_data   = ...
  resource_map    = ...
}
```

### 2. One Transformation Per Step

```hcl
# BAD - too many transformations in one step
locals {
  result = {
    for item in flatten([for k, v in var.input : [for i in v.items : ...]]) :
    item.key => merge(item, { computed = func(item.value) })
    if item.active
  }
}

# GOOD - break it down
locals {
  flattened = flatten([for k, v in var.input : [for i in v.items : ...]])
  enriched  = [for item in local.flattened : merge(item, { computed = func(item.value) })]
  filtered  = [for item in local.enriched : item if item.active]
  result    = { for item in local.filtered : item.key => item }
}
```

### 3. Validate at Each Stage

Add validation locals or outputs to verify intermediate results:

```hcl
locals {
  # Transformation
  parsed = [for item in var.input : ...]

  # Validation
  parse_count = length(local.parsed)
  has_items   = local.parse_count > 0
}

# Optional: output for debugging
output "debug_parse_count" {
  value = local.parse_count
}
```

### 4. Use Comments for the Pipeline Flow

```hcl
locals {
  # Pipeline: raw_config -> parsed -> filtered -> enriched -> resource_map
  #
  # Input:  list of objects with string ports
  # Output: map of objects with parsed ports, computed AZs, and tags

  parsed   = ... # Parse string fields into proper types
  filtered = ... # Remove disabled items
  enriched = ... # Add computed fields (AZ, tags, etc.)
  final    = ... # Convert to for_each-compatible map
}
```

## Summary

Data transformation pipelines are the backbone of well-structured Terraform configurations. They let you accept simple, human-friendly inputs and transform them into the complex structures that cloud resources require. The key collection functions for pipelines are `flatten` (for cross-products), `merge` (for combining maps), `for` expressions (for transforming and filtering), `zipmap` (for creating maps from parallel lists), and type conversion functions (`toset`, `tolist`, `tomap`). Break complex transformations into named steps, keep each step focused on one transformation, and document the pipeline flow with comments. For the individual functions used in these pipelines, explore our posts on [flatten](https://oneuptime.com/blog/post/2026-02-23-how-to-use-flatten-for-nested-data-structures-in-terraform/view), [merge](https://oneuptime.com/blog/post/2026-02-23-how-to-use-merge-to-combine-tag-maps-in-terraform/view), and [collection function chaining](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-collection-functions-in-terraform/view).
