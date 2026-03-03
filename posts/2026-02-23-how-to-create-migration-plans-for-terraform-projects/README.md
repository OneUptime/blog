# How to Create Migration Plans for Terraform Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Planning, Documentation, Infrastructure as Code

Description: Learn how to create detailed migration plans for Terraform projects that cover resource inventory, risk assessment, execution steps, and rollback procedures.

---

A well-crafted migration plan is the foundation of any successful Terraform migration. Whether you are restructuring your codebase, changing providers, or moving to a new backend, a detailed plan ensures that all stakeholders understand the scope, risks, and timeline. This guide covers how to create comprehensive migration plans for Terraform projects.

## Components of a Migration Plan

A complete Terraform migration plan includes the following sections: scope and objectives, current state inventory, target state design, resource mapping, risk assessment, execution steps, rollback procedures, testing plan, communication plan, and timeline.

## Defining Scope and Objectives

Start by clearly defining what you are migrating and why:

```markdown
## Migration Scope

**Project**: Migrate monolithic Terraform configuration to modular structure
**Trigger**: Team scaling requires better code ownership boundaries
**Environments**: dev, staging, production
**Cloud Providers**: AWS (primary), GCP (secondary)
**Timeline**: Q1 2026 (8 weeks)

### Objectives
1. Split monolithic main.tf into domain-specific modules
2. Move from local state to S3 remote backend
3. Implement CI/CD pipeline for all configurations
4. Establish clear team ownership per module

### Out of Scope
- Provider version upgrades (separate project)
- Cloud account restructuring
- New resource provisioning
```

## Creating the Current State Inventory

Document everything about the current setup:

```bash
#!/bin/bash
# inventory.sh
# Generate a complete inventory of current Terraform setup

echo "## Current State Inventory"
echo ""

# Count configurations
echo "### Configurations"
find . -name "*.tf" -exec dirname {} \; | sort -u | while read -r dir; do
  RESOURCE_COUNT=$(cd "$dir" && terraform state list 2>/dev/null | wc -l)
  echo "- $dir: $RESOURCE_COUNT resources"
done

echo ""
echo "### Resource Types"
terraform state list | sed 's/\[.*//;s/\..*//' | sort | uniq -c | sort -rn

echo ""
echo "### Provider Versions"
terraform version -json | jq '.provider_selections'

echo ""
echo "### Backend Configuration"
grep -r "backend" *.tf | head -5
```

Example inventory output:

```markdown
### Current Inventory Summary

| Category | Count |
|----------|-------|
| Terraform configurations | 3 |
| Total resources | 450 |
| State files | 3 |
| Provider types | 4 |
| Team contributors | 12 |

### Resources by Type
| Resource Type | Count |
|---------------|-------|
| aws_instance | 45 |
| aws_security_group | 30 |
| aws_iam_role | 25 |
| aws_s3_bucket | 20 |
| aws_subnet | 18 |
| ... | ... |
```

## Designing the Target State

Document the desired end state:

```markdown
### Target Architecture

```
project/
  modules/
    networking/     # Team: Platform
      vpc.tf
      subnets.tf
      security_groups.tf
    compute/        # Team: Application
      instances.tf
      asg.tf
      alb.tf
    databases/      # Team: Data
      rds.tf
      elasticache.tf
    monitoring/     # Team: SRE
      cloudwatch.tf
      alerts.tf
  environments/
    dev/
      main.tf       # References modules
    staging/
      main.tf
    production/
      main.tf
```text

### Backend Configuration
- Type: S3 with DynamoDB locking
- Bucket: terraform-state-company
- State per environment and module
- Encryption: AWS KMS
```

## Creating the Resource Mapping

Map every resource from source to destination:

```markdown
### Resource Mapping

| Source Address | Target Address | Risk | Team |
|---------------|---------------|------|------|
| aws_vpc.main | module.networking.aws_vpc.main | Low | Platform |
| aws_subnet.public[0] | module.networking.aws_subnet.public["us-east-1a"] | Medium | Platform |
| aws_instance.web[0] | module.compute.aws_instance.web["web-1"] | High | Application |
| aws_db_instance.primary | module.databases.aws_db_instance.primary | High | Data |
| aws_cloudwatch_metric_alarm.cpu | module.monitoring.aws_cloudwatch_metric_alarm.cpu | Low | SRE |
```

## Risk Assessment

Evaluate and document risks:

