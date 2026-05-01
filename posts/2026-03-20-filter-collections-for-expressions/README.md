# How to Filter Collections with for Expressions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, For Expressions, Collection, Filtering, Infrastructure as Code

Description: Learn how to filter lists and maps in OpenTofu using for expressions with if conditions to select, transform, and reshape collections for use in resource configurations.

---

OpenTofu's for expressions allow you to transform and filter collections - lists, sets, and maps - using a compact, functional syntax. Adding an `if` clause to a for expression acts as a filter, including only elements that match a condition.

---

## Basic For Expression Syntax

```hcl
# List transformation

[for item in list : expression]

# List filtering
[for item in list : expression if condition]

# Map transformation
{for key, value in map : new_key => new_value}

# Map filtering
{for key, value in map : new_key => new_value if condition}
```

---

## Filter a List by Value

```hcl
locals {
  all_environments = ["dev", "staging", "production", "test", "dr"]

  # Keep only production-like environments
  prod_envs = [for env in local.all_environments : env
    if contains(["production", "dr"], env)]
  # Result: ["production", "dr"]

  # Exclude dev environments
  non_dev = [for env in local.all_environments : env
    if env != "dev" && env != "test"]
  # Result: ["staging", "production", "dr"]
}
```

---

## Filter a List of Objects

```hcl
variable "instances" {
  default = [
    { name = "web-1",   type = "t3.medium", enabled = true,  ip = "10.0.1.10" },
    { name = "web-2",   type = "t3.medium", enabled = false, ip = "10.0.1.11" },
    { name = "db-1",    type = "r5.large",  enabled = true,  ip = "10.0.2.10" },
    { name = "cache-1", type = "r5.large",  enabled = true,  ip = "10.0.3.10" },
  ]
}

locals {
  # Only enabled instances
  enabled_instances = [for inst in var.instances : inst if inst.enabled]

  # Only large instances that are enabled
  large_enabled = [for inst in var.instances : inst
    if inst.enabled && startswith(inst.type, "r5")]
}
```

---

## Filter a Map

```hcl
variable "subnets" {
  default = {
    "public-1a"  = { cidr = "10.0.1.0/24", type = "public"  }
    "public-1b"  = { cidr = "10.0.2.0/24", type = "public"  }
    "private-1a" = { cidr = "10.0.3.0/24", type = "private" }
    "private-1b" = { cidr = "10.0.4.0/24", type = "private" }
  }
}

locals {
  # Only public subnets
  public_subnets = {for name, subnet in var.subnets : name => subnet
    if subnet.type == "public"}

  # Only CIDRs for private subnets
  private_cidrs = [for name, subnet in var.subnets : subnet.cidr
    if subnet.type == "private"]
}
```

---

## Transform While Filtering

```hcl
variable "security_rules" {
  default = [
    { port = 22,  source = "10.0.0.0/8", enabled = true  },
    { port = 80,  source = "0.0.0.0/0",  enabled = true  },
    { port = 443, source = "0.0.0.0/0",  enabled = true  },
    { port = 8080,source = "10.0.0.0/8", enabled = false },
  ]
}

locals {
  # Only enabled rules, transformed to resource format
  active_rules = [for rule in var.security_rules : {
    from_port   = rule.port
    to_port     = rule.port
    protocol    = "tcp"
    cidr_blocks = [rule.source]
  } if rule.enabled]
}

resource "aws_security_group" "web" {
  name = "web-sg"

  dynamic "ingress" {
    for_each = local.active_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

---

## Filter Using Data Sources

```hcl
# Get subnets and filter by tag
data "aws_subnets" "all" {}

data "aws_subnet" "details" {
  for_each = toset(data.aws_subnets.all.ids)
  id       = each.value
}

locals {
  # Only private subnets
  private_subnet_ids = [for id, subnet in data.aws_subnet.details : id
    if lookup(subnet.tags, "Tier", "") == "private"]
}
```

---

## Filter with String Functions

```hcl
variable "repos" {
  default = [
    "myorg/frontend-app",
    "myorg/backend-api",
    "myorg/infra-tools",
    "external/third-party",
  ]
}

locals {
  # Only internal repos
  internal_repos = [for repo in var.repos : repo
    if startswith(repo, "myorg/")]

  # Only app repos (not infra)
  app_repos = [for repo in var.repos : repo
    if startswith(repo, "myorg/") && !endswith(repo, "-tools")]
}
```

---

## Using Filtered Results in Resources

```hcl
# Create resources only for filtered items
resource "aws_route53_record" "services" {
  for_each = {for inst in var.instances : inst.name => inst if inst.enabled}

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.key}.internal.example.com"
  type    = "A"
  ttl     = 300
  records = [each.value.ip]
}
```

---

## Best Practices

1. **Use local values** to store filtered results - makes the filtering logic reusable and readable
2. **Prefer maps over lists** when you need named resources - use `for_each` downstream
3. **Add comments** explaining non-obvious filter conditions
4. **Test with tofu console** before deploying:
   ```bash
   echo 'local.prod_envs' | tofu console
   ```
5. **Combine with variables** to make filters configurable per environment

---

## Conclusion

For expression filtering in OpenTofu enables clean, readable collection manipulation without external functions or complex logic. Use `if` clauses to include only relevant elements, and combine with transformation expressions to reshape data exactly as your resources need it.

---

*Manage your infrastructure configuration with [OneUptime](https://oneuptime.com) - monitoring and alerting for all your deployments.*
