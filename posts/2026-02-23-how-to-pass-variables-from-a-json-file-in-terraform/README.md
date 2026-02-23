# How to Pass Variables from a JSON File in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, JSON, Configuration, Automation

Description: Learn how to use JSON-formatted variable files in Terraform with .tfvars.json files, the jsondecode function, and programmatic configuration generation.

---

While Terraform's native HCL format is great for hand-written configurations, JSON is often more practical when variable values come from scripts, APIs, or other automated tools. Terraform has built-in support for JSON-formatted variable files, and you can also read arbitrary JSON files using data sources and functions.

This post covers both approaches: using `.tfvars.json` files for variable assignment and reading JSON data files within your configuration.

## Using .tfvars.json Files

Terraform accepts variable files in JSON format. Just name your file with a `.tfvars.json` extension:

```json
{
  "environment": "production",
  "region": "us-east-1",
  "instance_count": 3,
  "instance_type": "t3.large",
  "enable_monitoring": true
}
```

You load it the same way as an HCL tfvars file:

```bash
# Explicit loading
terraform apply -var-file="production.tfvars.json"
```

The matching variable declarations look identical to what you would use with an HCL file:

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
}
```

## Auto-Loading JSON Files

Just like their HCL counterparts, JSON variable files can be auto-loaded:

- `terraform.tfvars.json` - auto-loaded (like `terraform.tfvars`)
- `*.auto.tfvars.json` - auto-loaded (like `*.auto.tfvars`)

```json
{
  "project": "web-store",
  "owner": "platform-team",
  "cost_center": "engineering"
}
```

Save this as `terraform.tfvars.json` or `config.auto.tfvars.json` and Terraform loads it automatically.

## Complex Types in JSON

JSON maps naturally to Terraform's type system. Lists, maps, and objects all have direct JSON equivalents.

### Lists

```json
{
  "availability_zones": ["us-east-1a", "us-east-1b", "us-east-1c"],
  "allowed_ports": [80, 443, 8080],
  "cidr_blocks": ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}
```

### Maps

```json
{
  "tags": {
    "Environment": "production",
    "Team": "platform",
    "Project": "web-store",
    "CostCenter": "eng-123"
  },
  "instance_types": {
    "dev": "t3.micro",
    "staging": "t3.small",
    "prod": "t3.large"
  }
}
```

### Objects

```json
{
  "database_config": {
    "engine": "postgres",
    "engine_version": "15.4",
    "instance_class": "db.r6g.large",
    "storage_gb": 100,
    "multi_az": true,
    "backup_retention_days": 30
  }
}
```

### Lists of Objects

```json
{
  "subnets": [
    {
      "name": "public-1",
      "cidr": "10.0.1.0/24",
      "az": "us-east-1a",
      "public": true
    },
    {
      "name": "public-2",
      "cidr": "10.0.2.0/24",
      "az": "us-east-1b",
      "public": true
    },
    {
      "name": "private-1",
      "cidr": "10.0.10.0/24",
      "az": "us-east-1a",
      "public": false
    }
  ]
}
```

## Generating JSON Variable Files Programmatically

One of the biggest advantages of JSON is that every programming language can produce it. This makes it easy to generate variable files from scripts, APIs, or other tools.

### Python Script

```python
#!/usr/bin/env python3
# generate_tfvars.py
# Generates a Terraform variable file from external data

import json
import subprocess

# Fetch data from an API or database
config = {
    "environment": "production",
    "region": "us-east-1",
    "instance_count": 3,
    "tags": {
        "DeployedBy": "ci-pipeline",
        "Version": "2.1.0",
    },
    "availability_zones": [
        "us-east-1a",
        "us-east-1b",
        "us-east-1c",
    ],
}

# Write the JSON tfvars file
with open("generated.auto.tfvars.json", "w") as f:
    json.dump(config, f, indent=2)

print("Generated generated.auto.tfvars.json")
```

### Bash Script with jq

```bash
#!/bin/bash
# generate_tfvars.sh
# Builds a JSON tfvars file from multiple sources

# Fetch the latest AMI ID
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

# Fetch current instance count from an autoscaling group
CURRENT_COUNT=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "web-app-asg" \
  --query "AutoScalingGroups[0].DesiredCapacity" \
  --output text)

# Build the JSON file using jq
jq -n \
  --arg ami "$AMI_ID" \
  --arg count "$CURRENT_COUNT" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    ami_id: $ami,
    instance_count: ($count | tonumber),
    deploy_timestamp: $timestamp,
    region: "us-east-1"
  }' > infrastructure.auto.tfvars.json

