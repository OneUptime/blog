# How to Handle Cross-Team Terraform Migrations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Team Collaboration, DevOps, Infrastructure as Code

Description: Learn strategies for coordinating Terraform migrations across multiple teams including communication, ownership transfer, state handoffs, and conflict resolution.

---

Terraform migrations that span multiple teams introduce coordination challenges beyond the technical aspects. Different teams may have varying Terraform expertise, conflicting schedules, and different priorities. This guide covers strategies for managing cross-team Terraform migrations effectively.

## Challenges of Cross-Team Migrations

Cross-team migrations face unique challenges. Teams may be in different time zones, have varying levels of Terraform experience, use different coding conventions, and have competing priorities. State files shared across teams create dependencies that require careful coordination. Without clear ownership boundaries, resources can fall into a "no one owns this" gap.

## Establishing Migration Governance

Create a migration steering group with representatives from each team:

```markdown
## Migration Governance Structure

### Steering Group
- Platform Team Lead (Migration Owner)
- Application Team Lead
- Data Team Lead
- SRE Team Lead
- Security Team Representative

### Responsibilities
- Approve migration plans and timelines
- Resolve cross-team conflicts
- Make go/no-go decisions for each wave
- Review migration results

### Meeting Cadence
- Weekly during active migration
- Ad-hoc for urgent issues
```

## Defining Resource Ownership

Create a clear ownership matrix before starting:

```markdown
## Resource Ownership Matrix

| Resource Type | Current Owner | Target Owner | Module |
|--------------|---------------|--------------|--------|
| VPC, Subnets | Platform | Platform | networking |
| Security Groups | Platform | Platform | networking |
| EC2 Instances | Platform | Application | compute |
| Load Balancers | Platform | Application | compute |
| RDS Instances | Platform | Data | databases |
| ElastiCache | Platform | Data | databases |
| CloudWatch Alarms | SRE | SRE | monitoring |
| IAM Roles | Security | Security | iam |
| S3 Buckets | Varies | See detail | storage |
```

## Coordination Protocol

Define how teams coordinate during migration:

```markdown
## Coordination Protocol

### Freeze Periods
- No Terraform changes to affected resources during migration windows
- Each team acknowledges the freeze before migration begins
- Emergency changes require migration owner approval

### Handoff Procedure
1. Exporting team prepares state backup
2. Exporting team moves resources out of their state
3. Importing team verifies resources in their state
4. Both teams run terraform plan to verify clean states
5. Both teams sign off on the handoff

### Communication Channels
- Primary: #terraform-migration Slack channel
- Escalation: Direct message to migration owner
- Status updates: Weekly email summary
```

## State Handoff Between Teams

When transferring resources between team-owned state files:

```bash
#!/bin/bash
# state-handoff.sh
# Transfer resources between team state files

SOURCE_DIR=$1  # Exporting team's configuration
TARGET_DIR=$2  # Importing team's configuration
RESOURCE=$3    # Resource address to transfer

echo "=== State Handoff ==="
echo "From: $SOURCE_DIR"
echo "To: $TARGET_DIR"
echo "Resource: $RESOURCE"

# Step 1: Back up both states
echo "Backing up source state..."
terraform -chdir="$SOURCE_DIR" state pull > "/tmp/source-backup.json"

echo "Backing up target state..."
terraform -chdir="$TARGET_DIR" state pull > "/tmp/target-backup.json"

# Step 2: Move the resource
echo "Moving resource..."
terraform -chdir="$SOURCE_DIR" state mv \
  -state-out="$(cd $TARGET_DIR && pwd)/terraform.tfstate" \
  "$RESOURCE" "$RESOURCE"

# Step 3: Verify both states
echo "Verifying source state..."
terraform -chdir="$SOURCE_DIR" plan -detailed-exitcode
SOURCE_EXIT=$?

echo "Verifying target state..."
terraform -chdir="$TARGET_DIR" plan -detailed-exitcode
TARGET_EXIT=$?

if [ $SOURCE_EXIT -le 2 ] && [ $TARGET_EXIT -le 2 ]; then
  echo "Handoff successful"
else
  echo "WARNING: Issues detected. Review plan output above."
fi
```

