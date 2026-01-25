# How to Vary Attributes Based on count.index in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Resource Management, Best Practices

Description: Learn how to dynamically vary resource attributes based on count.index in Terraform. This guide covers using lists, maps, conditionals, and lookup functions to create flexible, DRY infrastructure code.

When creating multiple similar resources in Terraform using `count`, you often need each instance to have slightly different attributes. The `count.index` value gives you the index of the current resource (starting at 0), which you can use to vary names, sizes, configurations, and more. Let's explore different patterns for this common scenario.

## Understanding count.index

The `count.index` is a special value available inside resources that use `count`. It represents the current iteration index.

```mermaid
flowchart LR
    subgraph count = 3
        A[index 0] --> R1[Resource 1]
        B[index 1] --> R2[Resource 2]
        C[index 2] --> R3[Resource 3]
    end
```

## Basic Usage with Lists

The most common pattern is using lists to provide different values for each resource.

```hcl
variable "instance_names" {
  type    = list(string)
  default = ["web-server", "api-server", "worker-server"]
}

variable "instance_types" {
  type    = list(string)
  default = ["t3.small", "t3.medium", "t3.large"]
}

resource "aws_instance" "servers" {
  count = length(var.instance_names)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_types[count.index]

  tags = {
    Name = var.instance_names[count.index]
    Index = count.index
  }
}
```

## Using Maps for Complex Configurations

When each resource needs multiple varying attributes, use a list of maps.

```hcl
variable "servers" {
  type = list(object({
    name          = string
    instance_type = string
    volume_size   = number
    environment   = string
  }))
  default = [
    {
      name          = "web-prod"
      instance_type = "t3.large"
      volume_size   = 100
      environment   = "production"
    },
    {
      name          = "api-prod"
      instance_type = "t3.xlarge"
      volume_size   = 200
      environment   = "production"
    },
    {
      name          = "worker-prod"
      instance_type = "t3.medium"
      volume_size   = 50
      environment   = "production"
    }
  ]
}

resource "aws_instance" "servers" {
  count = length(var.servers)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.servers[count.index].instance_type

  root_block_device {
    volume_size = var.servers[count.index].volume_size
  }

  tags = {
    Name        = var.servers[count.index].name
    Environment = var.servers[count.index].environment
  }
}
```

## Conditional Attributes with count.index

Use conditionals to vary attributes based on the index position.

```hcl
variable "instance_count" {
  type    = number
  default = 5
}

resource "aws_instance" "mixed_fleet" {
  count = var.instance_count

  ami = "ami-0c55b159cbfafe1f0"

  # First two instances are larger
  instance_type = count.index < 2 ? "t3.large" : "t3.small"

  # First instance is the primary
  tags = {
    Name = count.index == 0 ? "primary-server" : "secondary-server-${count.index}"
    Role = count.index == 0 ? "primary" : "secondary"
  }
}
```

## Using element() for Cycling Through Values

The `element()` function wraps around when the index exceeds the list length, useful for round-robin distribution.

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "subnet_cidrs" {
  type    = list(string)
  default = [
    "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24",
    "10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"
  ]
}

resource "aws_subnet" "subnets" {
  count = length(var.subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.subnet_cidrs[count.index]

  # Cycles through AZs: a, b, c, a, b, c
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    Name = "subnet-${count.index + 1}"
    AZ   = element(var.availability_zones, count.index)
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

## Computed Attributes Based on Index

Calculate attribute values dynamically using the index.

```hcl
variable "base_port" {
  type    = number
  default = 8080
}

variable "service_count" {
  type    = number
  default = 4
}

resource "aws_security_group_rule" "service_ports" {
  count = var.service_count

  type              = "ingress"
  from_port         = var.base_port + count.index
  to_port           = var.base_port + count.index
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id

  description = "Service port ${var.base_port + count.index}"
}

resource "aws_security_group" "main" {
  name        = "service-ports"
  description = "Security group for services"
  vpc_id      = aws_vpc.main.id
}
```

## CIDR Calculations with cidrsubnet()

Generate subnet CIDRs dynamically based on the index.

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_count" {
  type    = number
  default = 6
}

resource "aws_subnet" "dynamic_subnets" {
  count = var.subnet_count

  vpc_id = aws_vpc.main.id

  # Creates /24 subnets: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24, etc.
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)

  # Alternate between public and private
  map_public_ip_on_launch = count.index % 2 == 0

  tags = {
    Name = count.index % 2 == 0 ? "public-subnet-${count.index / 2}" : "private-subnet-${(count.index - 1) / 2}"
    Type = count.index % 2 == 0 ? "public" : "private"
  }
}
```

## Using lookup() with Index-Based Keys

Create a map with numeric keys for index-based lookups.

```hcl
variable "instance_configs" {
  type = map(object({
    type        = string
    volume_size = number
  }))
  default = {
    "0" = { type = "t3.large", volume_size = 100 }
    "1" = { type = "t3.medium", volume_size = 50 }
    "2" = { type = "t3.small", volume_size = 30 }
  }
}

