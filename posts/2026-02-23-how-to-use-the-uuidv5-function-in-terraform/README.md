# How to Use the uuidv5 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Uuidv5, Deterministic UUID, Hashing, Infrastructure as Code

Description: Learn how to use Terraform's uuidv5 function to generate deterministic, reproducible UUIDs based on namespace and name inputs for consistent resource identification.

---

Unlike the random `uuid()` function, `uuidv5()` generates deterministic UUIDs. Given the same namespace and name, it always produces the same UUID. This makes it perfect for creating stable, unique identifiers that are derived from meaningful input values rather than random data. This post explains how `uuidv5` works, what the namespace means, and shows practical examples.

## How uuidv5 Differs from uuid

The critical difference:

```hcl
# uuid() - random, different every time
output "random" {
  value = uuid()
  # "a3f1b2c4-..." (different on every plan)
}

# uuidv5() - deterministic, same inputs = same output
output "deterministic" {
  value = uuidv5("dns", "example.com")
  # Always: "cfbff0d1-9375-5685-968c-48ce8b15ae17"
}
```

UUID v5 uses SHA-1 hashing internally. It takes a namespace UUID and a name string, hashes them together, and formats the result as a UUID. The same namespace and name always produce the same UUID.

## Function Syntax

```hcl
# uuidv5(namespace, name)
# namespace: a predefined namespace identifier or a UUID string
# name: any string

uuidv5("dns", "example.com")
# Result: "cfbff0d1-9375-5685-968c-48ce8b15ae17"
```

## Predefined Namespaces

Terraform supports four predefined namespace identifiers that correspond to the standard UUID namespaces defined in RFC 4122:

```hcl
locals {
  # DNS namespace - for domain names
  dns_uuid = uuidv5("dns", "example.com")
  # "cfbff0d1-9375-5685-968c-48ce8b15ae17"

  # URL namespace - for URLs
  url_uuid = uuidv5("url", "https://example.com/resource")
  # Produces a consistent UUID for this URL

  # OID namespace - for ISO Object Identifiers
  oid_uuid = uuidv5("oid", "1.2.3.4.5")
  # Produces a consistent UUID for this OID

  # X500 namespace - for X.500 Distinguished Names
  x500_uuid = uuidv5("x500", "CN=example,O=MyOrg")
  # Produces a consistent UUID for this DN
}
```

## Custom Namespaces

You can also use any UUID string as a namespace. This lets you create your own namespace for your organization:

```hcl
locals {
  # Define a custom namespace UUID for your organization
  org_namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

  # Generate deterministic UUIDs within your namespace
  project_id = uuidv5(local.org_namespace, "my-terraform-project")
  service_id = uuidv5(local.org_namespace, "api-service")
  env_id     = uuidv5(local.org_namespace, "${var.project}-${var.environment}")
}
```

## Generating Stable Resource Identifiers

The primary use case for `uuidv5` is creating identifiers that are unique but repeatable:

```hcl
variable "project" {
  default = "ecommerce"
}

variable "environment" {
  default = "production"
}

locals {
  # These IDs are deterministic - same project + environment = same IDs
  vpc_id_tag = uuidv5("dns", "${var.project}.${var.environment}.vpc")
  app_id_tag = uuidv5("dns", "${var.project}.${var.environment}.app")
  db_id_tag  = uuidv5("dns", "${var.project}.${var.environment}.db")
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name          = "${var.project}-${var.environment}-vpc"
    DeterministicId = local.vpc_id_tag
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name          = "${var.project}-${var.environment}-app"
    DeterministicId = local.app_id_tag
  }
}
```

No matter how many times you run Terraform, these IDs remain the same as long as the project and environment do not change.

## Cross-Reference Between Configurations

When multiple Terraform configurations need to agree on an identifier without sharing state:

```hcl
# Configuration A - creates the resource
locals {
  shared_namespace = "550e8400-e29b-41d4-a716-446655440000"
  resource_id = uuidv5(local.shared_namespace, "shared-database-${var.environment}")
}

resource "aws_db_instance" "shared" {
  identifier = "db-${substr(local.resource_id, 0, 8)}"
  engine     = "postgres"

  tags = {
    SharedId = local.resource_id
  }
}

# Configuration B - references the same resource
# Uses the exact same namespace and name to get the same UUID
locals {
  shared_namespace = "550e8400-e29b-41d4-a716-446655440000"
  resource_id = uuidv5(local.shared_namespace, "shared-database-${var.environment}")
}

# Can look up the resource by its deterministic tag
data "aws_db_instance" "shared" {
  db_instance_identifier = "db-${substr(local.resource_id, 0, 8)}"
}
```

