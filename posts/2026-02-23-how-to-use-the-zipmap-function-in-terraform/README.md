# How to Use the zipmap Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection

Description: Learn how to use the zipmap function in Terraform to create maps from two parallel lists of keys and values for dynamic resource configurations.

---

Building maps dynamically is a common need in Terraform. You might have a list of resource names and a corresponding list of their IDs, or a list of tag keys paired with tag values. The `zipmap` function lets you combine two parallel lists into a single map.

## What is zipmap?

The `zipmap` function takes two lists - one of keys and one of values - and combines them into a map. The first element of the keys list pairs with the first element of the values list, the second with the second, and so on.

```hcl
# Combine two lists into a map
> zipmap(["name", "age", "city"], ["Alice", "30", "NYC"])
{
  "age"  = "30"
  "city" = "NYC"
  "name" = "Alice"
}
```

The syntax:

```hcl
zipmap(keys_list, values_list)
```

Both lists must have the same length. The keys list must contain strings, but the values list can contain any type.

## Basic Examples

```hcl
# String keys with number values
> zipmap(["cpu", "memory", "disk"], [4, 16, 100])
{
  "cpu"    = 4
  "disk"   = 100
  "memory" = 16
}

# String keys with boolean values
> zipmap(["enabled", "debug", "verbose"], [true, false, true])
{
  "debug"   = false
  "enabled" = true
  "verbose" = true
}

# String keys with list values
> zipmap(["web", "api"], [["80", "443"], ["8080"]])
{
  "api" = ["8080"]
  "web" = ["80", "443"]
}
```

## Practical Example: Creating Tags from Lists

One of the most common uses is building tag maps from parallel lists:

```hcl
variable "tag_keys" {
  type    = list(string)
  default = ["Environment", "Team", "Project", "CostCenter"]
}

variable "tag_values" {
  type    = list(string)
  default = ["production", "platform", "infrastructure", "12345"]
}

locals {
  # Build the tag map from two parallel lists
  tags = zipmap(var.tag_keys, var.tag_values)
  # Result: {
  #   "CostCenter"  = "12345"
  #   "Environment" = "production"
  #   "Project"     = "infrastructure"
  #   "Team"        = "platform"
  # }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  tags          = local.tags
}
```

## Building Maps from Resource Outputs

A very common pattern is using `zipmap` with resource attributes to create lookup maps:

```hcl
# Create multiple subnets
resource "aws_subnet" "main" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "subnet-${count.index}"
  }
}

# Create a map of subnet name to subnet ID
output "subnet_map" {
  value = zipmap(
    [for s in aws_subnet.main : s.tags["Name"]],
    [for s in aws_subnet.main : s.id]
  )
  # Result: {
  #   "subnet-0" = "subnet-abc123"
  #   "subnet-1" = "subnet-def456"
  #   "subnet-2" = "subnet-ghi789"
  # }
}
```

## Using zipmap with Data Sources

```hcl
# Get all availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Create a map of AZ name to AZ ID
locals {
  az_map = zipmap(
    data.aws_availability_zones.available.names,
    data.aws_availability_zones.available.zone_ids
  )
  # Result: {
  #   "us-east-1a" = "use1-az1"
  #   "us-east-1b" = "use1-az2"
  #   "us-east-1c" = "use1-az3"
  # }
}
```

## Dynamic Security Group Rules

```hcl
variable "service_ports" {
  type    = list(number)
  default = [80, 443, 8080, 8443]
}

variable "service_names" {
  type    = list(string)
  default = ["http", "https", "app-http", "app-https"]
}

locals {
  # Map service names to their ports
  port_map = zipmap(var.service_names, var.service_ports)
  # Result: {
  #   "app-http"  = 8080
  #   "app-https" = 8443
  #   "http"      = 80
  #   "https"     = 443
  # }
}

# Create security group rules dynamically
resource "aws_security_group_rule" "ingress" {
  for_each = local.port_map

  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id
  description       = "Allow ${each.key} traffic on port ${each.value}"
}
```

