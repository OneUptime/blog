# How to Import Existing Portainer Resources into Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Import, Infrastructure as Code, DevOps

Description: Learn how to import existing Portainer environments, stacks, and users into Terraform state for future management as code.

## Why Import Existing Resources?

If you've been managing Portainer manually via the UI, importing existing resources into Terraform lets you start managing them as code without recreating them. The `terraform import` command maps existing Portainer resources into Terraform state for the resource blocks you define.

## Prerequisites

- Portainer Terraform provider configured (see provider setup guide).
- The IDs and current settings of the existing Portainer resources you want to import.

## Finding Resource IDs

```bash
# Get environment (endpoint) IDs

curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq '[.[] | {id: .Id, name: .Name, url: .URL, type: .Type}]'

# Get stack IDs
curl -s "https://portainer.mycompany.com/api/stacks" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq '[.[] | {id: .Id, name: .Name, endpointId: .EndpointId}]'

# Get user IDs
curl -s "https://portainer.mycompany.com/api/users" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq '[.[] | {id: .Id, username: .Username}]'

# Get team IDs
curl -s "https://portainer.mycompany.com/api/teams" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | \
  jq '[.[] | {id: .Id, name: .Name}]'
```

## Import Command Syntax

```bash
# General format
terraform import <resource_type>.<resource_name> <resource_id>
```

## Importing Environments

```bash
# Write the Terraform resource block first
cat >> main.tf << 'EOF'
resource "portainer_environment" "production" {
  name                = "production"
  environment_address = "tcp://prod-server:2376"
  type                = 1
}
EOF

# Import the existing environment (ID from API query above)
terraform import portainer_environment.production 1
```

## Importing Stacks

```bash
# Add resource block
cat >> stacks.tf << 'EOF'
resource "portainer_stack" "web_app" {
  name            = "web-app"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = 1
}
EOF

# Import the stack (format: endpointId-stackId-deploymentType-method)
terraform import portainer_stack.web_app 1-3-standalone-string
```

## Importing Users

```bash
# Add resource block
cat >> users.tf << 'EOF'
resource "portainer_user" "alice" {
  username = "alice"
  role     = 2
}
EOF

# Import the user
terraform import portainer_user.alice 5
```

## Importing Teams

```bash
cat >> teams.tf << 'EOF'
resource "portainer_team" "backend" {
  name = "backend"
}
EOF

terraform import portainer_team.backend 2
```

## After Import: Sync Terraform Config with State

After importing, run `terraform plan` to see differences between your HCL and the actual resource state:

```bash
terraform plan
```

Update your HCL to match the current state until `plan` shows no changes:

```hcl
# Update the resource block to match actual state
resource "portainer_environment" "production" {
  name                = "production"          # Match actual name
  environment_address = "tcp://prod-server:2376"  # Match actual environment address
  type                = 1                     # Match actual type
}
```

## Bulk Import Script

```bash
#!/bin/bash
# Import all environments from Portainer into Terraform

API_KEY="${PORTAINER_API_KEY}"
PORTAINER_URL="https://portainer.mycompany.com"

# Get all environments
ENVIRONMENTS=$(curl -s "${PORTAINER_URL}/api/endpoints" \
  -H "X-API-Key: ${API_KEY}")

# Generate resource blocks and import commands
echo "$ENVIRONMENTS" | jq -c '.[]' | while read -r env; do
  ID=$(echo "$env" | jq '.Id')
  RESOURCE_NAME=$(echo "$env" | jq -r '.Name | ascii_downcase | gsub("[^a-z0-9_]"; "_") | if test("^[a-z_]") then . else "env_" + . end')
  ENV_NAME=$(echo "$env" | jq -r '.Name | @json')
  ENVIRONMENT_ADDRESS=$(echo "$env" | jq -r '.URL | @json')
  TYPE=$(echo "$env" | jq '.Type')

  echo "Importing environment: $RESOURCE_NAME (ID: $ID)"

  cat >> imported_environments.tf << EOF

resource "portainer_environment" "${RESOURCE_NAME}" {
  name                = ${ENV_NAME}
  environment_address = ${ENVIRONMENT_ADDRESS}
  type                = ${TYPE}
}
EOF

  terraform import "portainer_environment.${RESOURCE_NAME}" "$ID"
done
```

## Conclusion

Importing existing Portainer resources into Terraform is the bridge between manual UI management and infrastructure-as-code. Once imported, all future changes go through Terraform, giving you change history, peer review, and repeatable configuration management.
