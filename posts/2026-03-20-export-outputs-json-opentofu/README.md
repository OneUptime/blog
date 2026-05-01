# How to Export Outputs as JSON in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, JSON, CI/CD, Infrastructure as Code, DevOps

Description: A guide to exporting OpenTofu output values as JSON for use in scripts, CI/CD pipelines, and integration with other tools.

## Introduction

Exporting OpenTofu outputs as JSON provides a machine-readable format for integration with other tools, scripts, and CI/CD pipelines. The JSON output includes the value, type, and sensitive flag for each output, making it complete and parseable.

## Basic JSON Export

```bash
# Export all outputs as JSON

tofu output -json

# Example output:
# {
#   "database_endpoint": {
#     "sensitive": false,
#     "type": "string",
#     "value": "mydb.cluster.us-east-1.rds.amazonaws.com:5432"
#   },
#   "instance_ids": {
#     "sensitive": false,
#     "type": ["tuple", ["string", "string", "string"]],
#     "value": ["i-0abc123", "i-0def456", "i-0ghi789"]
#   },
#   "vpc_id": {
#     "sensitive": false,
#     "type": "string",
#     "value": "vpc-0abc123def456789"
#   }
# }
```

## Parsing JSON Output with jq

```bash
# Get a specific output value
tofu output -json | jq -r '.vpc_id.value'

# Get all output names
tofu output -json | jq 'keys[]'

# Get all non-sensitive output values
tofu output -json | jq 'to_entries | map(select(.value.sensitive == false)) | from_entries | map_values(.value)'

# Get list output
tofu output -json | jq -r '.instance_ids.value[]'

# Get map output
tofu output -json | jq '.server_ips.value'

# Extract multiple values
tofu output -json | jq -r '{vpc: .vpc_id.value, db: .database_endpoint.value}'
```

## Saving Outputs to File

```bash
# Save all outputs to a JSON file
tofu output -json > outputs.json

# Pretty-print with jq
tofu output -json | jq . > outputs-pretty.json

# Extract just the values (not the type/sensitive metadata)
tofu output -json | jq 'map_values(.value)' > output-values.json
```

## Using JSON Outputs in CI/CD

```yaml
# .github/workflows/deploy.yml
steps:
  - name: Apply infrastructure
    run: tofu apply -auto-approve

  - name: Export outputs
    id: tofu_outputs
    run: |
      # Export as JSON and store as a step output
      OUTPUTS=$(tofu output -json)
      printf 'outputs=%s\n' "$(printf '%s\n' "$OUTPUTS" | jq -c .)" >> "$GITHUB_OUTPUT"

      # Extract specific values
      VPC_ID=$(printf '%s\n' "$OUTPUTS" | jq -r '.vpc_id.value')
      ALB_DNS=$(printf '%s\n' "$OUTPUTS" | jq -r '.load_balancer_dns.value')

      echo "VPC_ID=$VPC_ID" >> "$GITHUB_ENV"
      echo "ALB_DNS=$ALB_DNS" >> "$GITHUB_ENV"

  - name: Deploy application
    run: |
      helm upgrade --install myapp ./chart \
        --set loadBalancer.dns=$ALB_DNS \
        --set network.vpcId=$VPC_ID
```

## Using Outputs in Shell Scripts

```bash
#!/bin/bash
# configure-app.sh - Configure app using OpenTofu outputs

set -euo pipefail

# Get all outputs at once
OUTPUTS=$(tofu output -json)

# Extract values
VPC_ID=$(echo "$OUTPUTS" | jq -r '.vpc_id.value')
DB_HOST=$(echo "$OUTPUTS" | jq -r '.database_endpoint.value' | cut -d: -f1)
DB_PORT=$(echo "$OUTPUTS" | jq -r '.database_endpoint.value' | cut -d: -f2)
REDIS_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.redis_endpoint.value')
SUBNETS=$(echo "$OUTPUTS" | jq -r '.private_subnet_ids.value | join(",")')

echo "Creating application configuration..."
cat > /etc/app/config.yaml <<YAML
database:
  host: ${DB_HOST}
  port: ${DB_PORT}
redis:
  endpoint: ${REDIS_ENDPOINT}
network:
  vpc_id: ${VPC_ID}
  subnets: [${SUBNETS}]
YAML

echo "Configuration created successfully"
```

## Generating Kubernetes ConfigMaps from Outputs

```bash
#!/bin/bash
# generate-configmap.sh

OUTPUTS=$(tofu output -json)

kubectl create configmap infrastructure-config \
  --from-literal=VPC_ID="$(printf '%s\n' "$OUTPUTS" | jq -r '.vpc_id.value')" \
  --from-literal=DB_ENDPOINT="$(printf '%s\n' "$OUTPUTS" | jq -r '.database_endpoint.value')" \
  --from-literal=ALB_DNS="$(printf '%s\n' "$OUTPUTS" | jq -r '.load_balancer_dns.value')" \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

## Outputs in Terraform Cloud / OpenTofu Compatible Backends

```bash
# Get outputs from specific workspace (if using workspaces)
tofu workspace select production
tofu output -json > production-outputs.json

tofu workspace select staging
tofu output -json > staging-outputs.json
```

## Conclusion

Exporting outputs as JSON is the most powerful way to integrate OpenTofu with the broader infrastructure automation ecosystem. The structured JSON format enables programmatic access to any output value, makes CI/CD integration straightforward, and allows complex post-deployment workflows using standard tools like `jq`. Design your outputs with JSON consumers in mind - use consistent naming and appropriate types for easy parsing.
