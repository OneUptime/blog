# How to Use tofu output to Read Output Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu output to read output values from OpenTofu state, extract specific values, and use them in scripts and pipelines.

## Introduction

`tofu output` reads output values from the current state file and displays them. Outputs are defined in configuration with `output` blocks and populated when `tofu apply` runs. The `tofu output` command is useful for retrieving deployed resource attributes like IP addresses, DNS names, or ARNs without parsing the state file directly.

## Basic Usage

```bash
# Show all outputs

tofu output

# Output:
# bucket_name = "acme-data-production"
# cluster_endpoint = "https://ABCDEF.gr7.us-east-1.eks.amazonaws.com"
# db_password = <sensitive>
```

## Read a Specific Output

```bash
# Get a single output by name
tofu output bucket_name
# "acme-data-production"

tofu output cluster_endpoint
# "https://ABCDEF.gr7.us-east-1.eks.amazonaws.com"
```

## JSON Output for Scripting

```bash
# All outputs as JSON
tofu output -json

# Output:
# {
#   "bucket_name": { "value": "acme-data-production", "sensitive": false },
#   "cluster_endpoint": { "value": "https://...", "sensitive": false }
# }
```

```bash
# Extract a specific value with jq
BUCKET=$(tofu output -json | jq -r '.bucket_name.value')
echo "Deploying to bucket: $BUCKET"
```

## Raw Output (No Quotes)

```bash
# Raw string output without quotes - useful in scripts
ENDPOINT=$(tofu output -raw cluster_endpoint)
kubectl config set-cluster production --server="$ENDPOINT"
```

## Sensitive Outputs

```hcl
# output.tf
output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}
```

```bash
# Sensitive outputs show as <sensitive> by default
tofu output db_password
# db_password = <sensitive>

# Access raw value explicitly (with care)
tofu output -raw db_password
# actual-password-value
```

## Using Outputs in CI/CD

```bash
# After apply, extract outputs for downstream steps
tofu apply -auto-approve

# Export as environment variables
export API_ENDPOINT=$(tofu output -raw api_endpoint)
export BUCKET_NAME=$(tofu output -raw bucket_name)

# Use in subsequent commands
curl -X POST "$API_ENDPOINT/health"
aws s3 cp ./dist/ "s3://$BUCKET_NAME/" --recursive
```

## Outputs from Remote State

```hcl
# Read outputs from another configuration's state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "acme-tofu-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_id
}
```

## Output Formats

```bash
# Display outputs in human-readable form (default)
tofu output

# JSON format - full metadata
tofu output -json

# Raw string - no formatting or quotes
tofu output -raw bucket_name
```

## Defining Outputs

```hcl
# outputs.tf
output "bucket_name" {
  description = "Name of the S3 state bucket"
  value       = aws_s3_bucket.data.bucket
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "db_password" {
  description = "RDS master password"
  value       = aws_db_instance.main.password
  sensitive   = true
}
```

## Conclusion

`tofu output` is the standard way to extract information from deployed infrastructure. Use `-raw` for use in shell variable assignments, `-json` for programmatic parsing, and define outputs with `sensitive = true` for secrets. In pipelines, run `tofu output -json` after apply and extract values with `jq` to pass configuration downstream to other deployment steps.
