# How to Document Terraform Migration Procedures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Documentation, Migration, Best Practices, Infrastructure as Code

Description: Learn how to create clear, actionable documentation for Terraform migration procedures that teams can follow reliably and consistently across environments.

---

Well-documented Terraform migration procedures are the difference between a smooth, repeatable process and a stressful, error-prone one. Good documentation ensures that any team member can execute the migration, provides audit trails for compliance, and serves as a reference for future migrations. This guide covers how to create effective migration documentation for Terraform projects.

## Why Documentation Matters for Migrations

Migrations without documentation rely on tribal knowledge. When the person who planned the migration is unavailable, others cannot execute it safely. Documentation also helps with compliance audits, post-incident reviews, and planning future migrations. It reduces risk by making procedures explicit and reviewable.

## Essential Documentation Components

Every Terraform migration document should include these sections:

### 1. Migration Overview

```markdown
# Migration: Monolithic to Modular Terraform Structure

## Overview
- **Purpose**: Split the monolithic production Terraform configuration into
  domain-specific modules for better team ownership and faster plan times.
- **Scope**: 450 resources across networking, compute, databases, and monitoring.
- **Estimated Duration**: 4 weeks (2 hours per wave, 8 waves)
- **Risk Level**: Medium (production infrastructure involved)
- **Author**: Platform Team
- **Date**: 2026-02-23
- **Status**: Planning

## Prerequisites
- Terraform 1.9+ installed
- AWS credentials with admin access
- Access to the terraform-state S3 bucket
- Approval from change advisory board
```

### 2. Current State Documentation

```markdown
## Current State

### Architecture
- Single Terraform configuration at `infrastructure/production/`
- S3 backend: `s3://terraform-state/prod/terraform.tfstate`
- 450 managed resources
- Terraform version: 1.8.0
- AWS provider version: 5.30.0

### Resource Inventory
| Resource Type | Count | Domain |
|--------------|-------|--------|
| aws_vpc | 2 | Networking |
| aws_subnet | 12 | Networking |
| aws_security_group | 25 | Networking |
| aws_instance | 45 | Compute |
| aws_lb | 5 | Compute |
| aws_db_instance | 8 | Databases |
| aws_cloudwatch_metric_alarm | 50 | Monitoring |
| ... | ... | ... |

### Known Issues
1. Plan time exceeds 5 minutes
2. State file is 15MB
3. No team ownership boundaries
```

### 3. Target State Documentation

```markdown
## Target State

### Architecture
project/
  modules/
    networking/   (Team: Platform)
    compute/      (Team: Application)
    databases/    (Team: Data)
    monitoring/   (Team: SRE)
  environments/
    production/
      networking/  -> separate state file
      compute/     -> separate state file
      databases/   -> separate state file
      monitoring/  -> separate state file

### State Files
| Configuration | Backend Key | Team |
|--------------|-------------|------|
| networking | prod/networking/terraform.tfstate | Platform |
| compute | prod/compute/terraform.tfstate | Application |
| databases | prod/databases/terraform.tfstate | Data |
| monitoring | prod/monitoring/terraform.tfstate | SRE |
```

### 4. Step-by-Step Procedures

```markdown
## Migration Procedures

### Wave 1: Networking Resources

#### Pre-Wave Checklist
- [ ] Notify all teams in #infrastructure Slack channel
- [ ] Take state backup: `terraform state pull > backups/pre-wave1.json`
- [ ] Verify current plan is clean: `terraform plan`
- [ ] Confirm no active deployments

#### Steps

**Step 1.1: Create networking module directory**
```bash
mkdir -p modules/networking
mkdir -p environments/production/networking
```

**Step 1.2: Create module files**
Copy the following files (see Appendix A for full content):
- `modules/networking/main.tf`
- `modules/networking/variables.tf`
- `modules/networking/outputs.tf`

**Step 1.3: Create environment configuration**
Create `environments/production/networking/main.tf` with the backend
and module call.

