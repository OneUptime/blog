# How to Use Terraform with Runbook Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Runbook, Automation, DevOps, Infrastructure as Code, Incident Response

Description: Learn how to integrate Terraform with runbook automation tools to create self-executing operational procedures that provision and modify infrastructure automatically.

---

Runbooks document the step-by-step procedures that operations teams follow during incidents, maintenance windows, and routine tasks. When you integrate Terraform with runbook automation, these procedures become executable. Instead of an engineer reading steps from a wiki and typing commands, the runbook itself calls Terraform to make the necessary infrastructure changes. This reduces human error, speeds up response times, and ensures procedures are followed consistently.

In this guide, we will explore how to build automated runbooks that use Terraform as their execution engine. You will learn how to structure Terraform configurations for runbook use, integrate with runbook platforms, and build self-healing infrastructure patterns.

## Why Automate Runbooks with Terraform

Manual runbooks have several problems. They go stale because nobody updates them after infrastructure changes. Engineers skip steps under pressure during incidents. And the same procedure might be executed differently by different people.

Automated runbooks solve these problems because the procedure is code. When infrastructure changes, the runbook code changes with it. The procedure runs the same way every time, regardless of who triggers it. And execution is fast because there is no time spent reading and interpreting instructions.

## Structuring Terraform for Runbook Operations

Runbook operations typically modify existing infrastructure rather than creating new resources from scratch. Structure your Terraform configurations so that runbook-triggered changes are clean and predictable.

```hcl
# runbooks/scale-web-tier/main.tf
# Runbook: Scale the web tier up or down

variable "action" {
  description = "Scaling action to perform"
  type        = string

  validation {
    condition     = contains(["scale_up", "scale_down", "scale_to"], var.action)
    error_message = "Action must be scale_up, scale_down, or scale_to."
  }
}

variable "target_count" {
  description = "Target instance count (used with scale_to action)"
  type        = number
  default     = 0
}

variable "scale_increment" {
  description = "Number of instances to add or remove"
  type        = number
  default     = 2
}

# Read current state
data "aws_autoscaling_group" "web" {
  name = "web-tier-production"
}

locals {
  current_capacity = data.aws_autoscaling_group.web.desired_capacity

  new_capacity = (
    var.action == "scale_up" ? local.current_capacity + var.scale_increment :
    var.action == "scale_down" ? max(2, local.current_capacity - var.scale_increment) :
    var.target_count
  )
}

resource "aws_autoscaling_group" "web" {
  name                = "web-tier-production"
  desired_capacity    = local.new_capacity
  min_size            = 2
  max_size            = 50
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = data.aws_launch_template.web.id
    version = "$Latest"
  }

  lifecycle {
    # Only manage the desired_capacity, ignore other attributes
    ignore_changes = [
      launch_template,
      min_size,
      max_size,
      vpc_zone_identifier
    ]
  }
}

output "scaling_result" {
  value = {
    previous_capacity = local.current_capacity
    new_capacity      = local.new_capacity
    action            = var.action
    timestamp         = timestamp()
  }
}
```

## Building a Runbook Executor

Create a service that runs Terraform-based runbooks with proper logging and error handling.

