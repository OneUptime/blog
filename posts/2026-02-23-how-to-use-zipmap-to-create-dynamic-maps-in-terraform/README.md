# How to Use zipmap to Create Dynamic Maps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection, Maps

Description: Learn advanced patterns for using zipmap in Terraform to create dynamic maps from resource outputs, data sources, and computed values for flexible configurations.

---

While the [basic zipmap function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view) is straightforward - combine two lists into a map - the real power comes from using it dynamically with resource outputs, data sources, and computed values. This post focuses on advanced patterns that you will encounter in production Terraform configurations.

## Quick Recap

The `zipmap` function takes a list of keys and a list of values and creates a map:

```hcl
> zipmap(["name", "port"], ["web", "8080"])
{
  "name" = "web"
  "port" = "8080"
}
```

## Pattern 1: Resource Output Lookup Maps

The most common advanced use - create a lookup map from resources created with `count`:

```hcl
variable "subnet_names" {
  type    = list(string)
  default = ["public-a", "public-b", "private-a", "private-b"]
}

variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24"]
}

resource "aws_subnet" "main" {
  count      = length(var.subnet_names)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.subnet_cidrs[count.index]

  tags = {
    Name = var.subnet_names[count.index]
  }
}

# Create lookup maps from the resources
output "subnet_name_to_id" {
  value = zipmap(
    var.subnet_names,
    aws_subnet.main[*].id
  )
  # Result: {
  #   "private-a" = "subnet-abc..."
  #   "private-b" = "subnet-def..."
  #   "public-a"  = "subnet-ghi..."
  #   "public-b"  = "subnet-jkl..."
  # }
}

output "subnet_name_to_cidr" {
  value = zipmap(
    var.subnet_names,
    aws_subnet.main[*].cidr_block
  )
}

output "subnet_name_to_arn" {
  value = zipmap(
    var.subnet_names,
    aws_subnet.main[*].arn
  )
}
```

Now other modules can look up subnets by name instead of relying on index positions.

## Pattern 2: Data Source Results to Maps

Transform data source outputs into useful lookup maps:

```hcl
data "aws_instances" "app" {
  filter {
    name   = "tag:Application"
    values = ["myapp"]
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

locals {
  # Map instance IDs to their private IPs
  instance_ip_map = zipmap(
    data.aws_instances.app.ids,
    data.aws_instances.app.private_ips
  )
  # Result: {
  #   "i-abc123" = "10.0.1.5"
  #   "i-def456" = "10.0.1.6"
  # }
}
```

## Pattern 3: AZ-to-Subnet Mapping

A very common networking pattern:

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = length(data.aws_availability_zones.available.names)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${data.aws_availability_zones.available.names[count.index]}"
  }
}

locals {
  # Map AZ names to subnet IDs
  az_to_subnet = zipmap(
    data.aws_availability_zones.available.names,
    aws_subnet.private[*].id
  )
  # Result: {
  #   "us-east-1a" = "subnet-abc..."
  #   "us-east-1b" = "subnet-def..."
  #   "us-east-1c" = "subnet-ghi..."
  # }
}

# Use the map for placing resources in specific AZs
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = local.az_to_subnet["us-east-1a"]
}
```

## Pattern 4: Dynamic DNS Records

Generate DNS records from computed data:

```hcl
variable "services" {
  type    = list(string)
  default = ["web", "api", "admin", "docs"]
}

resource "aws_lb" "services" {
  count              = length(var.services)
  name               = var.services[count.index]
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}

locals {
  # Map service names to their load balancer DNS names
  service_endpoints = zipmap(
    var.services,
    aws_lb.services[*].dns_name
  )
}

# Create DNS records dynamically
resource "aws_route53_record" "services" {
  for_each = local.service_endpoints

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${each.key}.example.com"
  type    = "CNAME"
  ttl     = 300
  records = [each.value]
}
```

## Pattern 5: Port-to-Target Group Mapping

```hcl
variable "service_ports" {
  type    = list(number)
  default = [80, 443, 8080, 8443]
}

variable "service_names" {
  type    = list(string)
  default = ["http", "https", "app-http", "app-https"]
}

resource "aws_lb_target_group" "services" {
  count    = length(var.service_names)
  name     = var.service_names[count.index]
  port     = var.service_ports[count.index]
  protocol = "HTTP"
  vpc_id   = var.vpc_id
}

locals {
  # Multiple lookup maps from the same resources
  name_to_tg_arn = zipmap(
    var.service_names,
    aws_lb_target_group.services[*].arn
  )

  port_to_tg_arn = zipmap(
    [for p in var.service_ports : tostring(p)],
    aws_lb_target_group.services[*].arn
  )
}