variable "default_config" {
  type = object({
    type        = string
    volume_size = number
  })
  default = {
    type        = "t3.micro"
    volume_size = 20
  }
}

resource "aws_instance" "servers" {
  count = 5

  ami = "ami-0c55b159cbfafe1f0"

  # Use specific config for indexes 0-2, default for others
  instance_type = lookup(
    var.instance_configs,
    tostring(count.index),
    var.default_config
  ).type

  root_block_device {
    volume_size = lookup(
      var.instance_configs,
      tostring(count.index),
      var.default_config
    ).volume_size
  }

  tags = {
    Name = "server-${count.index}"
  }
}
```

## Combining Multiple Varying Attributes

Here's a comprehensive example combining multiple techniques.

```hcl
variable "environments" {
  type = list(object({
    name           = string
    instance_type  = string
    instance_count = number
    volume_size    = number
    is_public      = bool
  }))
  default = [
    {
      name           = "production"
      instance_type  = "t3.large"
      instance_count = 3
      volume_size    = 100
      is_public      = false
    },
    {
      name           = "staging"
      instance_type  = "t3.medium"
      instance_count = 2
      volume_size    = 50
      is_public      = true
    },
    {
      name           = "development"
      instance_type  = "t3.small"
      instance_count = 1
      volume_size    = 30
      is_public      = true
    }
  ]
}

locals {
  # Flatten environments into individual instances
  instances = flatten([
    for env_idx, env in var.environments : [
      for i in range(env.instance_count) : {
        key           = "${env.name}-${i}"
        name          = "${env.name}-server-${i + 1}"
        environment   = env.name
        instance_type = env.instance_type
        volume_size   = env.volume_size
        is_public     = env.is_public
        is_primary    = i == 0
      }
    ]
  ])
}

resource "aws_instance" "servers" {
  count = length(local.instances)

  ami                         = "ami-0c55b159cbfafe1f0"
  instance_type               = local.instances[count.index].instance_type
  associate_public_ip_address = local.instances[count.index].is_public

  root_block_device {
    volume_size = local.instances[count.index].volume_size
  }

  tags = {
    Name        = local.instances[count.index].name
    Environment = local.instances[count.index].environment
    Role        = local.instances[count.index].is_primary ? "primary" : "replica"
  }
}

output "instance_details" {
  value = [
    for idx, instance in aws_instance.servers : {
      name        = instance.tags.Name
      environment = instance.tags.Environment
      public_ip   = instance.public_ip
      private_ip  = instance.private_ip
    }
  ]
}
```

## When to Use for_each Instead

While `count.index` is powerful, consider using `for_each` when resources need stable identifiers.

```hcl
# Using for_each for better stability
variable "servers_map" {
  type = map(object({
    instance_type = string
    volume_size   = number
  }))
  default = {
    web = {
      instance_type = "t3.large"
      volume_size   = 100
    }
    api = {
      instance_type = "t3.medium"
      volume_size   = 50
    }
    worker = {
      instance_type = "t3.small"
      volume_size   = 30
    }
  }
}

resource "aws_instance" "servers" {
  for_each = var.servers_map

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value.instance_type

  root_block_device {
    volume_size = each.value.volume_size
  }

  tags = {
    Name = each.key
  }
}
```

## Best Practices

1. **Use descriptive variable names** - Make it clear what each list position represents
2. **Keep lists synchronized** - Ensure related lists have the same length
3. **Consider for_each for stability** - Use it when removing items from the middle of a list
4. **Document index meanings** - Add comments explaining what each index represents
5. **Use locals for complex transformations** - Pre-process data in locals for cleaner resource blocks
6. **Validate list lengths** - Add validation to ensure lists match expected sizes

By mastering these patterns, you can create flexible, DRY Terraform configurations that handle varied resource attributes elegantly.
