# Validation Summary: How to Configure ElastiCache Redis Auth Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS ElastiCache (Redis)
- AWS CLI (`elasticache` commands)
- Terraform (`aws_elasticache_replication_group`, `aws_secretsmanager_secret`)
- Python (`redis-py`, `boto3`)
- AWS Secrets Manager

## Sources Consulted
- AWS CLI reference for `elasticache create-replication-group` (`aws elasticache create-replication-group help`)
- AWS CLI reference for `elasticache modify-replication-group` (`aws elasticache modify-replication-group help`) — confirmed valid `--auth-token-update-strategy` values are `SET`, `ROTATE`, and `DELETE`
- AWS ElastiCache documentation on AUTH token management and rotation procedures
- Terraform AWS Provider documentation for `aws_elasticache_replication_group` resource
- Terraform AWS Provider documentation for `aws_secretsmanager_secret` and `aws_secretsmanager_secret_version` resources

## Issues Found

### Issue 1: Incorrect auth-token-update-strategy in rotation Step 2
- **What was wrong:** The rotation Step 2 used `--auth-token-update-strategy DELETE` to finalize the token rotation. The `DELETE` strategy is only allowed when transitioning from AUTH token authentication to RBAC (Role-Based Access Control) — it removes AUTH entirely from the cluster, which is not the intended behavior during rotation.
- **What was changed:** Replaced `DELETE` with `SET`, which finalizes the rotation by making only the new token valid while invalidating the old one. Updated the comment from "delete the old token" to "finalize the rotation".
- **Why:** The correct two-step rotation process is: (1) `ROTATE` to add a new token while keeping the old one valid, (2) `SET` with the new token to make only the new token valid. Using `DELETE` would have removed authentication entirely.

### Issue 2: Python code incorrectly parsed Secrets Manager secret as JSON
- **What was wrong:** The Python code used `json.loads(secret["SecretString"])["token"]` to extract the auth token from Secrets Manager. However, the Terraform configuration stores the token as a plain string (`secret_string = var.redis_auth_token`), not as a JSON object with a "token" key. This would cause a `json.JSONDecodeError` at runtime.
- **What was changed:** Replaced `json.loads(secret["SecretString"])["token"]` with `secret["SecretString"]` and removed the unused `import json` statement.
- **Why:** When a secret is stored as a plain string in Secrets Manager, `get_secret_value()` returns that string directly in the `SecretString` field. No JSON parsing is needed.

### Issue 3: Summary text referenced incorrect rotation workflow
- **What was wrong:** The summary said "delete the old token" as the final rotation step.
- **What was changed:** Updated to "finalize with `SET`" to match the corrected rotation procedure.
- **Why:** Consistency with the corrected rotation instructions above.

## Review Notes
- The AUTH token constraints are correctly stated: `transit-encryption-enabled` must be active before AUTH can be used.
- The AWS CLI flags (`--replication-group-id`, `--cache-node-type`, `--num-cache-clusters`, etc.) are all correct and current.
- The Terraform resource attributes (`description`, `node_type`, `transit_encryption_enabled`, `auth_token`, `subnet_group_name`) are correct for the current AWS provider.
- The recommendation to store tokens in AWS Secrets Manager rather than environment variables or code is good security practice.
- The example endpoint format (`secure-redis.abc.cache.amazonaws.com`) and port (6379 with `ssl=True`) are correct for TLS-enabled ElastiCache Redis.