# Now you can look up target groups by name or port
output "http_tg_arn" {
  value = local.name_to_tg_arn["http"]
}

output "port_8080_tg_arn" {
  value = local.port_to_tg_arn["8080"]
}
```

## Pattern 6: Computed Keys with Generated Values

Build maps where both keys and values are computed:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

locals {
  # Keys: environment names, Values: computed bucket names
  bucket_names = zipmap(
    var.environments,
    [for env in var.environments : "mycompany-${env}-${data.aws_caller_identity.current.account_id}"]
  )
  # Result: {
  #   "dev"     = "mycompany-dev-123456789012"
  #   "prod"    = "mycompany-prod-123456789012"
  #   "staging" = "mycompany-staging-123456789012"
  # }

  # Keys: environment names, Values: computed KMS aliases
  kms_aliases = zipmap(
    var.environments,
    [for env in var.environments : "alias/${env}-encryption-key"]
  )
}
```

## Pattern 7: Inventory Maps for Ansible or Other Tools

Create structured output for external tools:

```hcl
resource "aws_instance" "servers" {
  count         = length(var.server_names)
  ami           = var.ami_id
  instance_type = var.instance_types[count.index]

  tags = {
    Name = var.server_names[count.index]
    Role = var.server_roles[count.index]
  }
}

locals {
  # Build an inventory map
  server_inventory = zipmap(
    var.server_names,
    [for i, name in var.server_names : {
      ip            = aws_instance.servers[i].private_ip
      public_ip     = aws_instance.servers[i].public_ip
      instance_type = aws_instance.servers[i].instance_type
      role          = var.server_roles[i]
    }]
  )
}

output "inventory" {
  value = local.server_inventory
  # Result: {
  #   "web-1" = {
  #     "ip" = "10.0.1.5"
  #     "instance_type" = "t3.medium"
  #     "role" = "web"
  #     ...
  #   }
  #   ...
  # }
}
```

## Pattern 8: Combining zipmap with Splat Expressions

The splat expression `[*]` pairs beautifully with zipmap:

```hcl
resource "aws_security_group" "services" {
  count       = length(var.service_names)
  name        = var.service_names[count.index]
  description = "SG for ${var.service_names[count.index]}"
  vpc_id      = var.vpc_id
}

locals {
  # Splat expressions extract attributes from all instances
  sg_name_to_id = zipmap(
    aws_security_group.services[*].name,
    aws_security_group.services[*].id
  )

  sg_name_to_arn = zipmap(
    aws_security_group.services[*].name,
    aws_security_group.services[*].arn
  )
}
```

## When zipmap Is Better Than for Expressions

```hcl
# zipmap is cleaner when you already have parallel lists
locals {
  names = var.server_names
  ids   = aws_instance.servers[*].id

  # Clean with zipmap
  lookup_map = zipmap(local.names, local.ids)

  # More verbose with for
  lookup_map_v2 = { for i, name in local.names : name => local.ids[i] }
}
```

## When for Expressions Are Better

```hcl
# for is better when you have a single source structure
variable "servers" {
  type = list(object({
    name = string
    ip   = string
  }))
}

# Cleaner with for
locals {
  server_map = { for s in var.servers : s.name => s.ip }
}

# More awkward with zipmap
locals {
  server_map_v2 = zipmap(
    [for s in var.servers : s.name],
    [for s in var.servers : s.ip]
  )
}
```

## Gotchas

### Duplicate Keys

```hcl
# Last value wins silently
> zipmap(["a", "b", "a"], ["1", "2", "3"])
{
  "a" = "3"
  "b" = "2"
}
```

### List Length Mismatch

```hcl
# Different lengths cause an error
# zipmap(["a", "b"], ["1"])  # Error!
```

### Key Type Must Be String

```hcl
# Numbers as keys need conversion
# zipmap([1, 2], ["a", "b"])  # Error!
zipmap([tostring(1), tostring(2)], ["a", "b"])  # Works
```

## Summary

Using `zipmap` dynamically with resource outputs and computed values is a powerful pattern for building lookup maps in Terraform. The most valuable patterns are: creating name-to-ID maps from `count`-based resources, mapping AZs to subnets, and building inventory maps for external tools. When you have parallel lists (especially from splat expressions), `zipmap` is the cleanest approach. When you have a single structured data source, prefer `for` expressions instead. For the basics, revisit the [zipmap function guide](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view), and for combining these patterns, see [collection function chaining](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-collection-functions-in-terraform/view).
