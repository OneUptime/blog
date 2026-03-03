# How to Read YAML Configuration Files with yamldecode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, YAML, Configuration Management, HCL, Infrastructure as Code

Description: A practical guide to reading and using YAML configuration files in Terraform with yamldecode, including patterns for multi-environment setups and modular configs.

---

Many infrastructure teams prefer to keep their configuration in YAML files rather than embedding everything in HCL. YAML is familiar to most DevOps engineers, easier to edit for non-Terraform users, and works well with existing tooling. This guide covers practical patterns for reading YAML configuration files in Terraform using `yamldecode`.

## The Basic Pattern

The standard approach combines `file()` to read the file and `yamldecode()` to parse it:

```hcl
# Read and parse a YAML configuration file
locals {
  config = yamldecode(file("${path.module}/config.yaml"))
}

# Use the parsed values
resource "aws_instance" "app" {
  ami           = local.config.ami_id
  instance_type = local.config.instance_type
}
```

This is clean, readable, and separates your configuration data from your infrastructure logic.

## Structuring Your YAML Configuration

### Flat Configuration

The simplest approach is a flat key-value structure:

```yaml
# config.yaml
region: us-west-2
environment: production
instance_type: t3.large
instance_count: 3
enable_monitoring: true
enable_backups: true
```

```hcl
locals {
  config = yamldecode(file("${path.module}/config.yaml"))
}

provider "aws" {
  region = local.config.region
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = var.ami_id
  instance_type = local.config.instance_type
  monitoring    = local.config.enable_monitoring

  tags = {
    Environment = local.config.environment
  }
}
```

### Nested Configuration

For more complex setups, use nested YAML structures:

```yaml
# infrastructure.yaml
vpc:
  cidr: "10.0.0.0/16"
  enable_dns: true
  enable_nat: true

subnets:
  public:
    - cidr: "10.0.1.0/24"
      az: us-west-2a
    - cidr: "10.0.2.0/24"
      az: us-west-2b
  private:
    - cidr: "10.0.10.0/24"
      az: us-west-2a
    - cidr: "10.0.11.0/24"
      az: us-west-2b

database:
  engine: postgres
  version: "15"
  instance_class: db.r5.large
  storage_gb: 100
  multi_az: true
  backup_retention: 7
```

```hcl
locals {
  infra = yamldecode(file("${path.module}/infrastructure.yaml"))
}

resource "aws_vpc" "main" {
  cidr_block           = local.infra.vpc.cidr
  enable_dns_hostnames = local.infra.vpc.enable_dns
}

resource "aws_subnet" "public" {
  count             = length(local.infra.subnets.public)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.infra.subnets.public[count.index].cidr
  availability_zone = local.infra.subnets.public[count.index].az

  tags = { Name = "public-${count.index}" }
}

resource "aws_db_instance" "main" {
  engine               = local.infra.database.engine
  engine_version       = local.infra.database.version
  instance_class       = local.infra.database.instance_class
  allocated_storage    = local.infra.database.storage_gb
  multi_az             = local.infra.database.multi_az
  backup_retention_period = local.infra.database.backup_retention
}
```

## Multi-Environment Configuration

### Separate Files Per Environment

The most straightforward approach is one YAML file per environment:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Load the environment-specific configuration
  config = yamldecode(file("${path.module}/envs/${var.environment}.yaml"))
}
```

Directory structure:
```text
.
|-- envs/
|   |-- development.yaml
|   |-- staging.yaml
|   |-- production.yaml
|-- main.tf
|-- variables.tf
```

### Base Config with Environment Overrides

A more sophisticated pattern uses a base configuration with per-environment overrides:

```yaml
# envs/base.yaml
instance_type: t3.micro
instance_count: 1
enable_monitoring: false
enable_backups: false
log_level: info
```

```yaml
# envs/production.yaml
instance_type: t3.large
instance_count: 3
enable_monitoring: true
enable_backups: true
log_level: warn
```

```hcl
locals {
  # Load base configuration
  base_config = yamldecode(file("${path.module}/envs/base.yaml"))

  # Load environment-specific overrides
  env_config = yamldecode(file("${path.module}/envs/${var.environment}.yaml"))

  # Merge: environment config overrides base config
  config = merge(local.base_config, local.env_config)
}
```

## Reading Multiple YAML Files

### Loading a Directory of Configs

When you have multiple YAML files that should be combined:

```hcl
locals {
  # List of config files to load
  config_files = [
    "network.yaml",
    "compute.yaml",
    "database.yaml",
    "monitoring.yaml",
  ]

  # Parse each file into a map
  configs = {
    for f in local.config_files :
    trimsuffix(f, ".yaml") => yamldecode(file("${path.module}/configs/${f}"))
  }
}

