# How to Handle Terraform State in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, State Management, Remote State, Infrastructure as Code

Description: A comprehensive guide to managing Terraform state in HCP Terraform including versioning, sharing, locking, backup, and recovery strategies.

---

Terraform state is the source of truth for your infrastructure. It maps your configuration to real-world resources, tracks metadata, and enables Terraform to plan accurate changes. When state gets corrupted, lost, or out of sync, you are in trouble. HCP Terraform takes most of the state management burden off your plate, but you still need to understand how it works and how to handle edge cases.

This guide covers everything about state management in HCP Terraform, from daily operations to emergency recovery.

## How State Works in HCP Terraform

When you use HCP Terraform as your backend, state management changes in several important ways:

- **Storage**: State is stored encrypted at rest in HCP Terraform's infrastructure
- **Locking**: Automatic locking prevents concurrent modifications
- **Versioning**: Every state change creates a new version you can roll back to
- **Access control**: State access is governed by workspace permissions
- **Encryption**: State is encrypted in transit and at rest

You do not need to configure S3 buckets, DynamoDB tables, or storage accounts. It just works.

## Viewing State

### Through the UI

1. Go to your workspace
2. Click the **States** tab
3. You see a list of all state versions with timestamps and change descriptions
4. Click any version to view the full state contents

### Through the CLI

```bash
# List all resources in the current state
terraform state list

# Show details for a specific resource
terraform state show aws_instance.web

# Pull the full state as JSON
terraform state pull > state.json

# View just the outputs
terraform output
terraform output -json
```

### Through the API

```bash
# Get the current state version
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/current-state-version" \
  | jq '{
    id: .data.id,
    serial: .data.attributes.serial,
    created: .data.attributes["created-at"],
    size: .data.attributes.size,
    resources_processed: .data.attributes["resources-processed"]
  }'
```

```bash
# Download the actual state file
STATE_DOWNLOAD_URL=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/current-state-version" \
  | jq -r '.data.attributes["hosted-state-download-url"]')

curl -s "$STATE_DOWNLOAD_URL" > current-state.json
```

## State Versioning

Every successful apply creates a new state version. This gives you a complete history of your infrastructure changes.

### Listing State Versions

```bash
# List recent state versions
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/state-versions?page[size]=10" \
  | jq '.data[] | {
    id: .id,
    serial: .attributes.serial,
    created: .attributes["created-at"],
    size: .attributes.size
  }'
```

### Comparing State Versions

Download two versions and compare them:

```bash
#!/bin/bash
# compare-states.sh - Compare two state versions

STATE_V1_ID="sv-xxxxxxxxxxxxxxxx"
STATE_V2_ID="sv-yyyyyyyyyyyyyyyy"

# Download both state versions
for SV_ID in $STATE_V1_ID $STATE_V2_ID; do
  URL=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "https://app.terraform.io/api/v2/state-versions/${SV_ID}" \
    | jq -r '.data.attributes["hosted-state-download-url"]')

  curl -s "$URL" | jq '.' > "state-${SV_ID}.json"
done

# Compare resource lists
echo "=== Resources in V1 but not V2 ==="
diff <(jq -r '.resources[].instances[].attributes.id // .resources[].type + "." + .resources[].name' "state-${STATE_V1_ID}.json" | sort) \
     <(jq -r '.resources[].instances[].attributes.id // .resources[].type + "." + .resources[].name' "state-${STATE_V2_ID}.json" | sort)
```

## Rolling Back State

If a bad apply corrupted your state, you can roll back to a previous version:

### Method 1: Through the UI

1. Go to your workspace > **States**
2. Find the state version you want to restore
3. Click the three-dot menu and select **Revert to this state**

### Method 2: Through the CLI

```bash
# Step 1: Download the state version you want to restore
terraform state pull > current-backup.json

# Step 2: Get the old state
# (download it from the API as shown above)
curl -s "$OLD_STATE_DOWNLOAD_URL" > old-state.json

# Step 3: Push the old state
terraform state push old-state.json
```

### Method 3: Through the API

```bash
# Roll back by creating a new state version from an old one
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

# Download the old state
OLD_STATE_URL=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/state-versions/sv-old-version-id" \
  | jq -r '.data.attributes["hosted-state-download-url"]')

OLD_STATE=$(curl -s "$OLD_STATE_URL" | base64)
OLD_SERIAL=$(curl -s "$OLD_STATE_URL" | jq '.serial')

# Create a new state version with the old state content
# Note: increment the serial number
NEW_SERIAL=$((OLD_SERIAL + 1))

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"state-versions\",
      \"attributes\": {
        \"serial\": ${NEW_SERIAL},
        \"md5\": \"$(echo -n $OLD_STATE | base64 -d | md5sum | cut -d' ' -f1)\",
        \"state\": \"${OLD_STATE}\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/state-versions"
```

## State Locking

HCP Terraform automatically locks state during operations. This prevents two people or processes from modifying state simultaneously.

### Checking Lock Status

```bash
# Check if a workspace is locked
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}" \
  | jq '{locked: .data.attributes.locked, locked_by: .data.relationships["locked-by"]}'
```

### Manually Locking/Unlocking

```bash
# Lock a workspace
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{"reason": "Manual lock for maintenance"}' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/actions/lock"

# Unlock a workspace
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/actions/unlock"

# Force unlock (when the original locker is unavailable)
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/actions/force-unlock"
```

With Terraform:

```hcl
# Lock a workspace using the TFE provider
resource "tfe_workspace" "locked" {
  name           = "production-database"
  organization   = "your-org"
  execution_mode = "remote"

  # Note: There is no direct "locked" attribute
  # Use the API for manual locking operations
}
```

