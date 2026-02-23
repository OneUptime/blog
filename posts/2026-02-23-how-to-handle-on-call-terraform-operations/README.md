# How to Handle On-Call Terraform Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, On-Call, Operations, Incident Response, DevOps

Description: Prepare your on-call engineers to handle Terraform operations confidently during incidents with proper tooling, runbooks, and escalation procedures.

---

Being on call for infrastructure managed by Terraform adds a layer of complexity that application on-call does not have. When a service goes down at 3 AM, the on-call engineer might need to modify infrastructure: scale up instances, update DNS records, adjust security group rules, or roll back a recent change. Doing this safely with Terraform under pressure requires preparation, not improvisation.

This guide covers how to prepare your on-call rotation for Terraform operations, including the tools, permissions, runbooks, and guardrails that make middle-of-the-night infrastructure changes safe.

## The On-Call Terraform Challenge

On-call Terraform operations are uniquely challenging for three reasons. First, Terraform changes affect real infrastructure immediately. There is no staging deployment buffer. Second, Terraform state must be consistent. A partial apply or interrupted operation can leave state in a broken condition. Third, the blast radius of a mistake is potentially enormous. A wrong terraform apply in production can affect every service.

Despite these risks, on-call engineers need the ability to make infrastructure changes. You cannot tell a customer that their service will stay down until business hours because only senior engineers are authorized to run Terraform.

## Setting Up On-Call Permissions

On-call engineers need sufficient permissions to respond to incidents without having full administrative access at all times:

```hcl
# IAM role for on-call Terraform operations
resource "aws_iam_role" "oncall_terraform" {
  name = "oncall-terraform-operator"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          # Only allow assumption during active incidents
          # or by members of the on-call group
          StringEquals = {
            "aws:PrincipalTag/OnCallActive": "true"
          }
        }
      }
    ]
  })
}

# Scoped permissions for on-call operations
resource "aws_iam_role_policy" "oncall_terraform" {
  name = "oncall-terraform-policy"
  role = aws_iam_role.oncall_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow Terraform state operations
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::company-terraform-state",
          "arn:aws:s3:::company-terraform-state/*"
        ]
      },
      {
        # Allow state locking
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/terraform-locks"
      },
      {
        # Allow common scaling operations
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "autoscaling:UpdateAutoScalingGroup",
          "autoscaling:DescribeAutoScalingGroups",
          "ec2:ModifyInstanceAttribute",
          "rds:ModifyDBInstance"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## On-Call Terraform Toolkit

Prepare a set of tools and scripts that on-call engineers can use safely:

### Safe Apply Script

```bash
#!/bin/bash
# scripts/oncall-apply.sh
# A safer terraform apply for on-call use

set -euo pipefail

ENVIRONMENT=$1
shift
EXTRA_ARGS="$@"

# Color codes for visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORK_DIR="environments/$ENVIRONMENT"

echo -e "${YELLOW}=== ON-CALL TERRAFORM APPLY ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Time: $(date -u)"
echo ""

# Step 1: Verify state is not locked
echo -e "${YELLOW}Checking for existing state locks...${NC}"
LOCK_STATUS=$(aws dynamodb scan \
  --table-name terraform-locks \
  --filter-expression "contains(Info, :env)" \
  --expression-attribute-values "{\":env\": {\"S\": \"$ENVIRONMENT\"}}" \
  --query 'Count')

if [ "$LOCK_STATUS" -gt 0 ]; then
  echo -e "${RED}WARNING: State is currently locked!${NC}"
  echo "Another operation may be in progress."
  echo "Use 'terraform force-unlock' only if you are certain no other operation is running."
  exit 1
fi

# Step 2: Plan
echo -e "${YELLOW}Running terraform plan...${NC}"
terraform -chdir="$WORK_DIR" init -no-color
terraform -chdir="$WORK_DIR" plan -no-color $EXTRA_ARGS -out=oncall.tfplan 2>&1 | tee /tmp/oncall-plan.txt

# Step 3: Count changes
ADDS=$(grep -c "will be created" /tmp/oncall-plan.txt || true)
CHANGES=$(grep -c "will be updated" /tmp/oncall-plan.txt || true)
DESTROYS=$(grep -c "will be destroyed" /tmp/oncall-plan.txt || true)

echo ""
echo -e "Plan summary: ${GREEN}+$ADDS${NC} ${YELLOW}~$CHANGES${NC} ${RED}-$DESTROYS${NC}"

# Step 4: Safety checks
if [ "$DESTROYS" -gt 0 ]; then
  echo -e "${RED}WARNING: This plan includes DESTRUCTIVE changes!${NC}"
  echo "Resources will be destroyed. Review carefully."
  echo ""
fi

if [ "$DESTROYS" -gt 5 ]; then
  echo -e "${RED}BLOCKED: More than 5 resources will be destroyed.${NC}"
  echo "This exceeds the on-call safety threshold."
  echo "Escalate to the platform team lead."
  exit 1
fi

# Step 5: Confirm
echo ""
read -p "Apply this plan? Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Step 6: Apply with logging
echo -e "${YELLOW}Applying...${NC}"
terraform -chdir="$WORK_DIR" apply -no-color oncall.tfplan 2>&1 | tee /tmp/oncall-apply.txt

echo -e "${GREEN}Apply complete.${NC}"