```python
#!/usr/bin/env python3
# runbook_executor.py - Execute Terraform-based runbooks

import json
import subprocess
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("runbook-executor")

class RunbookExecutor:
    """Execute Terraform-based runbooks with full audit logging."""

    def __init__(self, runbooks_dir, state_backend="s3"):
        self.runbooks_dir = runbooks_dir
        self.state_backend = state_backend
        self.execution_log = []

    def execute(self, runbook_name, variables, dry_run=False, triggered_by="manual"):
        """Execute a runbook with the given variables."""
        execution_id = f"{runbook_name}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        runbook_path = os.path.join(self.runbooks_dir, runbook_name)

        logger.info(f"Starting runbook execution: {execution_id}")
        logger.info(f"Runbook: {runbook_name}")
        logger.info(f"Variables: {json.dumps(variables)}")
        logger.info(f"Triggered by: {triggered_by}")

        self._log_event(execution_id, "started", {
            "runbook": runbook_name,
            "variables": variables,
            "triggered_by": triggered_by
        })

        try:
            # Step 1: Initialize Terraform
            self._run_terraform(runbook_path, ["init", "-no-color"])
            self._log_event(execution_id, "initialized", {})

            # Step 2: Create the plan
            var_args = []
            for key, value in variables.items():
                var_args.extend(["-var", f"{key}={value}"])

            plan_output = self._run_terraform(
                runbook_path,
                ["plan", "-no-color", "-out=runbook.tfplan"] + var_args
            )
            self._log_event(execution_id, "planned", {"plan_output": plan_output})

            if dry_run:
                logger.info("Dry run mode - skipping apply")
                self._log_event(execution_id, "dry_run_complete", {})
                return {"status": "dry_run", "plan": plan_output}

            # Step 3: Apply the plan
            apply_output = self._run_terraform(
                runbook_path,
                ["apply", "-no-color", "-auto-approve", "runbook.tfplan"]
            )
            self._log_event(execution_id, "applied", {"apply_output": apply_output})

            # Step 4: Capture outputs
            output_result = self._run_terraform(
                runbook_path,
                ["output", "-json"]
            )
            outputs = json.loads(output_result)
            self._log_event(execution_id, "completed", {"outputs": outputs})

            logger.info(f"Runbook execution completed: {execution_id}")
            return {"status": "success", "outputs": outputs}

        except subprocess.CalledProcessError as e:
            error_msg = e.stderr if e.stderr else str(e)
            logger.error(f"Runbook execution failed: {error_msg}")
            self._log_event(execution_id, "failed", {"error": error_msg})
            return {"status": "failed", "error": error_msg}

    def _run_terraform(self, working_dir, args):
        """Run a Terraform command and return the output."""
        result = subprocess.run(
            ["terraform"] + args,
            capture_output=True, text=True,
            cwd=working_dir,
            check=True
        )
        return result.stdout

    def _log_event(self, execution_id, event_type, data):
        """Log a runbook execution event."""
        event = {
            "execution_id": execution_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        self.execution_log.append(event)
        # In production, send to your logging system
        logger.info(f"Event: {event_type} for {execution_id}")
```

## Common Runbook Patterns

### Database Failover Runbook

```hcl
# runbooks/database-failover/main.tf
# Runbook: Promote RDS read replica to primary

variable "replica_identifier" {
  description = "Identifier of the read replica to promote"
  type        = string
}

variable "reason" {
  description = "Reason for the failover"
  type        = string
}

# Promote the read replica
resource "aws_db_instance" "promoted" {
  identifier = var.replica_identifier

  # These settings take effect after promotion
  backup_retention_period = 7
  multi_az                = true

  # Tag to indicate this was a failover promotion
  tags = {
    PromotedAt     = timestamp()
    PromotionReason = var.reason
    ManagedBy      = "terraform-runbook"
  }

  lifecycle {
    ignore_changes = [
      engine_version,
      instance_class,
      allocated_storage
    ]
  }
}

# Update DNS to point to the new primary
resource "aws_route53_record" "database" {
  zone_id = var.hosted_zone_id
  name    = "db.${var.domain}"
  type    = "CNAME"
  ttl     = 60  # Low TTL during failover

  records = [aws_db_instance.promoted.endpoint]
}

output "failover_result" {
  value = {
    new_primary_endpoint = aws_db_instance.promoted.endpoint
    dns_record           = aws_route53_record.database.fqdn
    promoted_at          = timestamp()
  }
}
```

### Security Incident Response Runbook

```hcl
# runbooks/isolate-instance/main.tf
# Runbook: Isolate a compromised EC2 instance

variable "instance_id" {
  description = "ID of the instance to isolate"
  type        = string
}

variable "incident_id" {
  description = "Security incident identifier"
  type        = string
}

# Create an isolation security group (no inbound or outbound)
resource "aws_security_group" "isolation" {
  name        = "isolation-${var.incident_id}"
  description = "Isolation security group for incident ${var.incident_id}"
  vpc_id      = data.aws_instance.target.vpc_id

  # No ingress or egress rules - complete isolation
  tags = {
    Name       = "isolation-${var.incident_id}"
    IncidentID = var.incident_id
    Purpose    = "security-isolation"
    CreatedBy  = "terraform-runbook"
    CreatedAt  = timestamp()
  }
}

# Look up the target instance
data "aws_instance" "target" {
  instance_id = var.instance_id
}

# Replace the instance's security groups with the isolation group
resource "aws_network_interface_sg_attachment" "isolation" {
  security_group_id    = aws_security_group.isolation.id
  network_interface_id = data.aws_instance.target.network_interface_id
}

# Create a snapshot for forensic analysis
resource "aws_ebs_snapshot" "forensic" {
  for_each  = toset(data.aws_instance.target.ebs_block_device[*].volume_id)
  volume_id = each.value

  tags = {
    Name       = "forensic-${var.incident_id}-${each.value}"
    IncidentID = var.incident_id
    Purpose    = "forensic-evidence"
  }
}

output "isolation_result" {
  value = {
    instance_id        = var.instance_id
    isolation_sg       = aws_security_group.isolation.id
    forensic_snapshots = [for s in aws_ebs_snapshot.forensic : s.id]
    isolated_at        = timestamp()
  }
}
```