**Step 1.4: Move state entries**
```bash
terraform state mv aws_vpc.main \
  module.networking.aws_vpc.main

terraform state mv 'aws_subnet.public[0]' \
  'module.networking.aws_subnet.public["us-east-1a"]'

# ... (list all state moves)
```

**Step 1.5: Verify**
```bash
cd environments/production/networking
terraform init
terraform plan
# Expected output: No changes.
```

#### Verification Checklist
- [ ] `terraform plan` shows no changes
- [ ] VPC connectivity verified (ping test)
- [ ] Application health checks passing
- [ ] No CloudWatch alarms triggered

#### Rollback Procedure
If any step fails:
1. Restore state: `terraform state push backups/pre-wave1.json`
2. Revert configuration: `git checkout .`
3. Verify: `terraform plan` shows no changes
4. Notify team: Post in #infrastructure channel
```text

### 5. Communication Templates

```markdown
## Communication Templates

### Pre-Migration Notification
Subject: Terraform Migration - Wave [N] Scheduled

Team,

We will be executing Wave [N] of the Terraform migration on [DATE] at
[TIME]. This wave covers [DOMAIN] resources.

**Impact**: No user-facing impact expected. Terraform operations will be
paused during the migration window (approximately [DURATION]).

**Action Required**: Please do not run any Terraform commands against the
[WORKSPACE] workspace during the migration window.

### Post-Migration Notification
Subject: Terraform Migration - Wave [N] Complete

Team,

Wave [N] of the Terraform migration is complete. [X] resources have been
successfully migrated to the new [DOMAIN] module.

**Terraform operations can resume.**

Results:
- Resources migrated: [X]
- Issues encountered: [Y or None]
- Rollbacks needed: [Z or None]
```

### 6. Troubleshooting Guide

```markdown
## Troubleshooting

### Common Issues

**Issue**: `terraform plan` shows unexpected changes after state move
**Cause**: Module configuration does not exactly match the original
**Resolution**: Compare resource attributes in state with module configuration.
Use `terraform state show [address]` to inspect.

**Issue**: State lock error during migration
**Cause**: Another process holds the state lock
**Resolution**: Verify no other processes are running, then:
`terraform force-unlock [LOCK_ID]`

**Issue**: "Resource not found" error during state move
**Cause**: Resource address does not exist in current state
**Resolution**: Check exact address with `terraform state list | grep [name]`

**Issue**: Module initialization fails
**Cause**: Missing provider configuration or invalid module source
**Resolution**: Ensure `terraform init` runs successfully before state moves
```

## Documentation Formats and Tools

Store migration documents alongside your Terraform code:

```text
infrastructure/
  docs/
    migrations/
      2026-02-migration-to-modules.md
      2026-03-provider-upgrade.md
      template.md
  modules/
  environments/
```

## Using ADRs for Migration Decisions

Architecture Decision Records document the reasoning behind migration choices:

```markdown
# ADR-003: Migrate from Monolithic to Modular Terraform

## Status
Accepted

## Context
Our monolithic Terraform configuration has grown to 450 resources.
Plan times exceed 5 minutes and teams cannot work independently.

## Decision
We will split the configuration into domain-specific modules with
separate state files.

## Consequences
- Faster plan and apply times
- Independent team workflows
- Added complexity of cross-module references
- Need for remote state data sources
```

## Best Practices

Write procedures before executing them, not after. Include exact commands with copy-paste readiness. Add verification steps after every significant operation. Include rollback procedures for every wave. Use checklists for pre-conditions and post-conditions. Keep documents in version control alongside the code. Review documentation with team members who were not involved in planning. Update documentation after each migration wave with lessons learned.

## Conclusion

Effective Terraform migration documentation transforms complex operations into repeatable, reliable procedures. By documenting the current state, target state, step-by-step procedures, and rollback plans, you enable any team member to execute the migration safely. Invest the time in documentation upfront to save far more time during execution and future reference.

For related guides, see [How to Create Migration Plans for Terraform Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-create-migration-plans-for-terraform-projects/view) and [How to Handle Cross-Team Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cross-team-terraform-migrations/view).
