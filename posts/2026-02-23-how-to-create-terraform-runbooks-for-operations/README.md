# How to Create Terraform Runbooks for Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Runbook, Operations, DevOps, Infrastructure as Code

Description: Build comprehensive Terraform runbooks that enable operations teams to execute infrastructure changes safely and consistently during both routine and emergency scenarios.

---

A runbook is a step-by-step guide for performing a specific operational task. For Terraform operations, runbooks bridge the gap between knowing what needs to change and knowing how to change it safely. Without runbooks, engineers rely on memory, tribal knowledge, or frantic Slack messages to figure out how to perform infrastructure operations under pressure.

Good runbooks make the difference between a calm, methodical response to an issue and a panicked scramble that makes things worse. This guide shows you how to create Terraform runbooks that your operations team will actually use.

## What Makes a Good Runbook

A good runbook has five qualities. It is specific enough to follow without guessing. It is general enough to handle variations. It includes verification steps after each action. It documents what can go wrong and how to recover. It is kept up to date.

## Runbook Structure Template

Use a consistent template for all runbooks:

```markdown
# Runbook: [Operation Name]

## Overview
Brief description of what this runbook accomplishes.

## When to Use
Describe the circumstances that trigger this runbook.

## Prerequisites
- [ ] Access to Terraform state backend
- [ ] AWS credentials with required permissions
- [ ] VPN connected (if required)
- [ ] Notification sent to #infrastructure channel

## Risk Assessment
- Impact: [Low/Medium/High/Critical]
- Blast Radius: [Description of affected systems]
- Rollback Time: [Estimated time to revert]
- Downtime Expected: [Yes/No, duration if yes]

## Steps
[Numbered steps with commands and verification]

## Rollback Procedure
[Steps to undo the changes if something goes wrong]

## Post-Operation Checklist
- [ ] Verify service health
- [ ] Update monitoring dashboards
- [ ] Notify stakeholders
- [ ] Document any deviations from the runbook

## Revision History
| Date | Author | Change |
|------|--------|--------|
| 2026-02-01 | @engineer | Initial version |
```

## Essential Terraform Runbooks

### Runbook: Scaling an ECS Service

```markdown
# Runbook: Scale ECS Service

## Overview
Scale the desired count of an ECS service up or down.

## When to Use
- High CPU/memory alerts on the service
- Planned traffic increase (marketing campaign, product launch)
- Cost optimization during low-traffic periods

## Prerequisites
- [ ] AWS credentials configured
- [ ] Terraform state accessible
- [ ] Current service metrics reviewed

## Risk Assessment
- Impact: Low (scaling up) / Medium (scaling down)
- Blast Radius: Single service
- Rollback Time: 5 minutes
- Downtime Expected: No

## Steps

### Step 1: Review Current State
```bash
# Check current service configuration
cd environments/production
terraform state show aws_ecs_service.api

# Note the current desired_count value
terraform output ecs_service_desired_count
```

### Step 2: Update the Variable
```bash
# Edit the variable file
# Change desired_count from current value to target value
vim production.tfvars
# Or use sed for automation:
# sed -i 's/ecs_desired_count = 4/ecs_desired_count = 8/' production.tfvars
```

### Step 3: Plan and Review
```bash
# Generate plan
terraform plan -var-file=production.tfvars -out=scale.tfplan

# Verify the plan shows ONLY the expected changes:
# - aws_ecs_service.api will be updated in-place
# - desired_count: 4 -> 8
# NO other resources should be affected
```

### Step 4: Apply
```bash
# Apply the plan
terraform apply scale.tfplan

# Wait for service to stabilize (2-5 minutes)
aws ecs wait services-stable \
  --cluster production \
  --services api-service
```

### Step 5: Verify
```bash
# Check service status
aws ecs describe-services \
  --cluster production \
  --services api-service \
  --query 'services[0].{desired: desiredCount, running: runningCount}'

# Verify all tasks are healthy
aws ecs describe-services \
  --cluster production \
  --services api-service \
  --query 'services[0].deployments'
```

## Rollback Procedure
```bash
# Revert the variable to the previous value
# Then plan and apply
terraform plan -var-file=production.tfvars -out=rollback.tfplan
terraform apply rollback.tfplan
```
```

### Runbook: Database Failover

```markdown
# Runbook: RDS Failover to Read Replica

## Overview
Promote an RDS read replica to become the primary database
instance, typically during disaster recovery or maintenance.

## When to Use
- Primary database is unresponsive
- Region failover required
- Planned maintenance requiring failover

## Prerequisites
- [ ] Read replica is healthy and replication lag is minimal
- [ ] Application connection strings are managed via DNS/CNAME
- [ ] Database team lead notified and available
- [ ] Incident channel created if triggered by an outage

## Risk Assessment
- Impact: Critical
- Blast Radius: All services using this database
- Rollback Time: 30-60 minutes
- Downtime Expected: Yes, 5-15 minutes

## Steps

### Step 1: Verify Replica Health
```bash
# Check replication status
aws rds describe-db-instances \
  --db-instance-identifier production-replica \
  --query 'DBInstances[0].{
    Status: DBInstanceStatus,
    ReplicaLag: StatusInfos[0].Normal
  }'

# Replication lag should be less than 5 seconds
# Status should be "available"
```

### Step 2: Notify Stakeholders
```bash
# Post to incident channel
echo "DATABASE FAILOVER: Initiating failover from primary to replica.
Expected downtime: 5-15 minutes.
Reason: [STATE REASON]
Time: $(date -u)" | slack-notify #incidents
```

### Step 3: Terraform Plan
```bash
cd environments/production/database