```markdown
### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State corruption during migration | Low | Critical | State backups before every operation |
| Production downtime from resource recreation | Medium | Critical | Verify plan shows only moves, no destroys |
| CI/CD pipeline conflicts during migration | High | Medium | Freeze deployments during each wave |
| Team confusion about new structure | Medium | Low | Training sessions and documentation |
| Long migration window causing drift | Medium | Medium | Short migration waves with quick verification |

### Critical Resources (No-Failure Tolerance)
1. aws_db_instance.primary - Production database
2. aws_lb.production - Production load balancer
3. aws_route53_record.api - API DNS record
4. aws_elasticache_replication_group.sessions - Session cache
```

## Defining Execution Steps

Create detailed, numbered steps for each wave:

```markdown
### Wave 1: Networking (Estimated: 2 hours)

**Pre-conditions:**
- [ ] All team members notified
- [ ] State backup taken
- [ ] CI/CD pipelines paused

**Steps:**
1. Create target module directory structure
2. Write networking module configuration
3. Run `terraform validate` on new module
4. Back up current state: `terraform state pull > backup-wave1.json`
5. Move VPC resource: `terraform state mv aws_vpc.main module.networking.aws_vpc.main`
6. Move subnet resources (6 total)
7. Move security group resources (15 total)
8. Move route table resources (4 total)
9. Run `terraform plan` - verify no changes
10. Commit configuration changes

**Verification:**
- [ ] `terraform plan` shows 0 changes
- [ ] All networking resources accessible
- [ ] Application health checks passing
- [ ] No alerts triggered

**Rollback:**
If any step fails:
1. Restore state: `terraform state push backup-wave1.json`
2. Revert configuration: `git checkout .`
3. Verify: `terraform plan` shows no changes
4. Notify team of rollback
```

## Testing Plan

```markdown
### Testing Strategy

**Pre-migration testing:**
- [ ] Run migration in dev environment
- [ ] Run migration in staging environment
- [ ] Verify all smoke tests pass
- [ ] Verify terraform plan is clean post-migration

**During migration testing:**
- [ ] After each wave, run terraform plan
- [ ] After each wave, run application smoke tests
- [ ] Monitor CloudWatch for anomalies
- [ ] Check all service health endpoints

**Post-migration testing:**
- [ ] Full integration test suite
- [ ] Performance benchmarks
- [ ] Security scan
- [ ] DR recovery test
```

## Communication Plan

```markdown
### Communication Schedule

| When | Who | Channel | Message |
|------|-----|---------|---------|
| 1 week before | All engineers | Email + Slack | Migration overview and timeline |
| Day before each wave | Affected teams | Slack channel | Reminder and pre-conditions |
| Start of each wave | All engineers | Slack channel | Migration started, pipelines paused |
| After each wave | All engineers | Slack channel | Wave complete, results |
| Post-migration | All engineers | Email | Summary and new workflows |

### Escalation Path
1. Migration engineer resolves issues
2. If unresolved in 15 minutes: escalate to team lead
3. If unresolved in 30 minutes: trigger rollback
4. Post-rollback: schedule incident review
```

## Timeline Template

```markdown
### Migration Timeline

| Week | Wave | Resources | Team | Status |
|------|------|-----------|------|--------|
| 1 | Preparation | - | All | Set up tooling and test |
| 2 | Wave 1: Networking | 50 | Platform | |
| 3 | Wave 2: IAM | 35 | Security | |
| 4 | Wave 3: Storage | 25 | Data | |
| 5 | Wave 4: Compute | 80 | Application | |
| 6 | Wave 5: Databases | 15 | Data | |
| 7 | Wave 6: Monitoring | 40 | SRE | |
| 8 | Cleanup & Documentation | - | All | |
```

## Best Practices

Start with a template and customize for your project. Get buy-in from all affected teams before starting. Include rollback procedures for every step. Build in buffer time for unexpected issues. Test the migration in lower environments first. Track progress visibly so all stakeholders can see status. Review and update the plan after each wave based on lessons learned. Keep the plan in version control alongside the Terraform code.

## Conclusion

A detailed migration plan transforms a complex Terraform migration from a risky endeavor into a structured, manageable project. By documenting the current state, target state, risks, and execution steps, you give your team the clarity they need to execute confidently. The upfront investment in planning pays off through smoother execution, fewer incidents, and better team coordination.

For related guides, see [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view) and [How to Test Migrations Before Applying in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-test-migrations-before-applying-in-terraform/view).
