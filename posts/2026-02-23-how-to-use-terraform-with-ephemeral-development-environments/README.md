# How to Use Terraform with Ephemeral Development Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Ephemeral Environments, Development, Preview Environments, DevOps

Description: Learn how to use Terraform to create ephemeral development environments that spin up on demand and are automatically destroyed, providing developers with isolated testing environments.

---

Ephemeral development environments are short-lived infrastructure stacks that are created on demand and destroyed automatically when no longer needed. They give developers isolated environments for testing features, running integration tests, or demonstrating changes without competing for shared resources.

Terraform is an excellent tool for managing ephemeral environments because it can create and destroy complete infrastructure stacks predictably and repeatably.

## Designing Ephemeral Environment Architecture

```hcl
# modules/ephemeral-env/main.tf
# Complete ephemeral environment module

variable "branch_name" {
  description = "Git branch name for this environment"
  type        = string
}

variable "developer" {
  description = "Developer who requested this environment"
  type        = string
}

variable "ttl_hours" {
  description = "Hours before auto-destruction"
  type        = number
  default     = 8
}

locals {
  # Generate a safe environment name from branch
  env_name = replace(
    lower(substr(var.branch_name, 0, 30)),
    "/[^a-z0-9-]/", "-"
  )

  destroy_at = timeadd(timestamp(), "${var.ttl_hours}h")

  common_tags = {
    Environment = "ephemeral"
    Branch      = var.branch_name
    Developer   = var.developer
    DestroyAt   = local.destroy_at
    ManagedBy   = "terraform"
  }
}

# Lightweight compute for ephemeral env
resource "aws_ecs_service" "app" {
  name            = "ephemeral-${local.env_name}"
  cluster         = data.aws_ecs_cluster.shared.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.shared.ids
    security_groups = [aws_security_group.ephemeral.id]
  }

  tags = local.common_tags
}

# Lightweight database (shared RDS with separate schema)
resource "null_resource" "database_setup" {
  triggers = {
    env_name = local.env_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      PGPASSWORD=$DB_ADMIN_PASSWORD psql \
        -h ${data.aws_db_instance.shared.address} \
        -U admin \
        -c "CREATE DATABASE ephemeral_${replace(local.env_name, "-", "_")};"
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      PGPASSWORD=$DB_ADMIN_PASSWORD psql \
        -h ${data.aws_db_instance.shared.address} \
        -U admin \
        -c "DROP DATABASE IF EXISTS ephemeral_${replace(self.triggers.env_name, "-", "_")};"
    EOT
  }
}

output "environment_url" {
  value = "https://${local.env_name}.preview.example.com"
}
```

## Automating Environment Creation from PRs

```yaml
# .github/workflows/ephemeral-env.yaml
name: Ephemeral Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  create:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Ephemeral Environment
        working-directory: infrastructure/ephemeral
        run: |
          terraform init
          terraform workspace select "pr-${{ github.event.pull_request.number }}" || \
            terraform workspace new "pr-${{ github.event.pull_request.number }}"
          terraform apply -auto-approve \
            -var="branch_name=${{ github.head_ref }}" \
            -var="developer=${{ github.actor }}" \
            -var="ttl_hours=24"

      - name: Post URL to PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `Preview environment deployed! URL: https://pr-${context.issue.number}.preview.example.com`
            });

  destroy:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Destroy Ephemeral Environment
        working-directory: infrastructure/ephemeral
        run: |
          terraform init
          terraform workspace select "pr-${{ github.event.pull_request.number }}"
          terraform destroy -auto-approve
          terraform workspace select default
          terraform workspace delete "pr-${{ github.event.pull_request.number }}"
```

## Auto-Destruction for Cost Control

Ensure ephemeral environments do not run indefinitely:

```yaml
# .github/workflows/cleanup-ephemeral.yaml
name: Cleanup Expired Environments

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Find and Destroy Expired Environments
        run: |
          python scripts/cleanup-ephemeral.py
```

```python
# scripts/cleanup-ephemeral.py
# Find and destroy expired ephemeral environments

import boto3
import subprocess
from datetime import datetime, timezone

def find_expired_environments():
    """Find ephemeral environments past their TTL."""
    ec2 = boto3.client("ec2")

    # Find resources tagged as ephemeral with expired TTL
    response = ec2.describe_instances(Filters=[
        {"Name": "tag:Environment", "Values": ["ephemeral"]},
        {"Name": "instance-state-name", "Values": ["running"]}
    ])

    expired = []
    now = datetime.now(timezone.utc)

    for reservation in response["Reservations"]:
        for instance in reservation["Instances"]:
            tags = {t["Key"]: t["Value"] for t in instance.get("Tags", [])}
            destroy_at = tags.get("DestroyAt")
            if destroy_at and datetime.fromisoformat(destroy_at) < now:
                expired.append({
                    "workspace": tags.get("Branch", "unknown"),
                    "instance_id": instance["InstanceId"]
                })

    return expired

def destroy_environment(workspace):
    """Destroy an ephemeral environment."""
    subprocess.run([
        "terraform", "workspace", "select", workspace
    ], check=True)
    subprocess.run([
        "terraform", "destroy", "-auto-approve"
    ], check=True)

if __name__ == "__main__":
    expired = find_expired_environments()
    for env in expired:
        print(f"Destroying expired environment: {env['workspace']}")
        destroy_environment(env["workspace"])
```

## Cost Optimization for Ephemeral Environments

Use smaller resource sizes and shared infrastructure to minimize costs:

```hcl
# modules/ephemeral-env/cost-optimized.tf
# Cost-optimized resources for ephemeral environments

locals {
  # Ephemeral environments use minimal resources
  cpu    = 256   # 0.25 vCPU
  memory = 512   # 512 MB

  # Share resources where possible
  use_shared_alb      = true
  use_shared_database = true
  use_shared_cluster  = true
}

# Use spot instances for non-critical ephemeral compute
resource "aws_ecs_service" "app" {
  name            = "ephemeral-${local.env_name}"
  cluster         = data.aws_ecs_cluster.shared.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }

  network_configuration {
    subnets         = data.aws_subnets.shared.ids
    security_groups = [aws_security_group.ephemeral.id]
  }
}
```

## Best Practices

Keep ephemeral environments small. They should have just enough infrastructure to test the feature, not a full replica of production.

Set aggressive TTLs. Default to 8-24 hours and require manual extension. This prevents forgotten environments from accumulating costs.

Use shared infrastructure where possible. Shared ALBs, ECS clusters, and databases reduce the per-environment cost.

Automate everything. Environment creation, destruction, and cleanup should be fully automated to reduce operational burden.

Tag everything with the environment identifier. This makes cost tracking and cleanup straightforward.

## Conclusion

Ephemeral development environments with Terraform provide developers with isolated, production-like environments for testing without the cost and complexity of permanent infrastructure. By automating creation from pull requests, implementing auto-destruction, and optimizing costs through shared infrastructure, you can offer a premium developer experience while keeping costs under control.
