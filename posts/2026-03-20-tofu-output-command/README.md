# How to Read Output Values with tofu output Command - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu output, CLI, Infrastructure as Code, DevOps

Description: A guide to using the tofu output command to read and display infrastructure output values after deployment.

## Introduction

The `tofu output` command reads output values from your OpenTofu state and displays them. This is how you retrieve IP addresses, endpoints, IDs, and other information about your deployed infrastructure after running `tofu apply`.

## Basic Usage

```bash
# Display all outputs

tofu output

# Example output:
# database_endpoint = "mydb.abc123.us-east-1.rds.amazonaws.com:5432"
# load_balancer_dns = "myapp-alb-123456.us-east-1.elb.amazonaws.com"
# vpc_id = "vpc-0abc123def456789"
# database_password = <sensitive>
```

## Specific Output

```bash
# Get a specific output value
tofu output vpc_id
# "vpc-0abc123def456789"

# Get a specific output (without quotes for raw string)
tofu output -raw vpc_id
# vpc-0abc123def456789 (no quotes)

# Access sensitive output value
tofu output -raw database_password
# actual-password-value (use with caution!)
```

## JSON Output Format

```bash
# Get all outputs as JSON
tofu output -json
# {
#   "database_endpoint": {
#     "sensitive": false,
#     "type": "string",
#     "value": "mydb.abc123.us-east-1.rds.amazonaws.com:5432"
#   },
#   "vpc_id": {
#     "sensitive": false,
#     "type": "string",
#     "value": "vpc-0abc123def456789"
#   }
# }

# Get specific output as JSON
tofu output -json database_endpoint

# Parse with jq
tofu output -json | jq '.vpc_id.value'
tofu output -json | jq -r '.database_endpoint.value'
```

## Scripting with tofu output

```bash
#!/bin/bash
# use-outputs.sh - Script that uses OpenTofu outputs

# Get outputs as variables
VPC_ID=$(tofu output -raw vpc_id)
DB_ENDPOINT=$(tofu output -raw database_endpoint)
ALB_DNS=$(tofu output -raw load_balancer_dns)

echo "VPC: $VPC_ID"
echo "Database: $DB_ENDPOINT"
echo "Load Balancer: $ALB_DNS"

# Configure application
cat > /etc/myapp/config.yaml <<EOF
database:
  host: ${DB_ENDPOINT%%:*}  # Strip port from endpoint
  port: ${DB_ENDPOINT##*:}  # Get just the port
load_balancer: $ALB_DNS
EOF
```

## Using Outputs in CI/CD

```yaml
# .github/workflows/deploy.yml
steps:
  - name: Apply infrastructure
    run: tofu apply -auto-approve

  - name: Get infrastructure outputs
    id: outputs
    run: |
      echo "VPC_ID=$(tofu output -raw vpc_id)" >> $GITHUB_OUTPUT
      echo "ALB_DNS=$(tofu output -raw load_balancer_dns)" >> $GITHUB_OUTPUT
      echo "DB_ENDPOINT=$(tofu output -raw database_endpoint)" >> $GITHUB_OUTPUT

  - name: Configure application
    run: |
      echo "Load balancer: ${{ steps.outputs.outputs.ALB_DNS }}"
      # Use outputs in next deployment steps
```

## Outputs from Different Working Directories

```bash
# Get outputs from a different state file/directory
tofu output -state=/path/to/terraform.tfstate vpc_id

# Get outputs from a specific root module directory
cd /path/to/environment/prod
tofu output vpc_id
```

## Working with List and Map Outputs

```bash
# List output
tofu output -json subnet_ids
# ["subnet-abc123", "subnet-def456", "subnet-ghi789"]

# Parse list with jq
tofu output -json subnet_ids | jq -r '.[]'
# subnet-abc123
# subnet-def456
# subnet-ghi789

# First element
tofu output -json subnet_ids | jq -r '.[0]'

# Map output
tofu output -json instance_ips
# {"web-1": "10.0.1.5", "web-2": "10.0.1.6"}

# Get specific map value
tofu output -json instance_ips | jq -r '."web-1"'
```

## Exporting Outputs

```bash
# Export all outputs to a file
tofu output -json > infrastructure-outputs.json

# Export specific output
tofu output -raw kubeconfig > ~/.kube/config-prod

# Export multiple outputs to environment file
{
  echo "export TF_OUT_VPC_ID=$(tofu output -raw vpc_id)"
  echo "export TF_OUT_DB=$(tofu output -raw database_endpoint)"
} > outputs.env

source outputs.env
```

## Conclusion

The `tofu output` command is your interface to the deployed infrastructure information. Using `-raw` for single values in scripts, `-json` for programmatic consumption, and piping through `jq` for complex parsing are the standard patterns. Well-designed outputs with meaningful names and descriptions make this command a reliable tool for integrating your infrastructure with application deployments and operational tooling.
