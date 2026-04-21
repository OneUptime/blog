# How to Use tofu output to Read Output Values - Tofu Read Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu output to read and display output values from your OpenTofu state, including JSON format for scripting and automation.

## Introduction

`tofu output` reads output values from your current state file and displays them. Outputs are the mechanism for exposing infrastructure details - VPC IDs, endpoints, ARNs - to other tools, configurations, and team members.

## Defining Outputs

```hcl
# outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true  # Hides value in normal output
}
```

## Basic Usage

```bash
# Show all outputs
tofu output

# Example output:
# database_endpoint = <sensitive>
# public_subnet_ids = [
#   "subnet-0a1b2c3d",
#   "subnet-0e1f2a3b",
# ]
# vpc_id = "vpc-0a1b2c3d4e5f"
```

## Getting a Specific Output

```bash
# Get a specific output value
tofu output vpc_id
# "vpc-0a1b2c3d4e5f"

# Get a sensitive output as a raw value (shows value with explicit request)
tofu output -raw database_endpoint
# mydb.cluster-xyz.us-east-1.rds.amazonaws.com:5432
```

## JSON Format for Scripting

```bash
# All outputs as JSON
tofu output -json

# Example:
# {
#   "database_endpoint": {
#     "sensitive": true,
#     "type": "string",
#     "value": "mydb.cluster-xyz.us-east-1.rds.amazonaws.com:5432"
#   },
#   "public_subnet_ids": {
#     "sensitive": false,
#     "type": ["list", "string"],
#     "value": ["subnet-0a1b2c3d", "subnet-0e1f2a3b"]
#   },
#   "vpc_id": {
#     "sensitive": false,
#     "type": "string",
#     "value": "vpc-0a1b2c3d4e5f"
#   }
# }

# Get a specific output as JSON
tofu output -json vpc_id
# "vpc-0a1b2c3d4e5f"

# Get just the raw value (no quotes, no type info)
tofu output -raw vpc_id
# vpc-0a1b2c3d4e5f
```

## Using Outputs in Shell Scripts

```bash
#!/bin/bash
# deploy-app.sh

# Get infrastructure outputs
VPC_ID=$(tofu output -raw vpc_id)
SUBNET_IDS=$(tofu output -json public_subnet_ids | jq -r '.[]' | tr '\n' ',')
DB_ENDPOINT=$(tofu output -raw database_endpoint)

echo "Deploying to VPC: $VPC_ID"
echo "Using subnets: $SUBNET_IDS"

# Use values to configure the application
cat > app-config.env << EOF
DATABASE_HOST=${DB_ENDPOINT}
VPC_ID=${VPC_ID}
EOF
```

## Outputs in CI/CD Pipelines

```yaml
# GitHub Actions: use outputs from previous steps
jobs:
  infrastructure:
    runs-on: ubuntu-latest
    outputs:
      vpc_id: ${{ steps.outputs.outputs.vpc_id }}
      lb_dns: ${{ steps.outputs.outputs.lb_dns }}

    steps:
      - name: Apply Infrastructure
        run: tofu apply -auto-approve

      - name: Get Outputs
        id: outputs
        run: |
          echo "vpc_id=$(tofu output -raw vpc_id)" >> $GITHUB_OUTPUT
          echo "lb_dns=$(tofu output -raw lb_dns)" >> $GITHUB_OUTPUT

  deploy-app:
    needs: infrastructure
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Application
        env:
          VPC_ID: ${{ needs.infrastructure.outputs.vpc_id }}
          LB_DNS: ${{ needs.infrastructure.outputs.lb_dns }}
        run: ./deploy-app.sh
```

## Module Outputs

Access outputs from child modules:

```hcl
# Module definition (modules/networking/outputs.tf)
output "vpc_id" {
  value = aws_vpc.main.id
}

# Root module (main.tf)
module "networking" {
  source = "./modules/networking"
}

# Access module output
output "vpc_id" {
  value = module.networking.vpc_id
}
```

```bash
# Show module outputs
tofu output -json | jq '.vpc_id'
```

## Sensitive Outputs

```bash
# Sensitive outputs show as <sensitive> in normal output
tofu output
# database_password = <sensitive>

# But can be read explicitly with -raw
tofu output -raw database_password
# superSecretP@ssw0rd

# In JSON, a specifically requested sensitive value is included
tofu output -json database_password
# "superSecretP@ssw0rd"
```

## Conclusion

`tofu output` is the standard way to extract infrastructure values for use in application configuration, other OpenTofu configurations, or operational tooling. Use `-raw` for simple string values in scripts, `-json` for structured data and lists, and pipe through `jq` for complex extraction. Remember that sensitive outputs are hidden in normal output but accessible - implement appropriate access controls on your state files.