echo "Generated infrastructure.auto.tfvars.json"
```

### CI/CD Pipeline Generation

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate variable file
        run: |
          cat > deploy.auto.tfvars.json <<EOF
          {
            "environment": "production",
            "image_tag": "${{ github.sha }}",
            "deployed_by": "${{ github.actor }}",
            "deploy_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "pipeline_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
          EOF

      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

## Reading Arbitrary JSON Files with file() and jsondecode()

Beyond `.tfvars.json` files, you can read any JSON file within your Terraform configuration using the `file()` and `jsondecode()` functions.

```json
{
  "services": {
    "api": {
      "port": 8080,
      "replicas": 3,
      "memory": 512
    },
    "worker": {
      "port": 9090,
      "replicas": 2,
      "memory": 1024
    },
    "web": {
      "port": 80,
      "replicas": 4,
      "memory": 256
    }
  }
}
```

```hcl
# main.tf

# Read and parse the JSON file
locals {
  # file() reads the file content as a string
  # jsondecode() parses the JSON string into an HCL object
  config = jsondecode(file("${path.module}/services.json"))
}

# Use the parsed data
resource "aws_ecs_service" "services" {
  for_each = local.config.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.services[each.key].id]
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.config.services

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = each.value.memory

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.ecr_repo}/${each.key}:latest"
      essential = true
      portMappings = [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Reading JSON from a Variable

Sometimes you receive JSON as a string variable (for example, from a CI/CD system) and need to parse it:

```hcl
variable "config_json" {
  description = "JSON string containing configuration"
  type        = string
}

locals {
  # Parse the JSON string into a usable object
  config = jsondecode(var.config_json)
}

resource "aws_instance" "app" {
  ami           = local.config.ami_id
  instance_type = local.config.instance_type
  tags          = local.config.tags
}
```

```bash
# Pass the JSON string via environment variable
export TF_VAR_config_json='{"ami_id":"ami-12345","instance_type":"t3.large","tags":{"Name":"app"}}'
terraform apply
```

## JSON vs HCL for Variable Files

| Feature | HCL (.tfvars) | JSON (.tfvars.json) |
|---------|---------------|---------------------|
| Human readability | Better | Good |
| Comments | Supported (#, //) | Not supported |
| Programmatic generation | Harder | Easy |
| Editor support | Terraform-specific | Universal |
| Trailing commas | Allowed | Not allowed |
| Multi-line strings | Heredoc syntax | Must use \n |

In practice, many teams use HCL for hand-written configurations and JSON for anything generated by scripts or tools.

## Validating JSON Variable Files

You can validate your JSON file before running Terraform:

```bash
# Check JSON syntax with jq
jq . production.tfvars.json > /dev/null
# If no output, the JSON is valid

# Pretty-print to verify content
jq . production.tfvars.json

# Validate that required keys exist
jq 'has("environment") and has("region")' production.tfvars.json
```

## A Complete Example

Here is a full workflow showing JSON variable files in action:

```json
{
  "project": "web-store",
  "environment": "production",
  "region": "us-east-1",
  "vpc_cidr": "10.0.0.0/16",
  "availability_zones": ["us-east-1a", "us-east-1b"],
  "instance_config": {
    "type": "t3.large",
    "count": 3,
    "monitoring": true
  },
  "database": {
    "engine": "postgres",
    "version": "15.4",
    "class": "db.r6g.large",
    "storage_gb": 100
  },
  "tags": {
    "Team": "platform",
    "CostCenter": "eng-retail"
  }
}
```

```hcl
# variables.tf

variable "project" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "vpc_cidr" { type = string }
variable "availability_zones" { type = list(string) }

variable "instance_config" {
  type = object({
    type       = string
    count      = number
    monitoring = bool
  })
}

variable "database" {
  type = object({
    engine     = string
    version    = string
    class      = string
    storage_gb = number
  })
}

variable "tags" {
  type = map(string)
}
```

```bash
terraform apply -var-file="production.tfvars.json"
```

## Wrapping Up

JSON variable files are a first-class feature in Terraform, not a workaround. They follow the same auto-loading rules as HCL files, support all variable types, and integrate naturally with scripting and automation. Use `.tfvars.json` files when your configuration values come from external tools, and use the `jsondecode()` function when you need to read JSON data within your Terraform code itself.

For more on managing Terraform variables, see our post on [passing variables via terraform.tfvars](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-variables-via-terraform-tfvars-file/view).
