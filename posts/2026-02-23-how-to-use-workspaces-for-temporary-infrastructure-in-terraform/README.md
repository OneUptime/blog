# How to Use Workspaces for Temporary Infrastructure in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Temporary Infrastructure, Cost Optimization, DevOps

Description: Learn how to use Terraform workspaces to create short-lived infrastructure for demos, testing, and experiments with automatic cleanup.

---

Not all infrastructure is meant to last. Demo environments, load testing setups, training clusters, and experimental deployments all have a defined lifespan. Terraform workspaces are a natural fit for this kind of temporary infrastructure because each workspace maintains its own state, making it straightforward to create and completely destroy resources when they are no longer needed.

## The Pattern for Temporary Infrastructure

The core workflow is simple:

1. Create a workspace with a descriptive name
2. Apply your configuration to spin up resources
3. Use the infrastructure for its intended purpose
4. Destroy everything and delete the workspace

What makes this different from regular workspace usage is the emphasis on cleanup automation and cost controls. You need guardrails that prevent temporary infrastructure from becoming permanent infrastructure.

```bash
# Create a workspace for a customer demo
terraform workspace new demo-acme-corp-2026-02-23

# Apply the configuration
terraform apply -auto-approve

# ... use the demo environment ...

# When the demo is over, tear it all down
terraform destroy -auto-approve
terraform workspace select dev
terraform workspace delete demo-acme-corp-2026-02-23
```

## Designing Configuration for Temporary Use

Your Terraform configuration should recognize temporary workspaces and adjust accordingly. Temporary environments should use smaller instances, skip backups, and disable features that only matter for long-lived environments.

```hcl
# locals.tf
locals {
  # Convention: temporary workspaces start with specific prefixes
  temp_prefixes = ["demo-", "test-", "load-", "experiment-", "training-"]

  # Check if the current workspace is temporary
  is_temporary = anytrue([
    for prefix in local.temp_prefixes : startswith(terraform.workspace, prefix)
  ])

  # Generate a name prefix
  name_prefix = "myapp-${terraform.workspace}"

  # Set a TTL tag for automated cleanup
  # Extract date from workspace name if it follows the naming convention
  ttl_hours = local.is_temporary ? 48 : 0
}
```

Now apply these settings to your resources:

```hcl
# compute.tf
resource "aws_instance" "app" {
  # Use smaller instances for temporary environments
  instance_type = local.is_temporary ? "t3.micro" : var.instance_type
  ami           = data.aws_ami.app.id

  # Single instance for temp, multiple for permanent
  count = local.is_temporary ? 1 : var.instance_count

  subnet_id = aws_subnet.main[0].id

  # No detailed monitoring for temporary instances
  monitoring = local.is_temporary ? false : true

  tags = {
    Name        = "${local.name_prefix}-app-${count.index}"
    Environment = terraform.workspace
    Temporary   = tostring(local.is_temporary)
    # CreatedAt tag helps identify stale resources
    CreatedAt   = timestamp()
  }

  lifecycle {
    ignore_changes = [tags["CreatedAt"]]
  }
}

# database.tf
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  # Smaller RDS for temp environments
  instance_class        = local.is_temporary ? "db.t3.micro" : var.db_instance_class
  allocated_storage     = local.is_temporary ? 20 : var.db_storage

  # Skip final snapshot for temporary databases
  skip_final_snapshot   = local.is_temporary
  final_snapshot_identifier = local.is_temporary ? null : "${local.name_prefix}-final"

  # No backups for temporary databases
  backup_retention_period = local.is_temporary ? 0 : 7

  # No multi-AZ for temporary environments
  multi_az = local.is_temporary ? false : var.multi_az

  # Deletion protection off for temporary environments
  deletion_protection = local.is_temporary ? false : true

  tags = {
    Name        = "${local.name_prefix}-db"
    Temporary   = tostring(local.is_temporary)
  }
}
```

## Automated Lifecycle Management

The biggest risk with temporary infrastructure is forgetting to clean it up. You need automated processes to catch abandoned environments.

### Tagging for Cleanup

```hcl
# tags.tf
locals {
  # Standard tags applied to all resources
  common_tags = merge(
    {
      ManagedBy   = "terraform"
      Workspace   = terraform.workspace
      Project     = "myapp"
    },
    local.is_temporary ? {
      Temporary   = "true"
      ExpireAfter = timeadd(timestamp(), "${local.ttl_hours}h")
      CreatedBy   = var.creator_email
    } : {
      Temporary = "false"
    }
  )
}

variable "creator_email" {
  description = "Email of the person creating this environment"
  type        = string
  default     = "unknown"
}
```

### Cleanup Script

