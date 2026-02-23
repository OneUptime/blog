# How to Combine Multiple Functions for Complex Transformations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Functions, HCL, Infrastructure as Code, Data Transformation

Description: Learn how to chain and combine multiple Terraform functions together to perform complex data transformations for real-world infrastructure configurations.

---

Terraform has a rich library of built-in functions, but individually each one does something fairly simple. The real power comes from combining them. Chaining functions together lets you reshape data, filter lists, build dynamic configurations, and handle all the messy real-world data transformations that infrastructure code demands.

This guide walks through practical patterns for composing Terraform functions, starting with simple chains and building up to more complex transformations.

## The Basics of Function Chaining

In Terraform, you chain functions by nesting them. The inner function evaluates first, and its result becomes the input to the outer function. There is no pipe operator, so you read from the inside out:

```hcl
locals {
  # Simple chain: split a string, then convert to uppercase
  # Step 1: split(".", "api.example.com") -> ["api", "example", "com"]
  # Step 2: upper joins them... wait, upper works on strings
  # So instead, chain differently:

  # Convert a hostname to an uppercase, underscore-separated name
  hostname   = "api.example.com"
  identifier = upper(replace(local.hostname, ".", "_"))
  # Result: "API_EXAMPLE_COM"
}
```

The key rule is that every function returns a value, and that value can be the input to another function. You just need to make sure the types match up.

## String Manipulation Chains

String transformations are some of the most common chains. Here is how to build a resource naming convention from multiple inputs:

```hcl
variable "project" {
  default = "My Web Application"
}

variable "environment" {
  default = "Production"
}

locals {
  # Build a slug-style resource name from project and environment
  # 1. lower() - convert to lowercase
  # 2. replace() - swap spaces for hyphens
  # 3. trimprefix/trimsuffix if needed
  resource_prefix = join("-", [
    replace(lower(var.project), " ", "-"),
    replace(lower(var.environment), " ", "-"),
  ])
  # Result: "my-web-application-production"

  # Build an S3 bucket name (must be globally unique, no uppercase)
  # Chain: lower -> replace spaces -> replace underscores -> substr to limit length
  bucket_name = substr(
    replace(replace(lower("${var.project}_${var.environment}_assets"), " ", "-"), "_", "-"),
    0,
    63  # S3 bucket name max length
  )
  # Result: "my-web-application-production-assets"
}
```

## List Filtering and Transformation

Terraform's `for` expressions combined with functions give you powerful list processing capabilities:

```hcl
variable "instances" {
  description = "List of instance configurations"
  type = list(object({
    name        = string
    environment = string
    size        = string
    enabled     = bool
  }))
  default = [
    { name = "web-1", environment = "prod", size = "large", enabled = true },
    { name = "web-2", environment = "prod", size = "large", enabled = true },
    { name = "web-3", environment = "staging", size = "small", enabled = false },
    { name = "api-1", environment = "prod", size = "medium", enabled = true },
    { name = "api-2", environment = "staging", size = "small", enabled = true },
  ]
}

locals {
  # Filter to only enabled production instances, then extract their names
  prod_instance_names = sort(
    [for inst in var.instances : upper(inst.name)
     if inst.enabled && inst.environment == "prod"]
  )
  # Result: ["API-1", "WEB-1", "WEB-2"]

  # Group instances by environment, then count each group
  instances_by_env = {
    for env in distinct([for inst in var.instances : inst.environment]) :
    env => length([for inst in var.instances : inst if inst.environment == env])
  }
  # Result: { prod = 3, staging = 2 }
}
```

## Flattening Nested Structures

A common need is to take a nested data structure and flatten it into a list suitable for `for_each`. The `flatten` function combined with `for` expressions handles this:

```hcl
variable "vpc_config" {
  description = "VPC configuration with subnets per AZ"
  type = map(object({
    cidr_block = string
    subnets = map(object({
      cidr   = string
      public = bool
    }))
  }))
  default = {
    main = {
      cidr_block = "10.0.0.0/16"
      subnets = {
        "us-east-1a" = { cidr = "10.0.1.0/24", public = true }
        "us-east-1b" = { cidr = "10.0.2.0/24", public = true }
        "us-east-1a-private" = { cidr = "10.0.10.0/24", public = false }
      }
    }
  }
}

locals {
  # Flatten the nested VPC -> Subnet structure into a flat list
  all_subnets = flatten([
    for vpc_name, vpc in var.vpc_config : [
      for subnet_name, subnet in vpc.subnets : {
        vpc_name    = vpc_name
        subnet_name = subnet_name
        vpc_cidr    = vpc.cidr_block
        subnet_cidr = subnet.cidr
        is_public   = subnet.public
        # Create a unique key for for_each
        key = "${vpc_name}-${subnet_name}"
      }
    ]
  ])

  # Convert the flat list to a map keyed by the unique key
  subnet_map = { for s in local.all_subnets : s.key => s }
}

# Now use for_each with the flattened map
resource "aws_subnet" "all" {
  for_each = local.subnet_map

  vpc_id                  = aws_vpc.main[each.value.vpc_name].id
  cidr_block              = each.value.subnet_cidr
  map_public_ip_on_launch = each.value.is_public

  tags = {
    Name = each.key
  }
}
```

## Merging and Overriding Maps

When you have default values that should be overridable per resource, `merge` combined with conditional expressions does the trick:

