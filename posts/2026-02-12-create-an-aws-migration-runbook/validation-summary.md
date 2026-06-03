# Validation Summary: How to Create an AWS Migration Runbook

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- AWS migration planning and cutover runbooks
- Amazon EC2
- Amazon EBS
- Elastic Load Balancing target groups and health checks
- Amazon RDS read replica promotion
- Amazon Route 53 DNS TTL behavior
- PostgreSQL `psql` and recovery status functions
- Bash validation scripting
- Git-based runbook version control

## Sources Consulted
- AWS Prescriptive Guidance, "Cutover runbook": https://docs.aws.amazon.com/prescriptive-guidance/latest/cutover-runbook/create-cutover-runbook.html
- AWS Prescriptive Guidance, "Application migration process": https://docs.aws.amazon.com/prescriptive-guidance/latest/cutover-runbook/app-migration.html
- AWS Prescriptive Guidance, "Pre-cutover stage": https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-migration-cutover/pre-cutover-stage.html
- Elastic Load Balancing documentation, "Health checks for Application Load Balancer target groups": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS CLI documentation, `elbv2 register-targets`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/register-targets.html
- Amazon RDS documentation, "Promoting a read replica to be a standalone DB instance": https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- PostgreSQL documentation, "System Administration Functions": https://www.postgresql.org/docs/current/functions-admin.html
- Amazon Route 53 documentation, "Values specific for simple records": https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html
- Amazon Route 53 documentation, "Best practices for Amazon Route 53 DNS": https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html
- Linux `execve(2)` manual page for interpreter script/shebang behavior.
- GNU Bash 5.2 local syntax check with `bash -n`.

## Issues Found
- The bash validation script placed a comment before `#!/bin/bash`. On Unix-like systems, an interpreter directive must be the first line of an executable script. Moved the shebang to the first line and kept the descriptive comment immediately after it.
- The runbook checklist and cutover step referred to configuring a load balancer with health checks disabled and then enabling health checks during cutover. For Application Load Balancer target groups, the correct operational framing is to configure health checks and register targets, then wait for targets to become healthy. Updated the checklist and execution step accordingly.

## Review Notes
- The RDS read replica promotion example is technically correct as a generic RDS workflow, but real runbooks should note that RDS promotion reboots the replica and can take several minutes or longer depending on replica size and state.
- The Route 53 TTL guidance is directionally correct. In a production runbook, the lead time should be based on the previous TTL value and any resolver behavior outside Route 53 control.
