# How to Plan Large-Scale Terraform Migrations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Planning, Infrastructure as Code, Enterprise

Description: Learn how to plan and execute large-scale Terraform migrations across multiple teams, environments, and cloud accounts with structured approaches and risk mitigation.

---

Large-scale Terraform migrations involve moving hundreds or thousands of resources across multiple state files, teams, and environments. Without a solid plan, these projects can drag on for months, introduce unexpected risks, and disrupt production systems. This guide provides a framework for planning and executing large-scale Terraform migrations successfully.

## What Constitutes a Large-Scale Migration

A migration is "large-scale" when it involves multiple Terraform state files or workspaces, crosses team boundaries, affects production infrastructure, includes hundreds or more resources, requires coordination across environments (dev, staging, production), or spans multiple cloud accounts or subscriptions.

## Phase 1: Discovery and Assessment

### Inventory Existing Infrastructure

```bash
# Count resources across all state files
find . -name "terraform.tfstate" -exec sh -c '
  echo "State: {}"
  terraform state list -state="{}" 2>/dev/null | wc -l
' \;

# Or for remote state, list resources per workspace
for workspace in $(terraform workspace list | tr -d '* '); do
  terraform workspace select "$workspace"
  COUNT=$(terraform state list | wc -l)
  echo "$workspace: $COUNT resources"
done
```

### Document Current Architecture

Create a map of your current Terraform setup:

```
Current State:
- 15 Terraform configurations
- 45 workspaces across 3 environments
- 2,500 total managed resources
- 8 teams contributing
- 3 cloud providers (AWS, Azure, GCP)
- Local state in 5 configs, S3 backend in 10
```

### Identify Dependencies

Map dependencies between Terraform configurations:

```
networking/ -> compute/ (provides VPC, subnet IDs)
compute/ -> monitoring/ (provides instance IDs)
iam/ -> compute/, databases/ (provides role ARNs)
databases/ -> applications/ (provides connection strings)
```

## Phase 2: Define the Target State

### Document the Goal

```
Target State:
- Modular Terraform with shared modules
- All state in HCP Terraform
- Standardized naming conventions
- Clear team ownership per workspace
- CI/CD pipeline for all configurations
- Terraform 1.x with latest provider versions
```

### Create a Resource Mapping

Map every resource from its current location to its target location:

```
Source                              Target
------                              ------
legacy/main.tf:aws_vpc.main     -> networking/vpc.tf:module.vpc.aws_vpc.this
legacy/main.tf:aws_instance.web -> compute/web.tf:module.web.aws_instance.server
monolith/db.tf:aws_db_instance  -> databases/rds.tf:module.rds.aws_db_instance.this
```

## Phase 3: Risk Assessment

### Classify Resources by Risk Level

```
High Risk (causes downtime if disrupted):
  - Production databases
  - Load balancers
  - DNS records
  - VPN connections

Medium Risk (causes degradation):
  - Auto-scaling groups
  - Cache clusters
  - Worker instances

Low Risk (no immediate user impact):
  - S3 buckets
  - IAM roles
  - CloudWatch alarms
  - Tags
```

### Define Rollback Strategies

For each risk level, define rollback procedures:

```bash
# High risk: State backup with immediate restore capability
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).json

# Medium risk: State backup with manual restore
aws s3 cp s3://state-bucket/terraform.tfstate \
  s3://state-bucket/backups/terraform.tfstate.$(date +%Y%m%d)

# Low risk: Standard version control rollback
git revert HEAD
terraform init
terraform apply
```

## Phase 4: Create the Migration Plan

### Define Migration Waves

Break the migration into waves ordered by dependency and risk:

```
Wave 1: Foundation (Week 1-2)
  - Set up target backends
  - Set up CI/CD pipelines
  - Migrate IAM resources (low dependency)
  - Migrate S3 buckets (low risk)

Wave 2: Networking (Week 3-4)
  - Migrate VPCs and subnets
  - Migrate security groups
  - Migrate route tables
  - Migrate DNS zones

Wave 3: Compute (Week 5-6)
  - Migrate EC2 instances
  - Migrate auto-scaling groups
  - Migrate load balancers

Wave 4: Data (Week 7-8)
  - Migrate RDS instances
  - Migrate ElastiCache clusters
  - Migrate DynamoDB tables

Wave 5: Applications (Week 9-10)
  - Migrate ECS/EKS services
  - Migrate Lambda functions
  - Migrate API Gateways
```