## Integrating with Runbook Platforms

Connect your Terraform runbooks with platforms like Rundeck, AWS Systems Manager, or PagerDuty Automation.

```yaml
# rundeck/scale-web-tier.yaml
# Rundeck job definition for the scaling runbook

- name: Scale Web Tier
  description: Scale the web tier up, down, or to a specific count
  group: infrastructure/scaling
  loglevel: INFO
  sequence:
    commands:
      - description: Initialize Terraform
        exec: "cd /opt/runbooks/scale-web-tier && terraform init"

      - description: Plan scaling change
        exec: "cd /opt/runbooks/scale-web-tier && terraform plan -var action=${option.action} -var scale_increment=${option.increment} -out=runbook.tfplan"

      - description: Apply scaling change
        exec: "cd /opt/runbooks/scale-web-tier && terraform apply -auto-approve runbook.tfplan"

      - description: Capture outputs
        exec: "cd /opt/runbooks/scale-web-tier && terraform output -json"
  options:
    - name: action
      description: Scaling action
      required: true
      enforced: true
      values: [scale_up, scale_down, scale_to]
    - name: increment
      description: Number of instances to add/remove
      required: false
      value: "2"
```

## Scheduling Runbooks for Maintenance

Some runbooks need to run on a schedule, like rotating credentials or cleaning up old resources.

```hcl
# runbooks/cleanup-old-snapshots/main.tf
# Scheduled runbook: Clean up EBS snapshots older than 30 days

variable "max_age_days" {
  description = "Maximum age of snapshots to keep"
  type        = number
  default     = 30
}

data "aws_ebs_snapshots" "old" {
  owners = ["self"]

  filter {
    name   = "status"
    values = ["completed"]
  }

  filter {
    name   = "tag:ManagedBy"
    values = ["terraform"]
  }
}

locals {
  cutoff_date = timeadd(timestamp(), "-${var.max_age_days * 24}h")

  old_snapshots = [
    for snap in data.aws_ebs_snapshots.old.ids :
    snap if timecmp(data.aws_ebs_snapshots.old.snapshots[index(data.aws_ebs_snapshots.old.ids, snap)].start_time, local.cutoff_date) < 0
  ]
}

# Tag old snapshots for deletion tracking
resource "null_resource" "cleanup" {
  for_each = toset(local.old_snapshots)

  triggers = {
    snapshot_id = each.value
  }

  provisioner "local-exec" {
    command = "aws ec2 delete-snapshot --snapshot-id ${each.value}"
  }
}

output "cleanup_result" {
  value = {
    snapshots_deleted = length(local.old_snapshots)
    cutoff_date       = local.cutoff_date
  }
}
```

## Best Practices

Keep runbook Terraform configurations small and focused. Each runbook should do one thing well. A scaling runbook should only scale. An isolation runbook should only isolate.

Always include a dry-run mode. Before executing destructive operations, run a plan and display the changes. Give operators the option to review before applying.

Log every execution. Record who triggered the runbook, what variables were provided, what the plan showed, and what the apply result was. This audit trail is essential for post-incident reviews.

Test runbooks regularly. Run them against staging environments on a schedule to verify they still work as expected. Infrastructure changes may break runbooks that have not been updated.

Version your runbooks. Use git tags or branches to pin runbook versions so that a change to a runbook does not break automated triggers that depend on specific behavior.

For more on Terraform automation patterns, see our guide on [Terraform Pipeline with GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view).

## Conclusion

Runbook automation with Terraform turns operational procedures from documents into executable code. Instead of relying on engineers to read and follow steps correctly, automated runbooks execute the same reliable procedure every time. Whether you are scaling infrastructure, responding to security incidents, or performing routine maintenance, Terraform-based runbooks provide consistency, speed, and a complete audit trail. Start by automating your most common runbooks and expand as your team gains confidence in the approach.
