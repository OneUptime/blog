# How to Handle Emergency Terraform Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Emergency Changes, Incident Response, DevOps, Infrastructure as Code

Description: Build safe and fast emergency Terraform change procedures that bypass normal processes when production is down while maintaining accountability and auditability.

---

At 2 AM, your monitoring alerts fire. A critical production service is down because of an infrastructure issue. The normal change management process - pull request, review, approval, merge, apply - takes hours. Your customers cannot wait that long. You need to make a Terraform change right now.

Emergency changes are the exception to your normal process, but they still need a process. Without one, engineers panic, make mistakes, and create bigger problems than the one they are trying to fix. This guide covers how to build an emergency change procedure that is fast enough for incidents and safe enough to prevent compounding failures.

## Defining What Constitutes an Emergency

Not every urgent request is an emergency. Define clear criteria:

```markdown
# Emergency Change Criteria

An emergency change is authorized ONLY when ALL of the following are true:

1. Production service is DOWN or severely DEGRADED
   - Users cannot access the service, OR
   - Error rate exceeds 50%, OR
   - Latency exceeds 10x normal

2. The root cause is an infrastructure issue
   - Not an application bug
   - Not a third-party service outage
   - Terraform change is the required remediation

3. The standard change process is too slow
   - Waiting for normal PR review would extend the outage
   - No pre-approved runbook covers this scenario

4. An incident has been declared
   - Incident commander is aware
   - Communication channel is active

If ANY of these criteria are NOT met, use the standard process.
```

## The Emergency Change Procedure

### Step 1: Declare the Emergency

```bash
#!/bin/bash
# scripts/declare-emergency.sh
# Run this first to set up the emergency context

REASON="$1"
INCIDENT_ID="$2"

if [ -z "$REASON" ] || [ -z "$INCIDENT_ID" ]; then
  echo "Usage: declare-emergency.sh 'reason' 'INC-XXXX'"
  exit 1
fi

echo "============================================"
echo "EMERGENCY TERRAFORM CHANGE INITIATED"
echo "============================================"
echo "Time: $(date -u)"
echo "Operator: $(whoami)"
echo "Reason: $REASON"
echo "Incident: $INCIDENT_ID"
echo "============================================"
echo ""

# Log the emergency declaration
cat <<EOF >> /var/log/terraform-emergencies.log
$(date -u) | DECLARED | $(whoami) | $INCIDENT_ID | $REASON
EOF

# Notify the team
echo "Emergency change declared for $INCIDENT_ID: $REASON" | \
  slack-notify "#incidents"

echo "Emergency context established."
echo "Proceed with the change. All actions will be logged."
```

### Step 2: Make the Change

For emergency changes, you have two options: direct apply or expedited PR.

#### Option A: Direct Apply (Fastest)

```bash
#!/bin/bash
# scripts/emergency-apply.sh
# Direct apply with enhanced logging and safety checks

set -euo pipefail

ENVIRONMENT=$1
INCIDENT_ID=$2
shift 2
EXTRA_ARGS="$@"

WORK_DIR="environments/$ENVIRONMENT"
LOG_FILE="/var/log/terraform-emergency-$INCIDENT_ID.log"

# Log everything
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Emergency Apply ==="
echo "Environment: $ENVIRONMENT"
echo "Incident: $INCIDENT_ID"
echo "Operator: $(whoami)"
echo "Time: $(date -u)"
echo "Args: $EXTRA_ARGS"
echo ""

# Plan
echo "Running plan..."
terraform -chdir="$WORK_DIR" init
terraform -chdir="$WORK_DIR" plan -no-color $EXTRA_ARGS -out=emergency.tfplan

# Safety check: refuse if too many destroys
DESTROYS=$(terraform -chdir="$WORK_DIR" show -json emergency.tfplan | \
  jq '[.resource_changes[] | select(.change.actions | contains(["delete"]))] | length')

if [ "$DESTROYS" -gt 3 ]; then
  echo "BLOCKED: Plan destroys $DESTROYS resources."
  echo "Emergency changes should be targeted. Use -target to limit scope."
  echo "Escalate to platform lead if broader changes are needed."
  exit 1
fi

# Show the plan for the log
terraform -chdir="$WORK_DIR" show -no-color emergency.tfplan

# Apply
echo ""
echo "Applying emergency change..."
terraform -chdir="$WORK_DIR" apply -no-color emergency.tfplan

echo ""
echo "Emergency apply complete at $(date -u)"
echo "Log saved to: $LOG_FILE"

# Notify
echo "Emergency apply completed for $INCIDENT_ID by $(whoami)" | \
  slack-notify "#incidents"
```

#### Option B: Expedited PR (Preferred When Possible)

