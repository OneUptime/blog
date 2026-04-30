# How to Flatten Complex Data Structures in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Flatten, Data Structure, Collection, Infrastructure as Code

Description: Learn how to use OpenTofu's flatten() function and for expressions to collapse nested lists and complex data structures into flat collections for use with for_each and dynamic blocks.

---

Complex variable structures - like a map of lists, or nested objects - often need to be transformed into a simple list or map before you can iterate over each nested element with `for_each` or `dynamic` blocks. OpenTofu provides the `flatten()` function and for expressions to handle this.

---

## The Problem: Nested Structures with for_each

`for_each` accepts a map, or a set of strings, with one element per instance. Nested structures like a map of lists often need reshaping first:

```hcl
# This shape needs reshaping before you can create one resource per CIDR

variable "regions" {
  default = {
    "us-east-1" = ["10.0.0.0/24", "10.0.1.0/24"]
    "us-west-2" = ["10.1.0.0/24", "10.1.1.0/24"]
  }
}
```

---

## Using flatten()

```hcl
# Flatten a list of lists into a single list
locals {
  all_cidrs = flatten([
    ["10.0.0.0/24", "10.0.1.0/24"],
    ["10.1.0.0/24", "10.1.1.0/24"],
  ])
  # Result: ["10.0.0.0/24", "10.0.1.0/24", "10.1.0.0/24", "10.1.1.0/24"]
}
```

---

## Flatten Map of Lists into a Keyed Map

```hcl
variable "az_subnets" {
  default = {
    "us-east-1a" = ["10.0.0.0/24", "10.0.1.0/24"]
    "us-east-1b" = ["10.1.0.0/24", "10.1.1.0/24"]
  }
}

locals {
  # Flatten into list of objects with availability zone + cidr
  subnet_list = flatten([
    for az, cidrs in var.az_subnets : [
      for cidr in cidrs : {
        availability_zone = az
        cidr              = cidr
      }
    ]
  ])
  # Result:
  # [
  #   { availability_zone = "us-east-1a", cidr = "10.0.0.0/24" },
  #   { availability_zone = "us-east-1a", cidr = "10.0.1.0/24" },
  #   { availability_zone = "us-east-1b", cidr = "10.1.0.0/24" },
  #   { availability_zone = "us-east-1b", cidr = "10.1.1.0/24" },
  # ]

  # Convert to map keyed by "availability-zone/cidr" for for_each
  subnet_map = {
    for subnet in local.subnet_list :
    "${subnet.availability_zone}/${subnet.cidr}" => subnet
  }
}

# Use flattened map with for_each
resource "aws_subnet" "regional" {
  for_each = local.subnet_map

  availability_zone = each.value.availability_zone
  cidr_block        = each.value.cidr
  vpc_id            = aws_vpc.main.id

  tags = {
    AvailabilityZone = each.value.availability_zone
  }
}
```

---

## Real-World Example: Security Group Rules per Service

```hcl
variable "services" {
  default = {
    "web" = {
      ports  = [80, 443]
      source = "0.0.0.0/0"
    }
    "api" = {
      ports  = [8080, 8443]
      source = "10.0.0.0/8"
    }
    "db" = {
      ports  = [5432]
      source = "10.0.0.0/8"
    }
  }
}

locals {
  # Flatten to one entry per service+port combination
  sg_rules = flatten([
    for service, config in var.services : [
      for port in config.ports : {
        service = service
        port    = port
        source  = config.source
      }
    ]
  ])

  sg_rules_map = {
    for rule in local.sg_rules :
    "${rule.service}-${rule.port}" => rule
  }
}

resource "aws_vpc_security_group_ingress_rule" "services" {
  for_each = local.sg_rules_map

  security_group_id = aws_security_group.main.id
  from_port         = each.value.port
  to_port           = each.value.port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value.source

  description = "${each.value.service} on port ${each.value.port}"
}
```

---

## Flatten Lists from Multiple Modules

```hcl
# Collect outputs from multiple modules and flatten
locals {
  all_instance_ids = flatten([
    module.web_tier.instance_ids,
    module.api_tier.instance_ids,
    module.worker_tier.instance_ids,
  ])
}

resource "aws_lb_target_group_attachment" "all" {
  count = length(local.all_instance_ids)

  target_group_arn = aws_lb_target_group.main.arn
  target_id        = local.all_instance_ids[count.index]
  port             = 80
}
```

---

## Flatten Nested Tags

```hcl
variable "environments" {
  default = {
    "prod" = {
      tags = { Environment = "production", CostCenter = "eng-01" }
    }
    "staging" = {
      tags = { Environment = "staging", CostCenter = "eng-02" }
    }
  }
}

locals {
  # Merge all tags from all environments into one flat map
  all_tags = merge([
    for env, config in var.environments : config.tags
  ]...)
}
```

---

## Debugging Flattened Structures

```bash
# Use tofu console to inspect local values
echo 'local.subnet_map' | tofu console

# Or write to an output for inspection
output "debug_subnets" {
  value = local.subnet_map
}
```

---

## Best Practices

1. **Use local values** to hold intermediate flattened structures before passing to resources
2. **Always create a unique key** for the resulting map (e.g., `"${availability_zone}/${cidr}"`)
3. **Test with tofu console** before deploying to verify the structure is correct
4. **Add type annotations** to variables to help OpenTofu validate inputs
5. **Comment complex flatten expressions** - they can be hard to read at a glance

---

## Conclusion

The `flatten()` function and nested for expressions are essential tools for working with complex variable structures in OpenTofu. Use them to transform nested lists and maps into flat, keyed structures that `for_each` and `dynamic` blocks can iterate over cleanly.

---

*Manage your infrastructure with [OneUptime](https://oneuptime.com) - monitoring and alerting for everything you build.*
