# Validation Summary: How to Use OPA Conftest for Policy Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Open Policy Agent (OPA)
- Rego v1
- Conftest
- Kubernetes manifests
- Terraform HCL and plan JSON
- Dockerfile parsing
- GitHub Actions
- GitLab CI
- OCI policy bundles

## Sources Consulted
- Conftest documentation: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Conftest installation documentation: https://www.conftest.dev/install/
- Conftest sharing policies documentation: https://www.conftest.dev/sharing/
- Conftest output documentation: https://www.conftest.dev/output/
- Conftest parser source: https://github.com/open-policy-agent/conftest/blob/master/parser/parser.go
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Local Conftest v0.68.2 CLI help and test runs for `test`, `verify`, `pull`, and `push`.

## Issues Found
- The Kubernetes sample output summary said `3 tests, 0 passed, 0 warnings, 3 failures`. Current Conftest counts all evaluated rules, including the passing privileged-container rule, so I changed it to `4 tests, 1 passed, 0 warnings, 3 failures, 0 exceptions`.
- The Terraform policy used `input.resource.aws_*[name]` as if each resource value were a single object. Conftest's HCL2 parser represents named resources as arrays, so several rules would not fire for raw `.tf` input. I updated the policy to normalize raw HCL resources with `input.resource[type][name][_]`.
- The Terraform plan example reused raw HCL policy shape against `terraform show -json` output. Terraform plan JSON exposes resources under `resource_changes`, so I updated the policy to also normalize managed, non-delete `resource_changes` and evaluate `change.after`.
- The Terraform stdin command used `--input hcl2`, which is not a current Conftest `test` flag. I changed it to `--parser hcl2`.
- The Terraform conversion comment said "Convert HCL to JSON" for `terraform show -json plan.out`; that command converts a saved Terraform plan or state file, not raw HCL. I changed the comment to "Convert a saved plan to JSON".
- The OCI bundle examples omitted the explicit `oci://` scheme. I added it to the `conftest push` and `conftest pull` examples for clarity with OCI registry usage.

## Review Notes
- The Dockerfile, warning-rule, output-format, CI, and policy-verification examples are compatible with current Conftest and Rego v1 syntax.
- The S3 ACL examples are still syntactically valid policy examples, but modern AWS provider configurations often manage bucket ACLs and public access controls with separate resources. A future revision could add examples for `aws_s3_bucket_acl` and `aws_s3_bucket_public_access_block`.
