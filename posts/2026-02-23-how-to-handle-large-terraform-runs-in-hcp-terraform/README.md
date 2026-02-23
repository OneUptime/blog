# How to Handle Large Terraform Runs in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Performance, Large Infrastructure, Optimization, DevOps

Description: Strategies for handling large Terraform runs in HCP Terraform including splitting configurations, optimizing state, and managing timeouts.

---

Large Terraform configurations are a fact of life for organizations managing significant infrastructure. When your state file has thousands of resources, a single plan can take 30 minutes or more, and you start hitting timeouts, memory limits, and general frustration. HCP Terraform can handle large workloads, but you need to structure things properly.

This guide covers practical strategies for managing large Terraform runs, from prevention (splitting configurations) to optimization (reducing plan times) to workarounds (when you cannot avoid a large monolith).

## Recognizing the Problem

You know your Terraform runs are "large" when:

- Plans take more than 10 minutes
- State files are larger than 10 MB
- You manage more than 500 resources in a single workspace
- Applies frequently timeout
- `terraform refresh` alone takes several minutes
- Your team avoids making changes because runs take too long

## Strategy 1: Split Into Multiple Workspaces

The most effective long-term solution is splitting a large configuration into smaller, focused workspaces. Each workspace manages a logical group of resources:

```
# Before: One monolith workspace managing everything
monolith-workspace/
  networking.tf       # VPCs, subnets, routes
  compute.tf          # EC2 instances, ASGs
  database.tf         # RDS, ElastiCache
  monitoring.tf       # CloudWatch, SNS
  iam.tf              # IAM roles, policies
  # 2000+ resources, 45-minute plans

# After: Split into focused workspaces
networking/           # ~100 resources, 2-minute plans
  main.tf
  variables.tf
  outputs.tf

compute/              # ~300 resources, 5-minute plans
  main.tf
  variables.tf
  outputs.tf

database/             # ~50 resources, 1-minute plans
  main.tf
  variables.tf
  outputs.tf

monitoring/           # ~200 resources, 3-minute plans
  main.tf
  variables.tf
  outputs.tf
```

### Sharing Data Between Workspaces

Use `tfe_outputs` or `terraform_remote_state` to share information between workspaces:

```hcl
# In the compute workspace - read outputs from networking
data "tfe_outputs" "networking" {
  organization = "your-org"
  workspace    = "production-networking"
}

resource "aws_instance" "app" {
  subnet_id = data.tfe_outputs.networking.values.private_subnet_ids[0]
  vpc_security_group_ids = [
    data.tfe_outputs.networking.values.app_security_group_id
  ]
  # ...
}
```

### Using Run Triggers for Dependencies

When workspace B depends on workspace A, set up run triggers:

```hcl
resource "tfe_run_trigger" "compute_after_networking" {
  workspace_id  = tfe_workspace.compute.id
  sourceable_id = tfe_workspace.networking.id
}
```

## Strategy 2: Optimize Your Configuration

Before splitting, see if you can reduce the overhead of your current configuration:

### Reduce Provider Calls

Each provider API call during refresh adds time. Use `ignore_changes` for attributes you know are managed elsewhere:

```hcl
resource "aws_autoscaling_group" "app" {
  # ...

  lifecycle {
    # Don't check these on every plan
    ignore_changes = [
      desired_capacity,  # Managed by auto-scaling policies
      target_group_arns, # Managed by ALB attachment resources
    ]
  }
}
```

### Use Data Sources Sparingly

Every `data` source makes an API call during refresh. If you reference the same data in multiple places, fetch it once:

```hcl
# Bad: Multiple data source calls for the same information
data "aws_vpc" "main" { ... }      # Called in networking.tf
data "aws_vpc" "main_v2" { ... }   # Called again in security.tf

# Good: Fetch once and reference the local
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

locals {
  vpc_id   = data.aws_vpc.main.id
  vpc_cidr = data.aws_vpc.main.cidr_block
}

# Reference locals everywhere
resource "aws_security_group" "app" {
  vpc_id = local.vpc_id
  # ...
}
```

### Use -refresh=false When Appropriate

During iterative development, skip the refresh phase to speed up plans:

```bash
# Skip refresh - uses cached state
terraform plan -refresh=false

# Useful for testing configuration changes
# without waiting for all API calls
```

### Increase Parallelism

Terraform defaults to 10 concurrent operations. For large configurations with many independent resources, increase it:

