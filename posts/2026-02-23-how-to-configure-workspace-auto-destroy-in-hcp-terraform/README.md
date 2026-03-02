# How to Configure Workspace Auto-Destroy in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Auto-Destroy, Cost Management, Workspace

Description: Configure workspace auto-destroy in HCP Terraform to automatically tear down temporary infrastructure and control cloud costs.

---

Temporary infrastructure has a way of sticking around long after it is needed. Dev environments, testing stacks, demo infrastructure - they all cost money when left running. HCP Terraform's auto-destroy feature solves this by automatically destroying resources in a workspace after a specified time. This post walks through setting it up and the patterns that work best.

## What Auto-Destroy Does

When you enable auto-destroy on a workspace, HCP Terraform schedules a destroy run at a future date and time. When that time arrives, it runs `terraform destroy` automatically, tearing down all resources managed by that workspace. The workspace itself remains intact - only the resources are destroyed.

This is different from deleting a workspace. Auto-destroy keeps the workspace, its configuration, variables, and state history. You can re-create the resources at any time by triggering a new run.

## Enabling Auto-Destroy via the UI

The simplest way to configure auto-destroy:

1. Navigate to your workspace in HCP Terraform
2. Go to **Settings** > **Destruction and Deletion**
3. Under **Auto-destroy**, toggle it on
4. Set the date and time for destruction
5. Click **Save**

The UI shows a countdown timer so you can always see when the workspace is scheduled for destruction.

## Enabling Auto-Destroy via the API

For automation, use the API to set auto-destroy when creating or updating workspaces:

```bash
# Enable auto-destroy on an existing workspace
# Set it to destroy 48 hours from now
DESTROY_AT=$(date -u -d "+48 hours" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"auto-destroy-at\": \"$DESTROY_AT\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/dev-testing"
```

```bash
# Create a new workspace with auto-destroy already configured
DESTROY_AT=$(date -u -d "+24 hours" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"feature-branch-testing\",
        \"auto-destroy-at\": \"$DESTROY_AT\",
        \"auto-apply\": true,
        \"execution-mode\": \"remote\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces"
```

## Auto-Destroy with Activity-Based Duration

Instead of setting a fixed date, you can configure auto-destroy based on workspace inactivity. This means the countdown resets every time a run completes:

```bash
# Set auto-destroy to trigger 72 hours after the last run
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-destroy-activity-duration": "72h"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/dev-testing"
```

Activity-based duration is better for workspaces that are actively being used. The environment stays alive as long as someone is working with it, and auto-destroys only after a period of inactivity.

## Use Case: Ephemeral Development Environments

The most common use case is spinning up per-developer or per-feature-branch environments that clean up after themselves:

```hcl
# dev-environment/main.tf
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      tags = ["ephemeral", "dev"]
    }
  }
}

variable "developer_name" {
  type        = string
  description = "Name of the developer this environment belongs to"
}

# Create a complete dev environment
resource "aws_instance" "dev_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name        = "dev-${var.developer_name}"
    Environment = "development"
    AutoDestroy = "true"
  }
}

resource "aws_db_instance" "dev_db" {
  identifier     = "dev-${var.developer_name}"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  db_name        = "devdb"
  username       = "devuser"
  password       = "temporary-dev-password"

  skip_final_snapshot = true  # Important for auto-destroy

  tags = {
    Name        = "dev-db-${var.developer_name}"
    Environment = "development"
  }
}
```

Note the `skip_final_snapshot = true` on the database. Without this, the destroy will fail because RDS tries to create a final snapshot.

## Automating Ephemeral Workspace Creation

Combine workspace creation with auto-destroy in a script:

```bash
#!/bin/bash
# create-dev-env.sh
# Creates an ephemeral dev environment that auto-destroys after 8 hours

DEVELOPER=$1
ORG="my-company"
WORKSPACE_NAME="dev-${DEVELOPER}-$(date +%Y%m%d)"
DESTROY_AT=$(date -u -d "+8 hours" +%Y-%m-%dT%H:%M:%SZ)

# Create the workspace with auto-destroy
WORKSPACE_ID=$(curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"$WORKSPACE_NAME\",
        \"auto-destroy-at\": \"$DESTROY_AT\",
        \"auto-apply\": true,
        \"execution-mode\": \"remote\",
        \"working-directory\": \"dev-environment\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/$ORG/workspaces" | \
  jq -r '.data.id')

echo "Created workspace: $WORKSPACE_NAME (ID: $WORKSPACE_ID)"
echo "Auto-destroy scheduled at: $DESTROY_AT"

# Set the developer name variable
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"vars\",
      \"attributes\": {
        \"key\": \"developer_name\",
        \"value\": \"$DEVELOPER\",
        \"category\": \"terraform\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"
```

```bash
# Usage
./create-dev-env.sh alice
# Created workspace: dev-alice-20260223 (ID: ws-abc123)
# Auto-destroy scheduled at: 2026-02-24T02:00:00Z
```

## Extending the Auto-Destroy Timer

If you need more time, you can push back the auto-destroy date:

```bash
# Extend auto-destroy by another 24 hours
NEW_DESTROY_AT=$(date -u -d "+24 hours" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"auto-destroy-at\": \"$NEW_DESTROY_AT\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/dev-alice-20260223"
```

## Disabling Auto-Destroy

To cancel a scheduled destruction:

```bash
# Remove the auto-destroy schedule
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-destroy-at": null
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/dev-alice-20260223"
```

## Notifications Before Destruction

Set up notifications to warn users before their environment is destroyed. Configure a webhook or Slack notification for the workspace:

```bash
# Create a notification configuration for destroy events
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "notification-configurations",
      "attributes": {
        "destination-type": "slack",
        "enabled": true,
        "name": "auto-destroy-warning",
        "url": "https://hooks.slack.com/services/T00/B00/xxx",
        "triggers": ["run:created", "run:planning", "run:completed"]
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/notification-configurations"
```

## Best Practices

**Always set `skip_final_snapshot` on databases.** Without this, the destroy run will fail because cloud providers try to create snapshots before deleting databases.

**Use activity-based duration for active development.** Fixed dates work for demos and one-time tests, but activity-based timers are more practical for ongoing development.

**Tag your resources.** Add tags like `AutoDestroy: true` and `ExpiresAt: 2026-02-24` to your cloud resources. This helps identify temporary infrastructure in your cloud console.

**Test the destroy first.** Before relying on auto-destroy, manually run `terraform destroy` in the workspace to make sure it completes successfully. Some resources have dependencies that prevent clean destruction.

## Cost Impact

Auto-destroy can save significant money. A single t3.large instance running 24/7 costs around $60/month. If developers create test environments and forget about them, costs add up fast. Auto-destroy ensures that temporary infrastructure has a defined lifetime.

Calculate your potential savings: count the number of temporary workspaces running right now, estimate their monthly cost, and compare that to what they would cost with auto-destroy limiting them to business hours or 48-hour lifetimes.

## Summary

Auto-destroy in HCP Terraform is a straightforward way to keep temporary infrastructure from becoming permanent cost. Set it up with a fixed date for one-time environments or use activity-based duration for development workspaces. Combine it with automated workspace creation for a self-service ephemeral environment system that keeps cloud costs under control.
