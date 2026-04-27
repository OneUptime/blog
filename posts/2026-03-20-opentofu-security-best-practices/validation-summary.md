# Validation Summary: How to Explain OpenTofu Security Best Practices

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (1.7+ state encryption, 1.11+ ephemeral resources)
- Terraform / HCL configuration language
- AWS provider (`hashicorp/aws`)
- AWS S3 backend
- AWS IAM policies
- AWS Secrets Manager
- AWS KMS
- GitHub Actions (CI/CD)

## Sources Consulted
- OpenTofu state encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu variables documentation: https://opentofu.org/docs/language/values/variables/#suppressing-values-in-cli-output
- OpenTofu outputs documentation: https://opentofu.org/docs/language/values/outputs/#sensitive-suppressing-values-in-cli-output
- OpenTofu 1.11.0 release notes (ephemeral resources): https://opentofu.org/blog/opentofu-1-11-0/
- AWS Provider CHANGELOG (ephemeral `aws_secretsmanager_secret_version` added in v5.77.0)
- AWS IAM Policy Grammar: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html

## Issues Found
1. **Section 6 — Invalid JSON in IAM policy example**: The IAM policy JSON contained a `// Only the specific actions needed` line comment. JSON (RFC 8259) does not support `//` comments, and AWS IAM rejects such documents with a `MalformedPolicyDocument` error. **Fix**: Removed the inline comment. Also added the standard `"Version": "2012-10-17"` field to the policy document, which is the recommended IAM policy version and aligns with the post's "best practices" framing.

## Review Notes
- Section 4 (State encryption): The `pbkdf2` key provider has a documented minimum passphrase length of 16 characters. The example uses `var.state_encryption_passphrase` so this is a runtime concern, not a code error. Optional defaults (`iterations` 600,000, `hash_function` sha512, etc.) are sensible and don't need to be set explicitly.
- Section 5 (Ephemeral resources): Ephemeral resources require OpenTofu 1.11+ (released December 2025) and AWS provider v5.77.0+ (November 2024). The post doesn't explicitly state these version requirements, but since the post is dated 2026-03-20, both versions are widely available. A small version note (similar to the "OpenTofu 1.7+" note in Section 4) could be a future improvement.
- Section 8 (Pinning): Exact version pinning (`= 5.50.0`) is shown as a "production" choice. Worth noting that exact pins also block patch-level security updates, so combining exact pins with the lock file (`.terraform.lock.hcl`) and a regular update cadence is the typical pragmatic approach. The summary already mentions committing the lock file.
- All other sections (provider auth, sensitive variables, S3 backend encryption, GitHub Actions environment gating) are technically accurate and use current syntax.