```hcl
variable "default_tags" {
  default = {
    managed_by  = "terraform"
    team        = "infrastructure"
    cost_center = "shared"
  }
}

variable "services" {
  default = {
    api = {
      instance_type = "t3.large"
      custom_tags   = { cost_center = "api-team", tier = "backend" }
    }
    web = {
      instance_type = "t3.medium"
      custom_tags   = { tier = "frontend" }
    }
  }
}

locals {
  # For each service, merge default tags with custom tags
  # Custom tags override defaults when keys conflict
  service_configs = {
    for name, svc in var.services : name => {
      instance_type = svc.instance_type
      tags = merge(
        var.default_tags,
        svc.custom_tags,
        {
          # Always set the Name tag to the service name
          Name = name
        }
      )
    }
  }
  # api tags: { managed_by = "terraform", team = "infrastructure",
  #             cost_center = "api-team", tier = "backend", Name = "api" }
  # web tags: { managed_by = "terraform", team = "infrastructure",
  #             cost_center = "shared", tier = "frontend", Name = "web" }
}
```

## Working with JSON and YAML

Converting between formats is a common task. Here is how to read a JSON config, transform it, and use it:

```hcl
locals {
  # Read a JSON file and decode it
  raw_config = jsondecode(file("${path.module}/config.json"))

  # Transform the data: filter out disabled items and format names
  active_services = {
    for name, config in local.raw_config.services :
    lower(replace(name, " ", "-")) => config
    if lookup(config, "enabled", true)
  }

  # Convert a section back to YAML for a Kubernetes ConfigMap
  k8s_config_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "app-config"
      namespace = "default"
    }
    data = {
      for name, svc in local.active_services :
      "${name}.json" => jsonencode(svc)
    }
  })
}
```

## CIDR Math Chains

Network calculations often require chaining CIDR functions:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Calculate subnet CIDRs from the VPC CIDR
  # cidrsubnet(prefix, newbits, netnum)
  public_subnets = [
    for i in range(3) :
    cidrsubnet(var.vpc_cidr, 8, i)
  ]
  # Result: ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]

  private_subnets = [
    for i in range(3) :
    cidrsubnet(var.vpc_cidr, 8, i + 10)
  ]
  # Result: ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  # Build a map of AZ to subnet info
  az_names = ["us-east-1a", "us-east-1b", "us-east-1c"]

  subnet_assignments = {
    for i, az in local.az_names : az => {
      public_cidr  = local.public_subnets[i]
      private_cidr = local.private_subnets[i]
      # Extract the host portion for naming
      public_id    = element(split(".", cidrhost(local.public_subnets[i], 0)), 2)
      private_id   = element(split(".", cidrhost(local.private_subnets[i], 0)), 2)
    }
  }
}
```

## Conditional Chains with coalesce and try

When dealing with optional or potentially missing data, chain `try`, `coalesce`, and `lookup`:

```hcl
variable "overrides" {
  type    = map(string)
  default = {}
}

locals {
  # Try to get a value from overrides, fall back to a computed default,
  # then fall back to a static default
  instance_type = coalesce(
    lookup(var.overrides, "instance_type", null),
    try(local.computed_config.instance_type, null),
    "t3.medium"
  )

  # For lists, use concat with conditional expressions
  security_groups = distinct(concat(
    try(var.overrides.extra_security_groups, []),
    [aws_security_group.default.id],
    var.environment == "prod" ? [aws_security_group.monitoring.id] : [],
  ))
}
```

## Putting It All Together

Here is a complete example that combines multiple function chains to build a dynamic ECS task definition:

```hcl
variable "containers" {
  type = map(object({
    image       = string
    cpu         = number
    memory      = number
    port        = optional(number)
    environment = optional(map(string), {})
    secrets     = optional(list(string), [])
  }))
}

locals {
  # Transform the container map into the format ECS expects
  container_definitions = jsonencode([
    for name, container in var.containers : {
      name      = name
      image     = container.image
      cpu       = container.cpu
      memory    = container.memory
      essential = true

      # Only include portMappings if a port is specified
      portMappings = container.port != null ? [
        { containerPort = container.port, protocol = "tcp" }
      ] : []

      # Convert the environment map to the name/value list format ECS wants
      environment = [
        for k, v in merge(
          { SERVICE_NAME = name, LOG_LEVEL = "info" },  # defaults
          container.environment                          # overrides
        ) : { name = k, value = v }
      ]

      # Convert secret names to ARN references
      secrets = [
        for secret_name in container.secrets : {
          name      = upper(replace(secret_name, "-", "_"))
          valueFrom = "arn:aws:secretsmanager:us-east-1:123456789:secret:${secret_name}"
        }
      ]

      # Configure logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${name}"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = name
        }
      }
    }
  ])
}
```

## Tips for Complex Chains

1. **Break it into steps.** Use multiple locals instead of one massive expression. It is easier to debug and understand.

2. **Use comments.** Add a comment showing what the intermediate result looks like. Future you will be grateful.

3. **Test in terraform console.** Try each step of the chain independently before combining them. See [How to Debug Function Outputs Using terraform console](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-function-outputs-using-terraform-console/view) for techniques.

4. **Watch the types.** The most common error in function chains is a type mismatch. A function that expects a list gets a string, or vice versa. Terraform's error messages usually tell you what type was expected vs received.

5. **Use try() as a safety net.** When a chain might fail due to missing data, wrap it in `try()` with a sensible default.

## Summary

Combining Terraform functions is where the language goes from "simple variable substitution" to "powerful data transformation engine." The patterns covered here - string manipulation chains, list filtering, structure flattening, map merging, format conversion, and conditional chains - cover the vast majority of real-world transformation needs. Start simple, build up gradually, and always test intermediate results to make sure each step produces what you expect.
