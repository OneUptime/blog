# How to Build Dynamic Resource Configurations from Data Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, JSON, YAML, Data Files, Dynamic Configuration

Description: Learn how to load JSON and YAML data files in OpenTofu to drive resource creation dynamically, separating infrastructure logic from configuration data.

## Introduction

Separating data from code is a fundamental software engineering principle. In OpenTofu, you can load JSON or YAML files using `file()` and `jsondecode()`/`yamldecode()` to drive resource creation - making it easy for non-Terraform users to modify configuration without touching HCL.

## Loading JSON Configuration Files

Use `jsondecode(file(...))` to load structured data from a JSON file.

```hcl
# File: config/environments.json

# {
#   "dev": {
#     "instance_type": "t3.micro",
#     "min_size": 1,
#     "max_size": 3,
#     "tags": { "CostCenter": "dev-team" }
#   },
#   "prod": {
#     "instance_type": "t3.large",
#     "min_size": 3,
#     "max_size": 10,
#     "tags": { "CostCenter": "platform" }
#   }
# }

locals {
  # Load and parse the environments configuration file
  environments = jsondecode(file("${path.module}/config/environments.json"))
}

resource "aws_autoscaling_group" "app" {
  for_each = local.environments

  name                = "app-${each.key}"
  min_size            = each.value.min_size
  max_size            = each.value.max_size
  launch_template {
    id      = aws_launch_template.app[each.key].id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = each.value.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## Loading YAML Files

YAML is often more human-readable for configuration files. Use `yamldecode()` to parse them.

```hcl
# File: config/dns_records.yaml
# records:
#   - name: "api"
#     type: "A"
#     ttl: 300
#     records: ["10.0.1.100", "10.0.1.101"]
#   - name: "www"
#     type: "CNAME"
#     ttl: 3600
#     records: ["api.example.com"]

locals {
  # Load DNS records from YAML file
  dns_config = yamldecode(file("${path.module}/config/dns_records.yaml"))
}

resource "aws_route53_record" "records" {
  # Convert list of records to a map using a name/type key
  for_each = {
    for record in local.dns_config.records : "${record.name}-${record.type}" => record
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}
```

## Merging Data Files for Multiple Environments

Use `merge` to combine base configuration with environment-specific overrides loaded from separate files.

```hcl
locals {
  # Load base configuration shared across all environments
  base_config = jsondecode(file("${path.module}/config/base.json"))

  # Load environment-specific overrides
  env_overrides = jsondecode(
    file("${path.module}/config/${var.environment}.json")
  )

  # Merge: environment overrides take precedence over base
  config = merge(local.base_config, local.env_overrides)
}
```

## Validating Data File Contents

Add a `check` block to surface data file errors during plan or apply.

```hcl
locals {
  services = jsondecode(file("${path.module}/config/services.json"))
}

variable "environment" {
  type = string
}

# Validate that required keys exist in each service definition
check "services_have_required_keys" {
  assert {
    condition = alltrue([
      for svc in local.services : can(svc.name) && can(svc.port) && can(svc.health_path)
    ])
    error_message = "All services must define name, port, and health_path fields."
  }
}
```

If invalid data should stop the run, use variable validation or a precondition instead of a `check` block.

## Building Security Group Rules from a Data File

```hcl
# File: config/firewall_rules.json
# {
#   "ingress": [
#     { "from_port": 443, "to_port": 443, "protocol": "tcp", "cidr": "0.0.0.0/0", "description": "HTTPS" },
#     { "from_port": 80,  "to_port": 80,  "protocol": "tcp", "cidr": "0.0.0.0/0", "description": "HTTP redirect" }
#   ]
# }

locals {
  firewall_rules = jsondecode(file("${path.module}/config/firewall_rules.json"))
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "app" {
  # Build a stable map of rules for for_each
  for_each = {
    for rule in local.firewall_rules.ingress :
    "${rule.protocol}-${rule.from_port}-${rule.to_port}-${rule.cidr}" => rule
  }

  security_group_id = aws_security_group.app.id
  ip_protocol       = each.value.protocol
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  cidr_ipv4         = each.value.cidr
  description       = each.value.description
}
```

## Conclusion

Externalizing configuration into JSON and YAML files makes your OpenTofu code reusable across teams. Infrastructure engineers maintain the HCL logic while application teams can manage their service definitions, DNS records, and firewall rules through familiar data formats without needing to understand OpenTofu syntax.
