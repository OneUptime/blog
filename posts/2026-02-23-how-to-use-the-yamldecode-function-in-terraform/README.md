# How to Use the yamldecode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, YAML, Configuration, HCL, Infrastructure as Code

Description: Learn how to use Terraform's yamldecode function to parse YAML strings into native Terraform data structures for flexible configuration management.

---

YAML is everywhere in modern infrastructure - Kubernetes manifests, Ansible playbooks, CI/CD pipelines, Helm charts, and application configurations. Terraform's `yamldecode` function lets you parse YAML content into native Terraform data structures (maps, lists, strings, numbers), so you can use YAML as an input format for your infrastructure code.

## What Does yamldecode Do?

The `yamldecode` function takes a string containing YAML and converts it into a Terraform value. Maps become Terraform maps, lists become lists, strings stay as strings, and numbers stay as numbers.

```hcl
# Parse a simple YAML string
output "parsed" {
  value = yamldecode("name: myapp\nport: 8080")
  # Result: { name = "myapp", port = 8080 }
}
```

## Syntax

```hcl
yamldecode(string)
```

Takes a YAML-formatted string, returns the corresponding Terraform value.

## Type Mapping

Here is how YAML types map to Terraform types:

| YAML Type | Terraform Type |
|-----------|---------------|
| Mapping   | map (object)  |
| Sequence  | list (tuple)  |
| String    | string        |
| Integer   | number        |
| Float     | number        |
| Boolean   | bool          |
| Null      | null          |

```hcl
locals {
  example = yamldecode(<<-YAML
    string_val: hello
    number_val: 42
    float_val: 3.14
    bool_val: true
    null_val: null
    list_val:
      - one
      - two
      - three
    map_val:
      key1: value1
      key2: value2
  YAML
  )
}

output "types" {
  value = {
    string = local.example.string_val   # "hello"
    number = local.example.number_val   # 42
    float  = local.example.float_val    # 3.14
    bool   = local.example.bool_val     # true
    list   = local.example.list_val     # ["one", "two", "three"]
    map    = local.example.map_val      # { key1 = "value1", key2 = "value2" }
  }
}
```

## Practical Examples

### Reading YAML Configuration Files

The most common pattern is reading YAML files with `file()` and parsing them with `yamldecode`:

```hcl
# config.yaml:
# environment: production
# region: us-west-2
# instance_type: t3.medium
# replicas: 3
# features:
#   logging: true
#   monitoring: true
#   autoscaling: false

locals {
  config = yamldecode(file("${path.module}/config.yaml"))
}

resource "aws_instance" "app" {
  count         = local.config.replicas
  ami           = var.ami_id
  instance_type = local.config.instance_type

  tags = {
    Environment = local.config.environment
    Region      = local.config.region
  }
}
```

### Environment-Specific Configuration

Use different YAML files per environment:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

locals {
  # Load environment-specific config
  env_config = yamldecode(
    file("${path.module}/environments/${var.environment}.yaml")
  )
}

# environments/production.yaml:
# vpc_cidr: "10.0.0.0/16"
# instance_type: "t3.large"
# min_instances: 3
# max_instances: 10
# db_instance_class: "db.r5.xlarge"

# environments/development.yaml:
# vpc_cidr: "10.1.0.0/16"
# instance_type: "t3.micro"
# min_instances: 1
# max_instances: 2
# db_instance_class: "db.t3.medium"

resource "aws_vpc" "main" {
  cidr_block = local.env_config.vpc_cidr
  tags       = { Name = "${var.environment}-vpc" }
}