# Access specific configs
output "network_config" {
  value = local.configs.network
}

output "database_config" {
  value = local.configs.database
}
```

### Service Discovery from YAML

Define your services in YAML and let Terraform create the infrastructure:

```yaml
# services.yaml
services:
  api-gateway:
    port: 8080
    replicas: 3
    cpu: 512
    memory: 1024
    health_check_path: /health
    public: true

  user-service:
    port: 8081
    replicas: 2
    cpu: 256
    memory: 512
    health_check_path: /ready
    public: false

  order-service:
    port: 8082
    replicas: 2
    cpu: 256
    memory: 512
    health_check_path: /ready
    public: false

  notification-service:
    port: 8083
    replicas: 1
    cpu: 128
    memory: 256
    health_check_path: /ping
    public: false
```

```hcl
locals {
  services = yamldecode(file("${path.module}/services.yaml")).services
}

# Create ECS task definitions for each service
resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory

  container_definitions = jsonencode([{
    name      = each.key
    image     = "${var.ecr_repo}/${each.key}:${var.image_tag}"
    cpu       = each.value.cpu
    memory    = each.value.memory
    essential = true
    portMappings = [{
      containerPort = each.value.port
      hostPort      = each.value.port
    }]
    healthCheck = {
      command = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}${each.value.health_check_path} || exit 1"]
    }
  }])
}

# Create ECS services
resource "aws_ecs_service" "services" {
  for_each = local.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets = each.value.public ? var.public_subnets : var.private_subnets
  }
}
```

## Validation Patterns

### Validating YAML Structure

Use Terraform's `can()` and custom validation to catch issues early:

```hcl
variable "config_file" {
  type        = string
  description = "Path to the YAML configuration file"
  default     = "config.yaml"

  validation {
    condition     = can(yamldecode(file(var.config_file)))
    error_message = "The configuration file must contain valid YAML."
  }
}

locals {
  raw_config = yamldecode(file(var.config_file))

  # Validate required fields exist
  config = {
    environment = try(local.raw_config.environment, "unknown")
    region      = try(local.raw_config.region, "us-east-1")
    instances   = try(local.raw_config.instance_count, 1)
  }
}
```

### Default Values for Missing Keys

Use `try()` or `lookup()` to provide defaults for optional configuration:

```hcl
locals {
  raw = yamldecode(file("${path.module}/config.yaml"))

  config = {
    # Required values (will error if missing)
    environment = local.raw.environment
    region      = local.raw.region

    # Optional values with defaults
    instance_type    = try(local.raw.instance_type, "t3.micro")
    instance_count   = try(local.raw.instance_count, 1)
    enable_monitoring = try(local.raw.enable_monitoring, false)
    tags             = try(local.raw.tags, {})
  }
}
```

## Tips for Working with YAML in Terraform

1. **Quote strings that look like numbers or booleans** in your YAML files to avoid type confusion.

2. **Use `try()` extensively** when accessing nested YAML values. A missing key will cause a Terraform error.

3. **Keep YAML files version-controlled** alongside your Terraform code so that configuration changes are tracked.

4. **Validate your YAML** before running Terraform. A syntax error in YAML will cause `yamldecode` to fail during planning.

5. **Avoid deeply nested structures** unless necessary. Flat or shallow YAML is easier to work with in Terraform.

## Summary

Reading YAML configuration files with `yamldecode` is one of the most practical patterns in Terraform. It lets you separate configuration data from infrastructure logic, makes your code more readable, and allows non-Terraform users to modify settings through familiar YAML files. Whether you are managing multi-environment deployments, defining service catalogs, or configuring complex networking, the `file()` plus `yamldecode()` pattern will serve you well. For the reverse operation, see our guide on [using yamlencode in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-yamlencode-function-in-terraform/view).
