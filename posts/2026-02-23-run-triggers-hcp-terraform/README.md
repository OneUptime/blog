# How to Configure Run Triggers in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Run Triggers, Automation, DevOps

Description: Learn how to set up run triggers in HCP Terraform to automatically chain workspace runs, ensuring dependent infrastructure stays in sync after upstream changes.

---

Run triggers in HCP Terraform let you automatically start a run in one workspace when another workspace completes a successful apply. This is how you handle dependencies between infrastructure components. When your networking workspace deploys a new subnet, the compute workspace that uses those subnets can automatically plan and apply to pick up the changes.

This guide covers how to set up run triggers, common patterns, and how to avoid cascading failures.

## How Run Triggers Work

The concept is simple:

1. Workspace A (the source) completes a successful apply
2. HCP Terraform automatically queues a run in Workspace B (the target)
3. Workspace B plans against its current configuration with updated remote state
4. If auto-apply is enabled on Workspace B, it applies automatically

The triggered run in Workspace B is a normal run - it goes through plan, policy checks, cost estimation, and apply just like any other run. The only difference is that it was triggered by another workspace rather than by a VCS push or manual action.

## Setting Up Run Triggers via the UI

1. Navigate to the target workspace (the one that should run after another workspace applies)
2. Go to **Settings** > **Run Triggers**
3. Search for and select the source workspace
4. Click **Add workspace**

That is it. Now every successful apply in the source workspace triggers a run in the target workspace.

## Setting Up Run Triggers with the tfe Provider

```hcl
# Source workspace: networking
resource "tfe_workspace" "networking" {
  name         = "production-networking"
  organization = var.organization
}

# Target workspace: compute
resource "tfe_workspace" "compute" {
  name         = "production-compute"
  organization = var.organization
}

# When networking applies successfully, trigger a compute run
resource "tfe_run_trigger" "compute_after_networking" {
  workspace_id  = tfe_workspace.compute.id        # Target
  sourceable_id = tfe_workspace.networking.id      # Source
}
```

## Setting Up Run Triggers via the API

```bash
# Create a run trigger
# Target workspace: ws-compute123
# Source workspace: ws-networking456

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "run-triggers",
      "relationships": {
        "sourceable": {
          "data": {
            "type": "workspaces",
            "id": "ws-networking456"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-compute123/run-triggers"
```

## Common Dependency Chains

### Infrastructure Layers

The most common pattern chains infrastructure layers from foundation to application:

```text
Foundation (VPC, subnets, DNS zones)
  |
  v
Platform (EKS cluster, RDS, ElastiCache)
  |
  v
Application (ECS services, Lambda functions)
  |
  v
Monitoring (CloudWatch dashboards, alarms)
```

```hcl
# Foundation -> Platform
resource "tfe_run_trigger" "platform_after_foundation" {
  workspace_id  = tfe_workspace.platform.id
  sourceable_id = tfe_workspace.foundation.id
}

# Platform -> Application
resource "tfe_run_trigger" "app_after_platform" {
  workspace_id  = tfe_workspace.application.id
  sourceable_id = tfe_workspace.platform.id
}

# Application -> Monitoring
resource "tfe_run_trigger" "monitoring_after_app" {
  workspace_id  = tfe_workspace.monitoring.id
  sourceable_id = tfe_workspace.application.id
}
```

### Shared Services

When a shared service changes, all consumers should update:

```text
Shared Services (ACM certs, Route53 zones, IAM roles)
  |
  +--> Service A workspace
  +--> Service B workspace
  +--> Service C workspace
```

```hcl
# Shared services triggers all service workspaces
resource "tfe_run_trigger" "service_a_after_shared" {
  workspace_id  = tfe_workspace.service_a.id
  sourceable_id = tfe_workspace.shared_services.id
}

resource "tfe_run_trigger" "service_b_after_shared" {
  workspace_id  = tfe_workspace.service_b.id
  sourceable_id = tfe_workspace.shared_services.id
}

resource "tfe_run_trigger" "service_c_after_shared" {
  workspace_id  = tfe_workspace.service_c.id
  sourceable_id = tfe_workspace.shared_services.id
}
```

### Multi-Region Deployments

When primary region infrastructure changes, secondary regions update:

```hcl
# Primary region applies trigger secondary region updates
resource "tfe_run_trigger" "secondary_after_primary" {
  workspace_id  = tfe_workspace.us_west_2.id
  sourceable_id = tfe_workspace.us_east_1.id
}

resource "tfe_run_trigger" "eu_after_primary" {
  workspace_id  = tfe_workspace.eu_west_1.id
  sourceable_id = tfe_workspace.us_east_1.id
}
```

## Using Remote State with Run Triggers

Run triggers are most useful when the target workspace reads data from the source workspace's state:

```hcl
# In the compute workspace, reference networking outputs
data "terraform_remote_state" "networking" {
  backend = "remote"
  config = {
    organization = "acme-infrastructure"
    workspaces = {
      name = "production-networking"
    }
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  # Use subnet from the networking workspace
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.app_security_group_id
  ]
}
```

Alternatively, use `tfe_outputs` data source:

```hcl
data "tfe_outputs" "networking" {
  organization = "acme-infrastructure"
  workspace    = "production-networking"
}

resource "aws_instance" "app" {
  subnet_id = data.tfe_outputs.networking.values.private_subnet_ids[0]
}
```

When the networking workspace applies and changes outputs, the run trigger fires the compute workspace. The compute workspace's plan reads the updated outputs and adjusts accordingly.

## Managing Trigger Chains

### Preventing Cascading Failures

If a source workspace fails, no trigger fires. Only successful applies trigger downstream runs. This is built-in protection against cascading failures.

However, if a downstream workspace fails after being triggered, it does not prevent further downstream triggers. To handle this:

1. Keep auto-apply disabled on critical workspaces
2. Set up notifications for failed runs
3. Review the plan before confirming triggered runs in production

### Limiting Trigger Depth

Deep trigger chains (A -> B -> C -> D -> E) take a long time to complete. Each step must plan, potentially wait for approval, and apply. Consider:

- Keeping chains to 3-4 levels deep
- Combining workspaces if the chain is too long
- Using parallel triggers instead of sequential ones when dependencies allow it

### Multiple Sources

A workspace can have multiple source triggers:

```hcl
# Application workspace triggers when either networking OR platform changes
resource "tfe_run_trigger" "app_after_networking" {
  workspace_id  = tfe_workspace.application.id
  sourceable_id = tfe_workspace.networking.id
}

resource "tfe_run_trigger" "app_after_platform" {
  workspace_id  = tfe_workspace.application.id
  sourceable_id = tfe_workspace.platform.id
}
```

If both networking and platform apply at the same time, the application workspace queues two runs. The second run waits for the first to complete before starting.

## Listing and Removing Triggers

### List triggers on a workspace

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/ws-compute123/run-triggers?filter%5Brun-trigger%5D%5Btype%5D=inbound"
```

### Remove a trigger

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  "https://app.terraform.io/api/v2/run-triggers/rt-trigger789"
```

## Wrapping Up

Run triggers are the glue between workspace dependencies. They ensure that when upstream infrastructure changes, downstream workspaces plan and apply to stay in sync. Set them up between infrastructure layers, from shared services to consumers, and across regions. Keep chains short, use auto-apply thoughtfully, and always have notifications configured for failures. Combined with remote state data sources, run triggers create an automated infrastructure pipeline that flows from foundation to application.