## Sharing State Between Workspaces

Workspaces often need to reference outputs from other workspaces. HCP Terraform provides two mechanisms for this.

### Using tfe_outputs

```hcl
# In the consuming workspace - read outputs from another workspace
data "tfe_outputs" "networking" {
  organization = "your-org"
  workspace    = "production-networking"
}

# Use the outputs
resource "aws_instance" "app" {
  subnet_id = data.tfe_outputs.networking.values.private_subnet_ids[0]

  vpc_security_group_ids = [
    data.tfe_outputs.networking.values.app_security_group_id
  ]
}
```

### Using terraform_remote_state

```hcl
# Alternative: Using terraform_remote_state
data "terraform_remote_state" "networking" {
  backend = "remote"

  config = {
    organization = "your-org"
    workspaces = {
      name = "production-networking"
    }
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

The `tfe_outputs` approach is preferred because it only exposes outputs, while `terraform_remote_state` exposes the entire state.

### State Access Permissions

To share state between workspaces, the consuming workspace needs state read access. This is controlled through team permissions:

```hcl
# Grant the CI team read access to networking workspace state
resource "tfe_team_access" "ci_networking_state" {
  team_id      = tfe_team.ci.id
  workspace_id = tfe_workspace.networking.id

  permissions {
    runs           = "read"
    variables      = "none"
    state_versions = "read-outputs"  # Only expose outputs, not full state
    workspace_locking = false
  }
}
```

## State Manipulation Operations

Sometimes you need to directly manipulate state. These operations work the same as with local state but execute through HCP Terraform.

### Moving Resources

```bash
# Rename a resource in state
terraform state mv aws_instance.old_name aws_instance.new_name

# Move a resource into a module
terraform state mv aws_instance.web module.web.aws_instance.this

# Move a resource between modules
terraform state mv module.old.aws_instance.web module.new.aws_instance.web
```

### Removing Resources from State

```bash
# Remove a resource from state without destroying it
# The actual infrastructure remains, but Terraform stops managing it
terraform state rm aws_instance.temporary

# Remove an entire module
terraform state rm module.deprecated_service
```

### Importing Existing Resources

```bash
# Import an existing resource into Terraform state
terraform import aws_instance.web i-1234567890abcdef0

# Import a resource into a module
terraform import module.vpc.aws_vpc.this vpc-1234567890abcdef0
```

With Terraform 1.5+, you can use import blocks:

```hcl
# Import block - declarative imports
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.medium"
  # ...
}
```

## Backup Strategies

While HCP Terraform versions your state automatically, having external backups is a good practice:

```bash
#!/bin/bash
# backup-all-states.sh - Back up state from all workspaces

BACKUP_DIR="state-backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Get all workspaces
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?page[size]=100" \
  | jq -r '.data[] | .id + ":" + .attributes.name')

for WS in $WORKSPACES; do
  WS_ID=$(echo "$WS" | cut -d: -f1)
  WS_NAME=$(echo "$WS" | cut -d: -f2)

  # Get current state download URL
  STATE_URL=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "https://app.terraform.io/api/v2/workspaces/${WS_ID}/current-state-version" \
    | jq -r '.data.attributes["hosted-state-download-url"] // empty')

  if [ -n "$STATE_URL" ]; then
    echo "Backing up: ${WS_NAME}"
    curl -s "$STATE_URL" > "${BACKUP_DIR}/${WS_NAME}.tfstate"
  fi
done

echo "Backups saved to ${BACKUP_DIR}"
echo "Total: $(ls ${BACKUP_DIR}/*.tfstate 2>/dev/null | wc -l) state files"
```

## State Security

### Sensitive Data in State

Terraform state often contains sensitive data (database passwords, API keys, etc.). HCP Terraform helps by:

- Encrypting state at rest
- Encrypting state in transit (HTTPS)
- Controlling access through workspace permissions
- Allowing `read-outputs` permission level (no full state access)

But you should still minimize sensitive data in state:

```hcl
# Mark outputs as sensitive
output "database_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}

# Use lifecycle to prevent sensitive attributes from appearing in plans
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    ignore_changes = [password]
  }
}
```

### Restricting State Access

Use the `read-outputs` permission level instead of full `read` when possible:

```hcl
resource "tfe_team_access" "limited_state" {
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.production.id

  permissions {
    runs           = "plan"
    variables      = "none"
    state_versions = "read-outputs"  # Can read outputs but not the full state
    workspace_locking = false
  }
}
```

## Troubleshooting State Issues

**"Error: Error locking state"**: Someone else is running an operation or a previous run did not release the lock. Check for active runs, then use force-unlock if needed.

**"Error: State serial mismatch"**: This happens when state was modified outside of the normal workflow. Pull the current state, increment the serial, and push it back.

**State shows resources that no longer exist**: Run `terraform refresh` (or `terraform apply -refresh-only`) to update state to match reality.

**State file too large**: Consider splitting your configuration into multiple workspaces. Each workspace has its own state, so the total resources are distributed.

**"Error: Unsupported state file format"**: The state was created with a newer version of Terraform than you are running. Update your Terraform version.

## Summary

State management in HCP Terraform is largely automated - you get encryption, locking, versioning, and access control out of the box. The main things you need to actively manage are: sharing state between workspaces using `tfe_outputs`, setting appropriate access permissions (prefer `read-outputs` over full `read`), and having a backup strategy. For edge cases, know how to use `terraform state mv`, `terraform import`, and state rollback procedures.

For more on state-related topics, see our guides on [using Terraform Cloud as a remote backend](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-cloud-as-remote-backend/view) and [migrating from local Terraform to HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-local-terraform-to-hcp-terraform/view).