resource "aws_autoscaling_group" "app" {
  min_size         = local.env_config.min_instances
  max_size         = local.env_config.max_instances
  desired_capacity = local.env_config.min_instances

  launch_template {
    id = aws_launch_template.app.id
  }
}
```

### Parsing Kubernetes Manifests

You can parse Kubernetes YAML to extract information or transform it:

```hcl
locals {
  # Parse a Kubernetes deployment manifest
  k8s_deployment = yamldecode(file("${path.module}/k8s/deployment.yaml"))

  # Extract useful information
  container_image = local.k8s_deployment.spec.template.spec.containers[0].image
  replica_count   = local.k8s_deployment.spec.replicas
  app_labels      = local.k8s_deployment.metadata.labels
}

output "deployment_info" {
  value = {
    image    = local.container_image
    replicas = local.replica_count
    labels   = local.app_labels
  }
}
```

### Multi-Document YAML Handling

YAML supports multiple documents separated by `---`. However, `yamldecode` only handles a single document. To work with multi-document YAML, you need to split it first:

```hcl
locals {
  # Read a multi-document YAML file
  raw_yaml = file("${path.module}/resources.yaml")

  # Split on document separators and parse each document
  # Note: this is a simplified approach; real multi-doc YAML may need more careful splitting
  documents = [
    for doc in split("\n---\n", local.raw_yaml) :
    yamldecode(doc) if trimspace(doc) != ""
  ]
}

output "first_document" {
  value = local.documents[0]
}
```

### Using YAML for Complex Variable Definitions

YAML is often more readable than HCL for complex nested structures:

```hcl
# services.yaml:
# services:
#   api:
#     port: 8080
#     replicas: 3
#     health_check: /health
#     env:
#       LOG_LEVEL: info
#       DB_POOL_SIZE: "10"
#   worker:
#     port: 9090
#     replicas: 2
#     health_check: /ready
#     env:
#       LOG_LEVEL: warn
#       QUEUE_WORKERS: "5"

locals {
  services = yamldecode(file("${path.module}/services.yaml")).services
}

resource "aws_ecs_service" "services" {
  for_each = local.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.replicas
}
```

## Error Handling

If the YAML is invalid, `yamldecode` will throw an error during planning. You can use `try()` to handle potential parsing failures:

```hcl
locals {
  # Safely attempt to parse YAML with a fallback
  config = try(
    yamldecode(file("${path.module}/config.yaml")),
    { environment = "default", region = "us-east-1" }  # Fallback values
  )
}
```

## YAML Gotchas in Terraform

### Unquoted Strings That Look Like Other Types

YAML automatically interprets certain strings as non-string types:

```yaml
# These might surprise you:
version: 1.0      # Parsed as number 1, not string "1.0"
enabled: yes      # Parsed as boolean true
country: no       # Parsed as boolean false!
```

To avoid this, quote strings that might be misinterpreted:

```yaml
version: "1.0"
enabled: "yes"
country: "no"
```

### Indentation Sensitivity

YAML is whitespace-sensitive. Incorrect indentation will change the structure:

```yaml
# This is a map with a nested map:
database:
  host: localhost
  port: 5432

# This is two separate top-level keys (different structure):
database:
host: localhost
port: 5432
```

## Combining with yamlencode

You can round-trip data through YAML:

```hcl
locals {
  # Parse YAML, modify it, and encode it back
  original = yamldecode(file("${path.module}/base-config.yaml"))

  modified = merge(local.original, {
    environment = var.environment
    timestamp   = timestamp()
  })

  output_yaml = yamlencode(local.modified)
}
```

For more on encoding, see our [yamlencode guide](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-yamlencode-function-in-terraform/view).

## Summary

The `yamldecode` function is a bridge between the YAML world and Terraform's native data structures. It lets you maintain configuration in YAML (which many teams prefer for its readability) while still using those values in HCL-based Terraform configurations. Whether you are reading environment configs, parsing Kubernetes manifests, or managing complex service definitions, `yamldecode` paired with `file()` is the standard approach. For a deeper dive into reading YAML files, check out our post on [reading YAML configuration files with yamldecode](https://oneuptime.com/blog/post/2026-02-23-how-to-read-yaml-configuration-files-with-yamldecode/view).