# Step 7: Log the operation
echo "$(date -u) | $USER | $ENVIRONMENT | +$ADDS ~$CHANGES -$DESTROYS | $EXTRA_ARGS" >> /var/log/oncall-terraform.log
```

### Quick Scaling Script

```bash
#!/bin/bash
# scripts/oncall-scale.sh
# Quick scaling for common on-call scenarios

set -euo pipefail

ACTION=$1  # up or down
SERVICE=$2
ENVIRONMENT=${3:-production}

case "$ACTION-$SERVICE" in
  "up-api")
    echo "Scaling API service up (2x current)"
    CURRENT=$(terraform -chdir="environments/$ENVIRONMENT" output -raw api_desired_count)
    NEW=$((CURRENT * 2))
    terraform -chdir="environments/$ENVIRONMENT" apply \
      -var="api_desired_count=$NEW" \
      -auto-approve \
      -target=aws_ecs_service.api
    ;;
  "down-api")
    echo "Scaling API service to default"
    terraform -chdir="environments/$ENVIRONMENT" apply \
      -var="api_desired_count=4" \
      -auto-approve \
      -target=aws_ecs_service.api
    ;;
  "up-workers")
    echo "Scaling worker pool up (2x current)"
    CURRENT=$(terraform -chdir="environments/$ENVIRONMENT" output -raw worker_desired_count)
    NEW=$((CURRENT * 2))
    terraform -chdir="environments/$ENVIRONMENT" apply \
      -var="worker_desired_count=$NEW" \
      -auto-approve \
      -target=aws_ecs_service.workers
    ;;
  *)
    echo "Unknown action: $ACTION-$SERVICE"
    echo "Usage: oncall-scale.sh [up|down] [api|workers] [environment]"
    exit 1
    ;;
esac

echo "Scaling complete. Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "$ENVIRONMENT" \
  --services "$SERVICE"
echo "Service stable."
```

## On-Call Runbook Index

Create an index of runbooks organized by symptom, not by solution:

```markdown
# On-Call Terraform Runbook Index

## By Symptom

### High CPU on Application Servers
1. Check current scaling: `terraform output ecs_api_desired_count`
2. Scale up: `./scripts/oncall-scale.sh up api`
3. Runbook: [Scale ECS Service](./runbooks/scale-ecs.md)

### Database Connection Errors
1. Check RDS status: `aws rds describe-db-instances`
2. If failover needed: [RDS Failover](./runbooks/rds-failover.md)
3. If connection limit hit: [Increase RDS Connections](./runbooks/rds-connections.md)

### 5xx Errors from Load Balancer
1. Check target group health: `aws elbv2 describe-target-health`
2. If targets unhealthy, check ECS service
3. If targets healthy, check security groups
4. Runbook: [ALB Troubleshooting](./runbooks/alb-troubleshoot.md)

### DNS Resolution Failures
1. Check Route53 records: `aws route53 list-resource-record-sets`
2. If records missing: [Restore DNS Records](./runbooks/restore-dns.md)
3. If records wrong: [Update DNS](./runbooks/update-dns.md)

### State Lock Stuck
1. Verify no other operations running
2. Check who holds the lock: `aws dynamodb get-item`
3. Runbook: [Force Unlock State](./runbooks/force-unlock.md)
```

## Escalation Procedures

Define clear escalation paths:

```markdown
# On-Call Escalation Matrix

## Level 1: On-Call Engineer
- Can handle: Scaling operations, DNS updates, security group changes
- Time limit: 30 minutes to resolve or escalate
- Tools: oncall-apply.sh, oncall-scale.sh, runbooks

## Level 2: Platform Team Lead
- Contacted when: Destructive changes needed, state corruption, unknown issues
- Can handle: State recovery, module-level changes, cross-team coordination
- Time limit: 1 hour to resolve or escalate

## Level 3: VP of Engineering
- Contacted when: Multi-service outage, data loss risk, security breach
- Can authorize: Emergency production access, vendor support engagement
- Decision authority: Service degradation vs. extended downtime tradeoffs

## Contact Order
1. On-call engineer (PagerDuty)
2. Platform team lead (phone)
3. VP of Engineering (phone, Slack DM)
```

## Post-Incident Review for Terraform Changes

After any on-call Terraform operation, conduct a review:

```markdown
# Post-Incident Terraform Review

## Questions to Answer
1. Was the on-call engineer able to resolve the issue independently?
2. Did the runbooks cover this scenario?
3. Were the tools and permissions sufficient?
4. Did the change have unintended side effects?
5. Should this operation be automated?

## Action Items Template
- [ ] Update runbook if steps were missing or unclear
- [ ] Add automation for repetitive manual steps
- [ ] Adjust on-call permissions if they were insufficient
- [ ] Create or update monitoring to detect this issue earlier
- [ ] Schedule follow-up PR to clean up any temporary changes
```

Use monitoring platforms like OneUptime to track on-call Terraform operations and identify patterns that indicate opportunities for automation or process improvement.

For more on emergency procedures, see our guide on [handling emergency Terraform changes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-emergency-terraform-changes/view).

On-call Terraform operations do not have to be stressful. With the right preparation, tools, and guardrails, your on-call engineers can make infrastructure changes safely and confidently at any hour. Invest in the preparation now, and your team will handle incidents with composure.