```yaml
# .github/workflows/emergency-pr.yml
name: Emergency PR Process

on:
  pull_request:
    labels: [emergency]

jobs:
  emergency-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: environments/production

      - name: Terraform Plan
        run: terraform plan -no-color -out=tfplan
        working-directory: environments/production

      - name: Post Plan
        uses: actions/github-script@v7
        with:
          script: |
            const output = `## EMERGENCY CHANGE - Plan Output
            Please review immediately.
            \`\`\`
            ${process.env.PLAN_OUTPUT}
            \`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  # Auto-apply after single approval for emergency PRs
  emergency-apply:
    needs: emergency-validate
    runs-on: ubuntu-latest
    environment: emergency  # Requires emergency approver
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform apply -auto-approve
        working-directory: environments/production
```

For the expedited PR, reduce the approval requirement from two reviewers to one, but the reviewer must be a senior engineer.

### Step 3: Verify the Fix

After applying, verify that the change fixed the issue:

```bash
#!/bin/bash
# scripts/verify-emergency-fix.sh

ENVIRONMENT=$1
INCIDENT_ID=$2

echo "Verifying emergency fix for $INCIDENT_ID..."

# Check service health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  https://api.${ENVIRONMENT}.example.com/health)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Service is responding with 200 OK"
else
  echo "WARNING: Service is responding with $HTTP_STATUS"
  echo "The emergency change may not have resolved the issue"
  echo "Consider additional actions or escalation"
fi

# Check error rates
echo "Monitoring error rates for 5 minutes..."
for i in {1..5}; do
  sleep 60
  ERRORS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --start-time "$(date -u -d '1 minute ago' +%Y-%m-%dT%H:%M:%S)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
    --period 60 \
    --statistics Sum \
    --query 'Datapoints[0].Sum')
  echo "Minute $i: $ERRORS 5xx errors"
done

echo "Verification complete."
```

### Step 4: Document and Follow Up

Every emergency change needs a follow-up:

```markdown
# Emergency Change Follow-Up

## Immediate (within 1 hour)
- [ ] Verify the fix resolved the incident
- [ ] Notify stakeholders that the incident is resolved
- [ ] Ensure the change is logged

## Next Business Day
- [ ] Create a PR that mirrors the emergency change (if done via direct apply)
- [ ] Get the PR reviewed and approved retroactively
- [ ] Update runbooks if this scenario should be covered
- [ ] File a ticket for any technical debt created

## Within 1 Week
- [ ] Conduct incident post-mortem
- [ ] Determine if this emergency could have been prevented
- [ ] Update change management process if needed
- [ ] Add monitoring to detect this issue earlier
```

## Retroactive PR Process

When a change is made via direct apply, create a retroactive PR to get it into version control:

```bash
#!/bin/bash
# scripts/create-retroactive-pr.sh

INCIDENT_ID=$1
DESCRIPTION=$2

# Create a branch from the current state
git checkout -b "emergency/$INCIDENT_ID"

# The emergency changes should already be in the working directory
# Stage and commit them
git add -A
git commit -m "Emergency change for $INCIDENT_ID

Applied directly during incident response.
This PR is for retroactive review and documentation.

Incident: $INCIDENT_ID
Applied by: $(whoami)
Applied at: $(date -u)"

# Push and create PR
git push origin "emergency/$INCIDENT_ID"
gh pr create \
  --title "Retroactive: Emergency change for $INCIDENT_ID" \
  --body "This PR documents an emergency change that was applied directly during incident $INCIDENT_ID.

## What Changed
$DESCRIPTION

## Incident Timeline
See incident channel for full timeline.

## Review Requested
Please review this change for correctness and identify any follow-up work needed." \
  --label "emergency,retroactive"
```

## Preventing Emergency Changes

The best emergency change is one that never happens. Track your emergency changes and look for patterns:

```markdown
# Emergency Change Metrics

## Track Monthly
- Number of emergency changes
- Root cause of each emergency
- Time to apply emergency change
- Whether the emergency could have been prevented

## Common Prevention Strategies
- Better monitoring detects issues before they become emergencies
- Pre-approved runbooks for common scenarios avoid the need for ad-hoc changes
- Staging validation catches issues before production
- Canary deployments limit blast radius
```

For more on building a comprehensive change management process, see our guide on [creating Terraform change management processes](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-change-management-processes/view).

Use monitoring tools like OneUptime to detect infrastructure issues early, before they escalate into emergencies requiring Terraform changes under pressure.

Emergency changes are a fact of life in infrastructure operations. Having a clear, practiced procedure ensures that when the pressure is on, your team can act quickly without creating additional risk. Build the procedure, practice it regularly, and learn from every emergency to prevent the next one.
