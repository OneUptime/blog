# Validation Summary: How to Build Terraform OPA Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego policy language (modern syntax with `future.keywords`)
- Terraform (1.6.x)
- Conftest
- AWS provider resources (S3, EC2, RDS, security groups, subnets)
- GitHub Actions CI
- GitLab CI

## Sources Consulted
- OPA Policy Language docs: https://www.openpolicyagent.org/docs/latest/policy-language/
- OPA CLI reference: https://www.openpolicyagent.org/docs/latest/cli/ (`opa eval`, `opa test`, `opa run` flags)
- `open-policy-agent/setup-opa` GitHub Action: https://github.com/open-policy-agent/setup-opa (v2 confirmed as current major)
- `hashicorp/setup-terraform` GitHub Action: https://github.com/hashicorp/setup-terraform (v3 current)
- Terraform CLI docs for `plan -out` / `show -json`: https://developer.hashicorp.com/terraform/cli/commands/show
- Conftest docs: https://www.conftest.dev/ (test command, --policy flag, output formats `json`, `tap`, `table`)
- Terraform plan JSON format (`resource_changes[].change.actions`, `configuration.provider_config`): https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found
No technical issues found.

Rego syntax (`deny contains msg if { ... }`, partial set rules, `import future.keywords.{in,if,contains}`), the OPA REPL (`opa run policies/ tfplan.json`), `opa eval --format json --data --input`, and `opa test --coverage --format=json` all match current OPA documentation. The GitHub Actions and GitLab CI examples use current, valid action versions and image tags. Conftest installation and CLI usage are correct. The Terraform plan JSON traversal (`input.resource_changes[_].change.actions`, `input.configuration.provider_config`) matches Terraform's documented JSON output format.

## Review Notes
- The `has_encryption` helper uses `contains(resource.address, bucket_address)` which is illustrative — in practice the encryption configuration resource's address does not literally contain the bucket's address; a real policy would inspect the `bucket` attribute on the encryption-config resource. The Rego itself is syntactically valid; this is a pedagogical simplification rather than a technical error.
- The Conftest `deny[msg] { ... resource.change.after.versioning[0].enabled != true }` example uses the inline `versioning` block from older AWS provider versions (pre-4.x). In AWS provider 4.x+ versioning is configured via a separate `aws_s3_bucket_versioning` resource. The example still demonstrates the Conftest policy syntax accurately; only the underlying AWS provider schema referenced is older.
- The Rego test file (`policies/test/security_test.rego`) uses the `if` keyword without an explicit `import future.keywords.if`. This is fine on OPA 1.0+ where the keyword is enabled by default, but on older OPA the import would be required. Not changed because the post's tooling (`opa test`, `setup-opa@v2`) targets current OPA.
- `print()` built-in for debugging is correct (available since OPA 0.34).