## Generating IDs for Map Keys

When you need deterministic keys for a map based on complex inputs:

```hcl
variable "services" {
  type = list(object({
    name = string
    port = number
    team = string
  }))
  default = [
    { name = "api", port = 8080, team = "backend" },
    { name = "web", port = 3000, team = "frontend" },
    { name = "worker", port = 0, team = "backend" },
  ]
}

locals {
  # Generate a deterministic UUID for each service
  service_ids = {
    for svc in var.services :
    svc.name => uuidv5("dns", "${svc.name}.${svc.team}.services.internal")
  }
}

output "service_ids" {
  value = local.service_ids
  # {
  #   api    = "xxxx-...-xxxx"
  #   web    = "yyyy-...-yyyy"
  #   worker = "zzzz-...-zzzz"
  # }
}
```

## Hierarchical UUID Generation

Create a hierarchy of UUIDs where child IDs are derived from parent IDs:

```hcl
locals {
  # Organization-level namespace
  org_ns = uuidv5("dns", "mycompany.internal")

  # Project-level namespace (derived from org)
  project_ns = uuidv5(local.org_ns, var.project)

  # Environment-level namespace (derived from project)
  env_ns = uuidv5(local.project_ns, var.environment)

  # Resource-level IDs (derived from environment)
  vpc_uuid      = uuidv5(local.env_ns, "vpc")
  database_uuid = uuidv5(local.env_ns, "database")
  cache_uuid    = uuidv5(local.env_ns, "cache")
}
```

This creates a predictable hierarchy: changing the project or environment changes all downstream IDs, but the same project+environment always produces the same resource IDs.

## Consistent Naming Across Modules

Pass a namespace UUID to modules so they generate consistent IDs:

```hcl
# Root module
locals {
  base_namespace = uuidv5("dns", "${var.org}.${var.project}.${var.environment}")
}

module "networking" {
  source    = "./modules/networking"
  namespace = local.base_namespace
  # ... other variables
}

module "compute" {
  source    = "./modules/compute"
  namespace = local.base_namespace
  # ... other variables
}

# Inside a module
variable "namespace" {
  type = string
}

locals {
  vpc_id    = uuidv5(var.namespace, "vpc")
  subnet_id = uuidv5(var.namespace, "subnet-private")
}
```

## Using uuidv5 for Idempotent External Resources

When working with external APIs that need idempotency keys:

```hcl
locals {
  # Generate a deterministic idempotency key based on the operation
  idempotency_key = uuidv5("url", "https://api.example.com/create-tenant/${var.tenant_name}")
}

resource "null_resource" "create_tenant" {
  triggers = {
    tenant_name = var.tenant_name
  }

  provisioner "local-exec" {
    command = <<-EOF
      curl -X POST https://api.example.com/tenants \
        -H "Idempotency-Key: ${local.idempotency_key}" \
        -d '{"name": "${var.tenant_name}"}'
    EOF
  }
}
```

## Comparing uuid and uuidv5 Use Cases

| Use Case | Function |
|---|---|
| Trigger that fires every apply | `uuid()` |
| Stable identifier for a resource | `uuidv5()` |
| Random unique name suffix | `uuid()` or `random_id` |
| Cross-config identifier agreement | `uuidv5()` |
| Correlation ID stored in state | `random_uuid` resource |
| Deterministic ID from user input | `uuidv5()` |

## Important Notes

There are a few things to be aware of:

1. UUID v5 uses SHA-1 internally. SHA-1 is considered cryptographically weak, so do not use `uuidv5` output as a security token. It is fine for identification purposes.

2. The namespace matters. The same name with different namespaces produces different UUIDs. Always use the same namespace when you want matching results.

3. The output is deterministic but not reversible. You cannot recover the input name from the UUID output.

4. UUID v5 values do not change between Terraform runs. This is the whole point - they are stable identifiers.

## Summary

The `uuidv5` function generates deterministic UUIDs based on a namespace and name. The same inputs always produce the same output, making it ideal for stable resource identifiers, cross-configuration references, and hierarchical ID schemes. Use the predefined namespaces (`dns`, `url`, `oid`, `x500`) for standard use cases, or define your own namespace UUID for organization-specific identifiers. When you need randomness, use `uuid()` or `random_uuid`. When you need determinism, `uuidv5` is the right choice.
