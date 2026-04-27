# Validation Summary: How to Generate Random Passwords with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL configuration language)
- hashicorp/random provider (`random_password` resource)
- AWS provider (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_db_instance`)
- Base64 encoding (for Kubernetes-style secret values)

## Sources Consulted
- hashicorp/random provider `random_password` documentation: https://github.com/hashicorp/terraform-provider-random/blob/main/docs/resources/password.md
- terraform-provider-random releases (version validation): https://github.com/hashicorp/terraform-provider-random/releases
- Terraform/OpenTofu lifecycle meta-argument behaviour (general knowledge cross-checked against the official docs)

## Issues Found
- **Step 4 — misleading comment about a non-existent `lifecycle` block.** The original code in the `aws_db_instance` example contained the comment `# lifecycle block prevents password from causing destroy/recreate`, but no `lifecycle` block was actually present in the resource. This would either confuse readers (who would look for a block that isn't there) or lead them to believe the protection was active when it wasn't. Replaced the comment with an actual `lifecycle { ignore_changes = [password] }` block that does what the comment described, since this is the standard way to prevent provider drift on a resource-managed password attribute.

## Review Notes
- The `numeric` argument used in Step 2 is the current (non-deprecated) attribute name; the older `number` argument was deprecated in favor of `numeric` in v3.4.0 of the random provider. The post correctly uses `numeric`.
- The version constraint `~> 3.6` is valid and currently allows resolution to versions in the 3.6.x and later 3.x series (current latest at the time of review is 3.8.1).
- In Step 2, the explicit `lower = true`, `upper = true`, and `numeric = true` are technically redundant (these are the defaults), but they are not incorrect and are reasonable for documentation/illustration purposes.
- The `aws_db_instance` example omits other required arguments (e.g. `instance_class`, `allocated_storage`, `skip_final_snapshot`) — this is acceptable for an illustrative snippet focused on password wiring, but readers should not copy it verbatim expecting a working RDS deployment.
- The claim that `length = 48` produces a 64-character base64 output is correct: 48 bytes encode to 64 base64 characters with no padding.
- The `random_password` resource does use Go's `crypto/rand` package, so the "cryptographically secure" framing in the Overview is accurate.