## Handling Shared Resources

Some resources are used by multiple teams. Handle these carefully:

```hcl
# Option 1: Keep shared resources in a common state
# environments/production/shared/main.tf
module "shared_vpc" {
  source = "../../../modules/networking"
  # ...
}

# Output values for other teams to reference
output "vpc_id" {
  value = module.shared_vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.shared_vpc.private_subnet_ids
}

# Option 2: Use data sources for cross-team references
# In the application team's configuration
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "production/shared/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids["us-east-1a"]
}
```

## Training and Knowledge Transfer

Ensure all teams have the Terraform skills needed for the migration:

```markdown
## Training Plan

### Required Knowledge
- Terraform state management commands
- Module structure and usage
- Remote state data sources
- Import and moved blocks

### Training Sessions
1. Terraform State Operations Workshop (2 hours)
   - state list, show, mv, rm
   - state pull and push
   - backup and restore procedures

2. Module Development and Usage (2 hours)
   - Creating modules
   - Using module outputs
   - Remote state references

3. Migration Dry Run (3 hours)
   - Practice migration in dev environment
   - Each team migrates their resources
   - Group review of results
```

## Conflict Resolution

Define how to handle conflicts:

```markdown
## Conflict Resolution Procedures

### Resource Ownership Disputes
1. Review the resource's creation history and primary users
2. Assign to the team most impacted by changes to the resource
3. If unresolved, migration owner makes the final decision

### Schedule Conflicts
1. Migration waves are scheduled 2 weeks in advance
2. Teams can request rescheduling with 1 week notice
3. Production incidents take priority over migration

### Technical Disagreements
1. Discuss in the migration Slack channel
2. If unresolved, bring to steering group meeting
3. Document the decision and rationale
```

## Tracking Progress Across Teams

Use a shared tracking system:

```markdown
## Migration Progress Tracker

| Wave | Team | Resources | Status | Start | End | Notes |
|------|------|-----------|--------|-------|-----|-------|
| 1 | Platform | 50 networking | Complete | 2/10 | 2/10 | Clean |
| 2 | Security | 25 IAM | Complete | 2/12 | 2/12 | 1 rollback |
| 3 | Application | 80 compute | In Progress | 2/17 | - | |
| 4 | Data | 35 databases | Scheduled | 2/19 | - | |
| 5 | SRE | 40 monitoring | Scheduled | 2/24 | - | |
```

## Post-Migration Verification

After all teams complete their waves:

```bash
#!/bin/bash
# verify-all-teams.sh

TEAMS=("networking" "compute" "databases" "monitoring" "iam")

echo "=== Cross-Team Migration Verification ==="

for team in "${TEAMS[@]}"; do
  echo ""
  echo "Verifying: $team"
  cd "environments/production/$team"

  terraform init > /dev/null 2>&1
  PLAN_RESULT=$(terraform plan -detailed-exitcode 2>&1)
  EXIT_CODE=$?

  case $EXIT_CODE in
    0) echo "  PASS: No changes" ;;
    2) echo "  WARN: Changes detected - review needed" ;;
    *) echo "  FAIL: Error encountered" ;;
  esac

  cd - > /dev/null
done
```

## Best Practices

Establish clear ownership boundaries before starting any migration. Create a shared communication channel for real-time coordination. Define and document handoff procedures. Train all teams on the migration process before starting. Use freeze windows to prevent conflicts during active migration. Track progress visibly so all teams can see the overall status. Conduct a joint retrospective after the migration to capture lessons learned.

## Conclusion

Cross-team Terraform migrations succeed when they have clear governance, well-defined ownership boundaries, and structured coordination protocols. The technical challenges are the same as any migration, but the human coordination adds complexity that must be explicitly managed. By establishing clear procedures, training teams, and maintaining open communication, you can execute cross-team migrations smoothly.

For related guides, see [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view) and [How to Document Terraform Migration Procedures](https://oneuptime.com/blog/post/2026-02-23-how-to-document-terraform-migration-procedures/view).