### Define Success Criteria

```
Per-wave success criteria:
  [ ] All resources migrated to target state
  [ ] terraform plan shows no changes in target
  [ ] terraform plan shows no changes in source (empty)
  [ ] No production incidents during migration
  [ ] All team members trained on new structure
  [ ] CI/CD pipelines passing
  [ ] Documentation updated
```

## Phase 5: Build Migration Tooling

### State Migration Script

```bash
#!/bin/bash
# migrate-resources.sh
# Move resources between state files

SOURCE_DIR=$1
TARGET_DIR=$2
RESOURCE_LIST=$3

# Read resource mappings from file
while IFS=',' read -r source_addr target_addr; do
  echo "Moving: $source_addr -> $target_addr"

  # Pull resource from source state
  terraform -chdir="$SOURCE_DIR" state mv \
    -state-out="$TARGET_DIR/terraform.tfstate" \
    "$source_addr" "$target_addr"

done < "$RESOURCE_LIST"

echo "Migration complete. Verify both states:"
echo "  Source: cd $SOURCE_DIR && terraform plan"
echo "  Target: cd $TARGET_DIR && terraform plan"
```

### Verification Script

```bash
#!/bin/bash
# verify-migration.sh
# Verify all configurations have clean plans after migration

CONFIGS=$(find . -name "*.tf" -exec dirname {} \; | sort -u)
FAILURES=0

for config in $CONFIGS; do
  echo "Verifying: $config"
  cd "$config"

  terraform init -upgrade > /dev/null 2>&1
  if terraform plan -detailed-exitcode > /dev/null 2>&1; then
    echo "  PASS: No changes"
  else
    echo "  FAIL: Changes detected"
    FAILURES=$((FAILURES + 1))
  fi

  cd - > /dev/null
done

echo ""
echo "Results: $FAILURES failures out of $(echo "$CONFIGS" | wc -l) configurations"
```

## Phase 6: Execute the Migration

### Pre-Migration Checklist

```
[ ] All team members notified
[ ] Change window approved
[ ] State backups taken
[ ] Rollback procedures documented
[ ] Monitoring alerts configured
[ ] CI/CD pipelines paused
```

### During Migration

```bash
# For each wave:

# 1. Take state backups
terraform state pull > pre-wave-backup.json

# 2. Execute state migrations
./migrate-resources.sh source/ target/ wave-1-resources.csv

# 3. Verify target
cd target/ && terraform plan

# 4. Verify source (should be empty or reduced)
cd source/ && terraform plan

# 5. Run smoke tests
./smoke-tests.sh

# 6. Communicate status
echo "Wave 1 complete: 250 resources migrated successfully"
```

## Phase 7: Post-Migration

### Cleanup

```bash
# Remove old configurations after all waves complete
# Archive rather than delete for safety
mv legacy/ archived/legacy-$(date +%Y%m%d)/

# Update documentation
# Update CI/CD pipelines
# Remove temporary migration tooling
```

### Retrospective

Document lessons learned:

```
Migration Retrospective:
- Total duration: 10 weeks
- Resources migrated: 2,500
- Production incidents: 0
- Rollbacks needed: 2 (Wave 3 - resolved and re-migrated)
- Key learnings:
  1. State backups before every operation saved us twice
  2. Smaller waves reduced risk significantly
  3. Automated verification caught issues early
```

## Best Practices

Never migrate production resources without testing in lower environments first. Take state backups before every operation. Migrate in small waves rather than one big bang. Automate as much as possible to reduce human error. Communicate progress to all stakeholders regularly. Have rollback procedures ready for every step. Verify with terraform plan after every state change. Pause CI/CD pipelines during active migration to prevent conflicts.

## Conclusion

Large-scale Terraform migrations succeed when they are well-planned, broken into manageable waves, and executed with proper tooling and verification. The discovery phase is as important as the execution phase because it reveals dependencies and risks that must be addressed. By following a structured approach with clear success criteria and rollback procedures, you can migrate even the most complex Terraform environments safely.

For related guides, see [How to Create Migration Plans for Terraform Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-create-migration-plans-for-terraform-projects/view) and [How to Migrate from Monolithic to Modular Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-monolithic-to-modular-terraform/view).