# Update the configuration to promote the replica
# Set promote_replica = true in the tfvars
terraform plan -var-file=production.tfvars \
  -target=aws_db_instance.primary \
  -out=failover.tfplan

# Review the plan CAREFULLY
# Ensure only the expected database resources are modified
```

### Step 4: Apply Failover
```bash
terraform apply failover.tfplan
```

### Step 5: Update DNS
```bash
cd ../dns

# Point the database CNAME to the new primary
terraform plan -var-file=production.tfvars -out=dns.tfplan
terraform apply dns.tfplan
```

### Step 6: Verify Application Connectivity
```bash
# Test database connectivity
psql -h db.production.internal -U app_user -d production -c "SELECT 1"

# Check application health endpoints
curl -s https://api.production.example.com/health | jq .database
```

## Rollback Procedure
If the failover causes issues:
1. Revert DNS to point to the old primary (if still available)
2. Revert Terraform changes
3. Restore from latest snapshot if both instances are compromised
```

### Runbook: State Recovery

```markdown
# Runbook: Terraform State Recovery

## Overview
Recover Terraform state from backup after corruption or
accidental deletion.

## When to Use
- State file is corrupted (terraform plan shows errors)
- State was accidentally deleted
- State contains incorrect resource mappings

## Prerequisites
- [ ] S3 bucket versioning is enabled
- [ ] You know approximately when the corruption occurred
- [ ] No other terraform operations are running

## Steps

### Step 1: Lock State Operations
```bash
# Ensure no one else is running Terraform
# Check for existing locks
aws dynamodb scan \
  --table-name terraform-locks \
  --filter-expression "contains(Info, :path)" \
  --expression-attribute-values '{":path": {"S": "production"}}'
```

### Step 2: List Available State Versions
```bash
# List recent versions of the state file
aws s3api list-object-versions \
  --bucket company-terraform-state \
  --prefix production/terraform.tfstate \
  --max-items 10 \
  --query 'Versions[].{VersionId: VersionId, Modified: LastModified, Size: Size}'
```

### Step 3: Download and Inspect Previous Version
```bash
# Download a known-good version
aws s3api get-object \
  --bucket company-terraform-state \
  --key production/terraform.tfstate \
  --version-id "VERSION_ID_HERE" \
  restored-state.tfstate

# Inspect it
terraform show restored-state.tfstate | head -50
```

### Step 4: Restore the State
```bash
# Back up the current (corrupted) state first
aws s3 cp \
  s3://company-terraform-state/production/terraform.tfstate \
  s3://company-terraform-state/production/terraform.tfstate.corrupted

# Upload the restored state
aws s3 cp \
  restored-state.tfstate \
  s3://company-terraform-state/production/terraform.tfstate
```

### Step 5: Verify
```bash
# Initialize Terraform
terraform init

# Run plan - should show minimal or no changes
terraform plan

# If plan shows unexpected changes, you may have the wrong version
# Go back to Step 3 and try an earlier version
```
```

## Keeping Runbooks Current

Runbooks that are not maintained become dangerous. Outdated steps can lead operators astray during incidents.

```markdown
# Runbook Maintenance Policy

## After Every Use
- Note any steps that were unclear or incorrect
- Submit a PR to update the runbook
- Record how long the procedure actually took

## Monthly Review
- Each team reviews their runbooks for accuracy
- Verify that commands still work against staging
- Update screenshots and output examples

## Quarterly Drill
- Execute each critical runbook against staging
- Time the execution
- Identify steps that could be automated
- New team members participate to validate clarity
```

## Automating Runbook Steps

Where possible, wrap runbook steps in scripts:

```bash
#!/bin/bash
# scripts/scale-ecs-service.sh
# Automated version of the ECS scaling runbook

set -euo pipefail

SERVICE_NAME=$1
TARGET_COUNT=$2
ENVIRONMENT=${3:-production}

echo "Scaling $SERVICE_NAME to $TARGET_COUNT in $ENVIRONMENT"

# Step 1: Verify current state
CURRENT_COUNT=$(terraform -chdir="environments/$ENVIRONMENT" \
  output -raw ecs_${SERVICE_NAME}_desired_count)
echo "Current count: $CURRENT_COUNT -> Target: $TARGET_COUNT"

# Step 2: Update and plan
terraform -chdir="environments/$ENVIRONMENT" plan \
  -var="ecs_${SERVICE_NAME}_desired_count=$TARGET_COUNT" \
  -out=scale.tfplan

# Step 3: Confirm and apply
read -p "Apply this plan? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  terraform -chdir="environments/$ENVIRONMENT" apply scale.tfplan
  echo "Applied successfully"
else
  echo "Aborted"
  exit 1
fi

# Step 4: Verify
aws ecs wait services-stable --cluster "$ENVIRONMENT" --services "$SERVICE_NAME"
echo "Service stabilized at $TARGET_COUNT tasks"
```

For more on handling operations, see our guide on [handling on-call Terraform operations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-on-call-terraform-operations/view).

Use monitoring tools like OneUptime to trigger runbook execution when specific conditions are detected, and to verify that the post-operation health checks pass.

Runbooks are living documents that encode your team's operational knowledge. They are not just documentation - they are the foundation of reliable operations. Invest in creating them, commit to maintaining them, and your team will handle infrastructure operations with confidence and consistency.
