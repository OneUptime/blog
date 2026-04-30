# How to Use For Expressions with Filtering in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, For Expressions, Filtering, Collection, Infrastructure as Code, DevOps

Description: A guide to using for expressions with if clauses in OpenTofu to filter collections and select specific elements.

## Introduction

For expressions in OpenTofu support an optional `if` clause that filters elements from the input collection. Only elements where the condition evaluates to `true` are included in the output. This enables you to filter resources based on attributes, create environment-specific subsets of data, and exclude items that don't meet criteria.

## Basic Filtering Syntax

```hcl
# Tuple with filter: [for <item> in <collection> : <expression> if <condition>]

# Object with filter: {for <item> in <collection> : <key> => <value> if <condition>}

variable "instances" {
  type = list(object({
    name    = string
    enabled = bool
    type    = string
  }))
}

locals {
  # Filter to only enabled instances
  enabled_instances = [
    for instance in var.instances : instance
    if instance.enabled
  ]

  # Filter and transform
  enabled_names = [
    for instance in var.instances : instance.name
    if instance.enabled
  ]
}
```

## Filtering Users by Role

```hcl
variable "users" {
  type = map(object({
    email   = string
    role    = string
    active  = bool
  }))
}

locals {
  # Only active users
  active_users = {
    for name, user in var.users : name => user
    if user.active
  }

  # Active admins only
  active_admins = {
    for name, user in var.users : name => user
    if user.active && user.role == "admin"
  }

  # Get email list of active developers
  developer_emails = [
    for name, user in var.users : user.email
    if user.active && user.role == "developer"
  ]
}

resource "aws_iam_user" "active" {
  for_each = local.active_users
  name     = each.key
}
```

## Filtering by Environment

```hcl
variable "services" {
  type = map(object({
    environments = list(string)
    port         = number
    image        = string
  }))
}

variable "environment" {
  type    = string
  default = "dev"
}

locals {
  # Only services that should run in current environment
  env_services = {
    for name, service in var.services : name => service
    if contains(service.environments, var.environment)
  }
}

resource "aws_ecs_service" "app" {
  for_each = local.env_services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = 1
}
```

## Filtering Subnets

```hcl
data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

data "aws_subnet" "all" {
  for_each = toset(data.aws_subnets.all.ids)
  id       = each.value
}

locals {
  # Filter to subnets whose CIDR block is in 10.0.0.0/8
  ten_range_subnet_ids = [
    for id, subnet in data.aws_subnet.all : id
    if startswith(subnet.cidr_block, "10.")
  ]

  # Filter to specific AZs
  primary_subnet_ids = [
    for id, subnet in data.aws_subnet.all : id
    if contains(["us-east-1a", "us-east-1b"], subnet.availability_zone)
  ]
}
```

## Filtering Null Values

```hcl
variable "optional_configs" {
  type    = list(string)
  default = ["config-a", null, "config-b", null, "config-c"]
}

locals {
  # Remove null values from list
  valid_configs = [
    for config in var.optional_configs : config
    if config != null
  ]
  # Result: ["config-a", "config-b", "config-c"]
}
```

## Filtering and Transforming Together

```hcl
variable "ec2_instances" {
  type = list(object({
    id    = string
    state = string
    tags  = map(string)
  }))
}

locals {
  # Get IDs of running instances tagged for load balancing
  lb_instance_ids = [
    for instance in var.ec2_instances : instance.id
    if instance.state == "running" && lookup(instance.tags, "LoadBalanced", "false") == "true"
  ]

  # Build map of running instances keyed by ID
  running_instances = {
    for instance in var.ec2_instances : instance.id => instance
    if instance.state == "running"
  }
}
```

## Filtering with Complex Conditions

```hcl
variable "security_groups" {
  type = map(object({
    ports       = list(number)
    required    = bool
    environment = string
  }))
}

locals {
  # Include if: required OR matches current environment
  applicable_sgs = {
    for name, sg in var.security_groups : name => sg
    if sg.required || sg.environment == var.environment
  }

  # Exclude certain ports
  allowed_sg_ports = {
    for name, sg in var.security_groups : name => [
      for port in sg.ports : port
      if port != 22 && port != 3389  # Exclude SSH and RDP
    ]
    if sg.required
  }
}
```

## Using filtered Results with for_each

```hcl
variable "route_table_routes" {
  type = list(object({
    cidr        = string
    target_type = string
    target_id   = string
    environment = string
  }))
}

locals {
  # Filter routes for current environment
  current_env_routes = {
    for idx, route in var.route_table_routes :
    "${route.cidr}-${route.target_type}" => route
    if route.environment == var.environment || route.environment == "all"
  }
}

resource "aws_route" "custom" {
  for_each = local.current_env_routes

  route_table_id         = aws_route_table.main.id
  destination_cidr_block = each.value.cidr

  gateway_id     = each.value.target_type == "igw" ? each.value.target_id : null
  nat_gateway_id = each.value.target_type == "nat" ? each.value.target_id : null
}
```

## Conclusion

The `if` clause in for expressions enables powerful collection filtering directly within your OpenTofu configurations. Filter collections to create environment-specific resource sets, exclude inactive or disabled items, remove null values, and select elements meeting complex multi-condition criteria. Combine filtering with transformation in a single for expression to both select and reshape data in one pass. This is preferable to filtering a list first and then transforming it separately. For complex filtering logic, extract the condition to a local value for readability.