```bash
#!/bin/bash
# cleanup-expired-workspaces.sh
# Run this on a schedule (daily via cron or scheduled CI job)

set -e

echo "Scanning for expired temporary workspaces..."
CURRENT_TIME=$(date +%s)

# Get all workspaces
terraform workspace list | tr -d ' *' | while read -r ws; do
  # Check if it matches a temporary prefix
  if [[ "$ws" == demo-* || "$ws" == test-* || "$ws" == load-* || \
        "$ws" == experiment-* || "$ws" == training-* ]]; then

    echo "Checking workspace: $ws"
    terraform workspace select "$ws"

    # Get the state and check for resources
    resource_count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

    if [ "$resource_count" -eq 0 ]; then
      echo "  Empty workspace - deleting"
      terraform workspace select default
      terraform workspace delete "$ws"
      continue
    fi

    # Check the state serial and last modification
    state_info=$(terraform state pull)

    echo "  Resources: $resource_count"
    echo "  Flagged for review - check if still needed"

    # Optional: auto-destroy if workspace name contains a date
    # and that date has passed
    if [[ "$ws" =~ [0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
      ws_date="${BASH_REMATCH[0]}"
      ws_epoch=$(date -d "$ws_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$ws_date" +%s 2>/dev/null)

      # If the date in the workspace name is more than 2 days ago
      age_days=$(( (CURRENT_TIME - ws_epoch) / 86400 ))
      if [ "$age_days" -gt 2 ]; then
        echo "  EXPIRED ($age_days days old) - destroying"
        terraform destroy -auto-approve
        terraform workspace select default
        terraform workspace delete "$ws"
      fi
    fi
  fi
done

echo "Cleanup complete."
```

## Use Case: Demo Environments

Sales teams often need demo environments that showcase your product. Here is how to set one up quickly:

```bash
#!/bin/bash
# create-demo.sh
# Usage: ./create-demo.sh <customer-name> <creator-email>

CUSTOMER=$1
EMAIL=$2
DATE=$(date +%Y-%m-%d)
WS_NAME="demo-${CUSTOMER}-${DATE}"

# Create the workspace
terraform workspace new "$WS_NAME"

# Apply with demo-specific variables
terraform apply \
  -var="creator_email=${EMAIL}" \
  -var="enable_sample_data=true" \
  -auto-approve

# Print the access information
echo ""
echo "=== Demo Environment Ready ==="
echo "Workspace: $WS_NAME"
echo "App URL: $(terraform output -raw app_url)"
echo "Expires: $(date -d '+2 days' +%Y-%m-%d)"
echo ""
echo "To clean up: ./destroy-demo.sh $WS_NAME"
```

```hcl
# demo.tf - Resources only created for demo workspaces
variable "enable_sample_data" {
  description = "Whether to load sample data"
  type        = bool
  default     = false
}

resource "null_resource" "load_sample_data" {
  count = var.enable_sample_data ? 1 : 0

  depends_on = [aws_db_instance.main]

  provisioner "local-exec" {
    command = <<-EOT
      # Load sample data into the demo database
      psql "${aws_db_instance.main.endpoint}" \
        -U "${var.db_username}" \
        -f ./scripts/sample-data.sql
    EOT

    environment = {
      PGPASSWORD = var.db_password
    }
  }
}
```

## Use Case: Load Testing Environments

Load testing requires infrastructure that matches production but only needs to exist during the test window:

```hcl
# load_test.tf
locals {
  is_load_test = startswith(terraform.workspace, "load-")
}

# For load tests, create infrastructure that matches production sizing
resource "aws_instance" "load_test_targets" {
  count = local.is_load_test ? var.prod_instance_count : 0

  # Match production instance type for realistic results
  instance_type = var.prod_instance_type
  ami           = data.aws_ami.app.id
  subnet_id     = aws_subnet.private[count.index % length(aws_subnet.private)].id

  tags = {
    Name     = "${local.name_prefix}-load-target-${count.index}"
    Purpose  = "load-testing"
    Temporary = "true"
  }
}

# Use spot instances for load generators to save costs
resource "aws_spot_instance_request" "load_generators" {
  count = local.is_load_test ? 5 : 0

  ami                  = data.aws_ami.load_generator.id
  instance_type        = "c5.xlarge"
  spot_price           = "0.10"
  wait_for_fulfillment = true

  user_data = <<-EOF
    #!/bin/bash
    # Install and configure load testing tools
    apt-get update && apt-get install -y k6

    # Pull the test scripts
    aws s3 cp s3://my-load-tests/scripts/ /opt/load-tests/ --recursive
  EOF

  tags = {
    Name     = "${local.name_prefix}-load-gen-${count.index}"
    Purpose  = "load-testing"
    Temporary = "true"
  }
}
```

## Integrating With Slack Notifications

Keep your team informed about temporary environments:

```hcl
# notifications.tf
resource "null_resource" "slack_notification" {
  count = local.is_temporary ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        -d '{
          "text": "Temporary environment created",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*New Temporary Environment*\nWorkspace: `${terraform.workspace}`\nCreated by: ${var.creator_email}\nURL: ${aws_lb.main.dns_name}"
              }
            }
          ]
        }'
    EOT

    environment = {
      SLACK_WEBHOOK = var.slack_webhook_url
    }
  }
}
```

## Budget Alerts for Temporary Workspaces

Set up AWS Budget alerts to catch runaway costs from forgotten temporary environments:

```hcl
# budget.tf
resource "aws_budgets_budget" "temporary_envs" {
  name         = "temporary-environments-budget"
  budget_type  = "COST"
  limit_amount = "100"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Temporary$true"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["infrastructure-team@example.com"]
  }
}
```

## Summary

Terraform workspaces make temporary infrastructure manageable. The keys to success are a clear naming convention, configuration that adapts to temporary contexts, and automated cleanup to prevent cost surprises. Combine workspace-based temporary environments with proper tagging and scheduled cleanup scripts, and you will have a system that lets anyone on your team spin up what they need without worrying about lingering resources. For related patterns, see our post on [using workspaces for testing infrastructure changes](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspaces-for-testing-infrastructure-changes/view).