```bash
# Increase parallelism for faster plans
terraform plan -parallelism=30

# Set as an environment variable in the workspace
# Key: TF_CLI_ARGS_plan
# Value: -parallelism=30
```

## Strategy 3: Manage State Size

Large state files slow down every operation because they need to be downloaded, parsed, and uploaded on every run.

### Remove Unmanaged Resources

Clean up resources that are no longer needed:

```bash
# List all resources in state
terraform state list | wc -l
# If this number is higher than expected, investigate

# Remove resources that should not be managed
terraform state rm aws_cloudwatch_log_group.old_app
```

### Move Resources Between Workspaces

When splitting workspaces, use `terraform state mv` to move resources:

```bash
# Step 1: Pull the full state
terraform state pull > full-state.json

# Step 2: In the new workspace, import the resources
# Option A: Use terraform import
terraform import aws_instance.web i-1234567890abcdef0

# Option B: Use moved blocks (Terraform 1.1+)
# In the new configuration:
moved {
  from = module.old_module.aws_instance.web
  to   = aws_instance.web
}
```

### State File Analysis

Check your state file size and composition:

```bash
# Download and analyze state
terraform state pull > state.json

# Check the file size
ls -lh state.json

# Count resources by type
cat state.json | jq -r '.resources[].type' | sort | uniq -c | sort -rn | head -20

# Output might look like:
#  450 aws_security_group_rule
#  200 aws_route53_record
#  150 aws_iam_policy_document
#   80 aws_cloudwatch_metric_alarm
#   50 aws_instance
```

If you see hundreds of resources of one type, that is a candidate for splitting into its own workspace.

## Strategy 4: Handle Timeouts

HCP Terraform has execution timeouts. For very large runs, you may need to adjust:

### Plan Timeout

The default plan timeout in HCP Terraform is 2 hours. If your plans regularly exceed this, that is a strong signal to split your configuration.

### Apply Timeout

Applies also have a 2-hour timeout by default. For infrastructure with long provisioning times (like RDS instances or EKS clusters), this can be tight.

### Working Around Timeouts

```hcl
# Use create_before_destroy for resources that take long to create
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    create_before_destroy = true
  }

  timeouts {
    create = "60m"
    update = "60m"
    delete = "30m"
  }
}
```

### Targeted Applies

When a full apply would timeout, use targeted applies:

```bash
# Apply only specific resources
terraform apply -target=module.networking
terraform apply -target=module.database
terraform apply -target=module.compute
```

## Strategy 5: Use Agent-Based Execution for Better Performance

If your runs are slow because of network latency to your cloud provider, running agents closer to your infrastructure can help:

```hcl
# Use agents in the same region as your infrastructure
resource "tfe_workspace" "large_workspace" {
  name           = "large-infrastructure"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.same_region.id
}
```

Agents running in the same AWS region as your infrastructure have lower API latency, which makes refresh operations faster.

## Strategy 6: Configuration Upload Optimization

Large repositories can slow down the configuration upload to HCP Terraform:

```
# .terraformignore - Exclude unnecessary files from upload
.git/
.terraform/
*.tfstate
*.tfstate.*
docs/
tests/
*.md
*.png
*.jpg
node_modules/
vendor/
.DS_Store
```

## Monitoring Run Performance

Track run times to identify when you need to intervene:

```bash
#!/bin/bash
# run-performance.sh - Analyze run times for a workspace

WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/runs?page[size]=20" \
  | jq '.data[] | {
    id: .id,
    status: .attributes.status,
    created: .attributes["created-at"],
    plan_duration: .attributes["status-timestamps"] |
      if .["planned-at"] and .["planning-at"] then
        "computed"
      else
        "n/a"
      end,
    additions: .attributes["resource-additions"],
    changes: .attributes["resource-changes"],
    destructions: .attributes["resource-destructions"]
  }'
```

## Summary

Handling large Terraform runs comes down to two approaches: make them smaller, or make them faster. Splitting large configurations into focused workspaces is the most sustainable solution. When splitting is not immediately feasible, optimize your configuration by reducing unnecessary data sources, increasing parallelism, and using lifecycle rules. Monitor your run times so you know when performance is degrading, and address it before it becomes a blocker.

For more on workspace organization, see our guides on [using projects for organization](https://oneuptime.com/blog/post/2026-02-23-how-to-use-projects-in-hcp-terraform-for-organization/view) and [workspace tags](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-tags-for-organization-in-hcp-terraform/view).
