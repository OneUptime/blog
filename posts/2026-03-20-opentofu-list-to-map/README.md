# How to Transform Lists of Objects into Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Function, For Expressions, Collection, Infrastructure

Description: Learn how to transform lists of objects into maps using for expressions in OpenTofu, enabling for_each-based resource creation and efficient data lookups.

## Overview

OpenTofu's `for_each` meta-argument requires a map or set, not a list. When configuration data arrives as a list of objects - from JSON files, variable inputs, or data sources - you need to convert it to a map keyed by a unique identifier. The `for` expression is the primary tool for this transformation.

## Basic List-to-Map Conversion

```hcl
# Starting data: a list of objects

locals {
  user_list = [
    { username = "alice", role = "admin",     email = "alice@example.com" },
    { username = "bob",   role = "developer", email = "bob@example.com" },
    { username = "carol", role = "viewer",    email = "carol@example.com" },
  ]

  # Convert list to map keyed by username for for_each use
  user_map = {
    for user in local.user_list :
    user.username => user
  }
}

# Now usable with for_each
resource "aws_iam_user" "users" {
  for_each = local.user_map

  name = each.key  # username

  tags = {
    Role  = each.value.role
    Email = each.value.email
  }
}
```

## Loading from JSON with List-to-Map

```hcl
# config/services.json
# [
#   { "name": "api",      "port": 8080, "memory": 512, "cpu": 256 },
#   { "name": "worker",   "port": 0,    "memory": 1024, "cpu": 512 },
#   { "name": "scheduler","port": 0,    "memory": 256,  "cpu": 128 }
# ]

locals {
  services_list = jsondecode(file("${path.module}/config/services.json"))

  # Transform list to map keyed by name
  services_map = {
    for svc in local.services_list :
    svc.name => svc
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.services_map

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory

  container_definitions = jsonencode([{
    name  = each.key
    image = "my-registry/${each.key}:latest"
    portMappings = each.value.port > 0 ? [{
      containerPort = each.value.port
      protocol      = "tcp"
    }] : []
  }])
}
```

## Multi-Key Transformation

```hcl
# When you need a composite key (multiple fields)
locals {
  environment_services = [
    { env = "prod",    service = "api",    replicas = 3 },
    { env = "prod",    service = "worker", replicas = 2 },
    { env = "staging", service = "api",    replicas = 1 },
    { env = "staging", service = "worker", replicas = 1 },
  ]

  # Composite key: "prod/api", "staging/worker", etc.
  env_service_map = {
    for item in local.environment_services :
    "${item.env}/${item.service}" => item
  }
}

resource "kubernetes_deployment" "services" {
  for_each = local.env_service_map

  metadata {
    name      = "${each.value.service}-${each.value.env}"
    namespace  = each.value.env
  }

  spec {
    replicas = each.value.replicas

    selector {
      match_labels = {
        app = each.value.service
        env = each.value.env
      }
    }

    template {
      metadata {
        labels = {
          app = each.value.service
          env = each.value.env
        }
      }

      spec {
        container {
          name  = each.value.service
          image = "my-registry/${each.value.service}:latest"
        }
      }
    }
  }
}
```

## Selective Field Extraction

```hcl
# Extract only specific fields into the map value
locals {
  raw_instances = [
    { id = "i-001", name = "web-1", type = "t3.micro",  az = "us-east-1a", private_ip = "10.0.1.5",  public_ip = "54.1.2.3" },
    { id = "i-002", name = "web-2", type = "t3.micro",  az = "us-east-1b", private_ip = "10.0.2.5",  public_ip = "54.1.2.4" },
    { id = "i-003", name = "db-1",  type = "t3.medium", az = "us-east-1a", private_ip = "10.0.3.10", public_ip = null },
  ]

  # Map with only the fields needed for security group rules
  instance_ip_map = {
    for inst in local.raw_instances :
    inst.name => {
      private_ip = inst.private_ip
      public_ip  = inst.public_ip
    }
  }

  # Map with only instances that have public IPs
  public_instance_map = {
    for inst in local.raw_instances :
    inst.name => inst
    if inst.public_ip != null
  }
}

output "instance_private_ips" {
  value = { for name, inst in local.instance_ip_map : name => inst.private_ip }
}
```

## Handling Duplicate Keys

```hcl
# When the source list may have duplicate values for a single field, use a composite key
locals {
  dns_records = [
    { zone = "example.com", type = "A",   name = "www",  value = "1.2.3.4" },
    { zone = "example.com", type = "A",   name = "api",  value = "1.2.3.5" },
    { zone = "example.com", type = "MX",  name = "@",    value = "mail.example.com" },
    { zone = "test.com",    type = "A",   name = "www",  value = "5.6.7.8" },
  ]

  # Use unique composite key to avoid collisions
  dns_record_map = {
    for record in local.dns_records :
    "${record.zone}/${record.type}/${record.name}" => record
  }
}

resource "aws_route53_record" "records" {
  for_each = local.dns_record_map

  zone_id = aws_route53_zone.zones[each.value.zone].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.value]
}
```

## Summary

Transforming lists to maps with `for` expressions is a fundamental OpenTofu pattern that unlocks `for_each`-based resource creation. Key techniques include: keying by a unique identifier, using composite keys for multi-dimensional data, filtering with `if` clauses, and extracting only required fields. This approach is essential when consuming configuration from JSON files, API data sources, or any list-shaped input.
