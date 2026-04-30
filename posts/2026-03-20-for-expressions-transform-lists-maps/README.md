# How to Use For Expressions to Transform Lists and Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, For Expressions, List, Map, Data Transformation

Description: Learn how to use OpenTofu for expressions to transform, reshape, and convert lists and maps into new collections for use in resource configurations and variables.

---

For expressions in OpenTofu let you create new lists and maps by transforming existing collections. They are similar to Python list comprehensions or JavaScript's `map()` and `filter()` methods - a concise way to reshape data without writing complex functions.

---

## List Comprehension Syntax

```hcl
# Create a new list

[for item in list : transform(item)]

# Create a map from a list
{for item in list : key_expr => value_expr}

# Create a list from a map
[for key, value in map : transform(key, value)]
```

---

## Transform a List

```hcl
variable "names" {
  default = ["alice", "bob", "carol"]
}

locals {
  # Uppercase all names
  upper_names = [for name in var.names : upper(name)]
  # Result: ["ALICE", "BOB", "CAROL"]

  # Create resource names
  resource_names = [for name in var.names : "svc-${name}-prod"]
  # Result: ["svc-alice-prod", "svc-bob-prod", "svc-carol-prod"]
}
```

---

## Convert a List to a Map

```hcl
variable "environments" {
  default = ["dev", "staging", "production"]
}

locals {
  # Index-keyed map
  env_map = {for i, env in var.environments : i => env}
  # Result: { 0 = "dev", 1 = "staging", 2 = "production" }

  # Name-keyed map
  env_name_map = {for env in var.environments : env => upper(env)}
  # Result: { dev = "DEV", staging = "STAGING", production = "PRODUCTION" }
}
```

---

## Transform a Map

```hcl
variable "instance_config" {
  default = {
    "web"    = "t3.medium"
    "api"    = "t3.large"
    "worker" = "t3.small"
  }
}

locals {
  # Extract just the keys
  service_names = [for k, v in var.instance_config : k]
  # Result: ["api", "web", "worker"]

  # Swap keys and values
  type_to_service = {for k, v in var.instance_config : v => k}
  # Result: { "t3.medium" = "web", "t3.large" = "api", "t3.small" = "worker" }

  # Transform both key and value
  prefixed = {for k, v in var.instance_config : "svc-${k}" => "aws_${v}"}
  # Result: { "svc-web" = "aws_t3.medium", ... }
}
```

---

## Practical Example: DNS Records from Instances

```hcl
variable "servers" {
  default = {
    "web"    = "10.0.0.10"
    "api"    = "10.0.0.11"
    "worker" = "10.0.0.12"
  }
}

locals {
  # Generate DNS record objects
  dns_records = {
    for name, ip in var.servers :
    "${name}.internal.example.com" => {
      name    = name
      ip      = ip
      fqdn    = "${name}.internal.example.com"
    }
  }
}

resource "aws_route53_record" "servers" {
  for_each = local.dns_records

  zone_id = aws_route53_zone.internal.zone_id
  name    = each.value.fqdn
  type    = "A"
  ttl     = 300
  records = [each.value.ip]
}
```

---

## Build Security Group Rules from CIDR Lists

```hcl
variable "allowed_cidrs" {
  default = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

locals {
  # Build ingress rules for each CIDR on port 443
  ingress_rules = [for cidr in var.allowed_cidrs : {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [cidr]
    description = "Allow HTTPS from ${cidr}"
  }]
}
```

---

## Combine Two Lists into a Map

```hcl
locals {
  keys   = ["a", "b", "c"]
  values = ["1", "2", "3"]

  combined = {
    for i in range(length(local.keys)) :
    local.keys[i] => local.values[i]
  }
  # Result: { a = "1", b = "2", c = "3" }
}
```

---

## Nested For Expressions

```hcl
variable "regions" {
  default = {
    "us-east-1" = ["a", "b", "c"]
    "us-west-2" = ["a", "b"]
  }
}

locals {
  # Create one entry per region+AZ combination
  az_list = flatten([
    for region, azs in var.regions : [
      for az in azs : "${region}${az}"
    ]
  ])
  # Result: ["us-east-1a", "us-east-1b", "us-east-1c", "us-west-2a", "us-west-2b"]
}
```

---

## Best Practices

1. **Store complex expressions in locals** - don't embed long for expressions directly in resources
2. **Use meaningful variable names** in expressions: `for subnet in var.subnets` vs `for s in var.s`
3. **Test with tofu console** before deploying: run `tofu console` and evaluate `local.dns_records`
4. **Avoid deeply nested for expressions** - split into multiple local values for readability
5. **Add type constraints** to variables to prevent unexpected input shapes

---

## Conclusion

For expressions are one of OpenTofu's most powerful features for data manipulation. Use them to transform lists, build maps, combine collections, and reshape data into the exact format your resources need - all in a concise, readable syntax.

---

*Manage your infrastructure with [OneUptime](https://oneuptime.com) - monitoring and observability.*
