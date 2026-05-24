# Validation Summary: How to Create Terraform Runbooks for Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, state, plan/apply workflow, `-chdir` flag)
- AWS CLI (ECS, RDS, S3, DynamoDB, CloudWatch)
- AWS ECS (services-stable waiter, describe-services)
- AWS RDS (read replicas, failover, StatusInfos)
- AWS S3 (object versioning, list-object-versions, get-object)
- AWS DynamoDB (Terraform state lock table)
- Bash scripting (set -euo pipefail, read prompts, parameter expansion)
- Markdown (runbook template format)

## Sources Consulted
- AWS RDS API reference — DBInstanceStatusInfo (https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DBInstanceStatusInfo.html)
- AWS RDS — Monitoring read replication (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html)
- AWS CLI reference — ecs wait services-stable (https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)
- AWS CLI reference — s3api list-object-versions (https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html)
- AWS CLI reference — s3api get-object
- AWS DynamoDB — Expression attribute values (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html)
- Terraform CLI overview — `-chdir` global option (https://developer.hashicorp.com/terraform/cli/commands)
- AWS CloudWatch — RDS ReplicaLag metric (AWS/RDS namespace)

## Issues Found
- Step 1 of the "RDS Failover to Read Replica" runbook used `--query 'DBInstances[0].{Status: DBInstanceStatus, ReplicaLag: StatusInfos[0].Normal}'`. The `StatusInfos[0].Normal` field is a **boolean** indicating whether the read replica is operating normally — it does not return replication lag in seconds. Labelling it `ReplicaLag` was misleading, and the follow-up comment "Replication lag should be less than 5 seconds" did not match what the query returns.
  - **Fix:** Renamed the query aliases to `ReplicationStatus` and `ReplicationNormal` so they accurately describe the returned fields, updated the comments to match, and added a `aws cloudwatch get-metric-statistics` invocation against the `AWS/RDS` namespace's `ReplicaLag` metric so the runbook can actually observe lag in seconds before the "less than 5 seconds" check makes sense.

## Review Notes
- All Terraform commands (`state show`, `output`, `plan -var-file -out`, `apply <plan>`, `init`, `show <statefile>`, `-chdir=`) are valid for current Terraform 1.x. `-chdir` was introduced in Terraform 0.14, so any reasonably recent installation supports it.
- `aws ecs wait services-stable` is a valid waiter that polls `DescribeServices` every 15 seconds (up to 40 attempts) until the service has a single deployment with matching running/desired counts.
- `aws s3api list-object-versions` and `aws s3api get-object --version-id` flags and positional arguments match the current CLI reference.
- `aws dynamodb scan --filter-expression` with `--expression-attribute-values '{":path": {"S": "production"}}'` uses the correct DynamoDB type-descriptor JSON syntax and placeholder convention. Note: the standard Terraform DynamoDB lock-table schema uses `LockID` as the primary key with `Info` as a non-key attribute — the scan/filter expression is a reasonable diagnostic but a `get-item` on the known `LockID` would be more efficient when the locked path is known.
- The "Promote read replica" step shown uses `-target=aws_db_instance.primary` with a `promote_replica = true` variable. In practice, promoting via Terraform requires the `replicate_source_db` argument on the existing replica resource to be removed (not just a boolean toggle); the runbook is illustrative of *one* possible wrapper around that operation rather than a prescriptive recipe, which the surrounding text supports.
- The nested code-block style (outer ```markdown fence containing inner ```bash fences that close with mismatched info strings like ```bash and ```text) is unusual but consistent throughout the post and is intentional for visually delimiting runbook examples; left as-is since it is a stylistic choice, not a technical error.
- The internal link to `https://oneuptime.com/blog/post/2026-02-23-how-to-handle-on-call-terraform-operations/view` points to a sibling post that exists in this repository.