## Creating DNS Records from Parallel Lists

```hcl
variable "record_names" {
  type    = list(string)
  default = ["www", "api", "admin", "docs"]
}

variable "record_targets" {
  type    = list(string)
  default = [
    "web-lb.example.com",
    "api-lb.example.com",
    "admin-lb.example.com",
    "docs-cdn.example.com"
  ]
}

locals {
  dns_records = zipmap(var.record_names, var.record_targets)
}

resource "aws_route53_record" "cname" {
  for_each = local.dns_records

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${each.key}.example.com"
  type    = "CNAME"
  ttl     = 300
  records = [each.value]
}
```

## Combining zipmap with for Expressions

You can generate the key and value lists dynamically:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

locals {
  # Create a map of environment to S3 bucket name
  bucket_map = zipmap(
    var.environments,
    [for env in var.environments : "mycompany-${env}-artifacts"]
  )
  # Result: {
  #   "dev"     = "mycompany-dev-artifacts"
  #   "prod"    = "mycompany-prod-artifacts"
  #   "staging" = "mycompany-staging-artifacts"
  # }
}
```

Though for this specific pattern, a `for` expression creating a map directly is often cleaner:

```hcl
locals {
  # Equivalent using a for expression
  bucket_map_v2 = {
    for env in var.environments : env => "mycompany-${env}-artifacts"
  }
}
```

## zipmap with count-based Resources

```hcl
variable "instance_names" {
  type    = list(string)
  default = ["web", "api", "worker"]
}

resource "aws_instance" "servers" {
  count         = length(var.instance_names)
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name = var.instance_names[count.index]
  }
}

# Create a name-to-ID lookup map
output "instance_id_map" {
  value = zipmap(
    var.instance_names,
    aws_instance.servers[*].id
  )
  # Result: {
  #   "api"    = "i-def456"
  #   "web"    = "i-abc123"
  #   "worker" = "i-ghi789"
  # }
}

# Create a name-to-IP lookup map
output "instance_ip_map" {
  value = zipmap(
    var.instance_names,
    aws_instance.servers[*].private_ip
  )
}
```

## Duplicate Keys

If the keys list contains duplicates, the last value wins:

```hcl
> zipmap(["a", "b", "a"], ["first", "second", "third"])
{
  "a" = "third"
  "b" = "second"
}
```

Be careful with this - it can lead to silent data loss. Make sure your keys are unique.

## Edge Cases

```hcl
# Empty lists produce an empty map
> zipmap([], [])
{}

# Lists must be the same length
# zipmap(["a", "b"], ["only-one"])  # Error!

# Single element
> zipmap(["key"], ["value"])
{
  "key" = "value"
}
```

## When to Use zipmap vs for Expressions

As a general rule:
- Use `zipmap` when you already have two separate, parallel lists
- Use `for` expressions when you are transforming a single data structure into a map

```hcl
# zipmap is natural when you have two parallel lists
locals {
  names = ["a", "b", "c"]
  ids   = ["id-1", "id-2", "id-3"]
  result = zipmap(local.names, local.ids)
}

# A for expression is cleaner when deriving from one source
locals {
  items = [
    { name = "a", id = "id-1" },
    { name = "b", id = "id-2" },
  ]
  result_v2 = { for item in local.items : item.name => item.id }
}
```

## Summary

The `zipmap` function is a clean way to construct maps from two parallel lists in Terraform. It is especially useful when working with `count`-based resources where you have separate lists of names and attributes, or when data sources return parallel lists that you need to correlate. Just remember that both lists must have the same length and the keys must be strings. For more advanced map creation patterns, see our post on [creating dynamic maps with zipmap](https://oneuptime.com/blog/post/2026-02-23-how-to-use-zipmap-to-create-dynamic-maps-in-terraform/view) and [the values function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-values-function-in-terraform/view).
