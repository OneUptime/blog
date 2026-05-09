# How to Create Cartesian Products with setproduct in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Setproduct, Collection, Function, for_each

Description: Learn how to use the setproduct function in OpenTofu to generate Cartesian products of multiple sets, enabling exhaustive multi-dimensional resource creation across environments, regions, and tiers.

## Overview

`setproduct` computes the Cartesian product of multiple sets or lists, returning every possible combination as a list of tuples. This is the OpenTofu-native way to create resources for all combinations of environments × regions × tiers without nested loops or repetitive code.

## Basic setproduct Usage

```hcl
locals {
  environments = ["prod", "staging", "dev"]
  regions      = ["us-east-1", "eu-west-1"]

  # All environment/region combinations
  # [["prod","us-east-1"], ["prod","eu-west-1"], ["staging","us-east-1"], ...]
  env_region_combos = setproduct(local.environments, local.regions)
}

output "all_combinations" {
  value = [
    for combo in local.env_region_combos :
    "${combo[0]}-${combo[1]}"
  ]
  # ["prod-us-east-1", "prod-eu-west-1", "staging-us-east-1", ...]
}
```

## for_each with setproduct: Multi-Dimensional Resource Creation

```hcl
locals {
  environments = toset(["prod", "staging"])
  services     = toset(["api", "worker", "scheduler"])

  # Generate a map keyed by "env/service" for all combinations
  env_service_map = {
    for combo in setproduct(local.environments, local.services) :
    "${combo[0]}/${combo[1]}" => {
      env     = combo[0]
      service = combo[1]
    }
  }
}

resource "aws_ecs_service" "services" {
  for_each = local.env_service_map

  name            = "${each.value.service}-${each.value.env}"
  cluster         = aws_ecs_cluster.clusters[each.value.env].id
  task_definition = aws_ecs_task_definition.tasks[each.value.service].arn
  desired_count   = each.value.env == "prod" ? 3 : 1

  network_configuration {
    subnets         = aws_subnet.private[each.value.env][*].id
    security_groups = [aws_security_group.ecs[each.value.env].id]
  }
}
```

## Three-Dimensional Cartesian Product

```hcl
locals {
  environments = ["prod", "staging"]
  regions      = ["us-east-1", "eu-west-1", "ap-southeast-1"]
  tiers        = ["web", "api", "db"]

  # All env × region × tier combinations
  all_combos = setproduct(local.environments, local.regions, local.tiers)

  # Convert to a map for for_each
  deployment_map = {
    for combo in local.all_combos :
    "${combo[0]}/${combo[1]}/${combo[2]}" => {
      env    = combo[0]
      region = combo[1]
      tier   = combo[2]
    }
  }
}

# This creates 2 × 3 × 3 = 18 security groups

resource "aws_security_group" "tier_sgs" {
  for_each    = local.deployment_map
  name        = "sg-${each.value.tier}-${each.value.env}-${each.value.region}"
  description = "${each.value.tier} tier for ${each.value.env} in ${each.value.region}"
  vpc_id      = aws_vpc.vpcs[each.key].id

  tags = {
    Environment = each.value.env
    Region      = each.value.region
    Tier        = each.value.tier
  }
}
```

## IAM Permission Matrix with setproduct

```hcl
locals {
  teams = ["platform", "backend", "data", "security"]

  # Environments each team needs access to
  team_env_access = {
    platform = ["prod", "staging", "dev"]
    backend  = ["staging", "dev"]
    data     = ["prod", "staging"]
    security = ["prod", "staging", "dev"]
  }

  # Generate team/environment bindings (nested for, since each team has a different
  # set of allowed environments - setproduct would over-generate combinations here)
  team_env_bindings = flatten([
    for team in local.teams : [
      for env in local.team_env_access[team] : {
        key  = "${team}/${env}"
        team = team
        env  = env
      }
    ]
  ])

  team_env_binding_map = {
    for item in local.team_env_bindings :
    item.key => item
  }
}

# Attach env-specific policies to team roles
resource "aws_iam_role_policy_attachment" "team_env_access" {
  for_each = local.team_env_binding_map

  role       = aws_iam_role.team_roles[each.value.team].name
  policy_arn = aws_iam_policy.env_access[each.value.env].arn
}
```

## Security Group Rules with setproduct (Port × CIDR Matrix)

```hcl
variable "allowed_ports" {
  type    = list(number)
  default = [80, 443, 8080, 8443]
}

variable "allowed_source_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

locals {
  # Every port × every CIDR combination
  port_cidr_combos = setproduct(var.allowed_ports, var.allowed_source_cidrs)

  sg_rules_map = {
    for combo in local.port_cidr_combos :
    "${combo[0]}-${replace(combo[1], "/", "_")}" => {
      port = combo[0]
      cidr = combo[1]
    }
  }
}

resource "aws_security_group_rule" "ingress" {
  for_each = local.sg_rules_map

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = [each.value.cidr]
  security_group_id = aws_security_group.app.id
}
```

## Route53 Records Across Multiple Zones and Record Types

```hcl
locals {
  dns_zones = ["example.com", "example.net", "example.org"]
  subdomains = ["www", "api", "docs"]

  # All zone × subdomain combinations
  dns_combos = setproduct(local.dns_zones, local.subdomains)

  dns_records_map = {
    for combo in local.dns_combos :
    "${combo[0]}/${combo[1]}" => {
      zone      = combo[0]
      subdomain = combo[1]
    }
  }
}

resource "aws_route53_record" "multi_zone" {
  for_each = local.dns_records_map

  zone_id = aws_route53_zone.zones[each.value.zone].zone_id
  name    = "${each.value.subdomain}.${each.value.zone}"
  type    = "CNAME"
  ttl     = 300
  records = ["origin.${each.value.zone}"]
}
```

## Excluding Specific Combinations

```hcl
locals {
  environments = ["prod", "staging", "dev"]
  regions      = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  # Exclude: dev does not deploy to eu-west-1 or ap-southeast-1
  excluded_combos = toset([
    "dev/eu-west-1",
    "dev/ap-southeast-1",
  ])

  all_env_region_map = {
    for combo in setproduct(local.environments, local.regions) :
    "${combo[0]}/${combo[1]}" => {
      env    = combo[0]
      region = combo[1]
    }
    # Filter out excluded combinations
    if !contains(local.excluded_combos, "${combo[0]}/${combo[1]}")
  }
}

output "active_deployments" {
  value = keys(local.all_env_region_map)
  # ["prod/us-east-1", "prod/eu-west-1", "prod/ap-southeast-1",
  #  "staging/us-east-1", "staging/eu-west-1", "staging/ap-southeast-1",
  #  "dev/us-east-1"]
}
```

## Summary

`setproduct` eliminates the need for nested `for` loops when creating resources for every combination of two or more sets. The standard pattern is: generate combinations with `setproduct`, convert to a named map with a composite key using a `for` expression, then drive `for_each` from that map. Add `if !contains(excluded_set, key)` to exclude specific combinations. This is especially powerful for multi-region, multi-environment, multi-tier infrastructure where the number of combinations grows multiplicatively.
