# Validation Summary: How to Use Checkov for Policy Scanning with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Checkov
- GitHub Actions
- OPA
- AWS provider resources for Terraform/OpenTofu

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Policy Index for Terraform: https://www.checkov.io/5.Policy%20Index/terraform.html
- Checkov Suppressing and Skipping Policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov README: https://github.com/bridgecrewio/checkov
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- Checkov GitHub Action definition: https://github.com/bridgecrewio/checkov-action/blob/master/action.yml
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.6/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OPA Terraform docs: https://www.openpolicyagent.org/docs/terraform
- OPA overview docs: https://www.openpolicyagent.org/docs/philosophy
- Terraform Registry `aws_s3_bucket_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- Terraform Registry `aws_s3_bucket_logging`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging
- Terraform Registry `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- GitHub Docs for SARIF uploads: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- GitHub CodeQL Action: https://github.com/github/codeql-action

## Issues Found
- The introduction overstated the OPA comparison by implying OPA is specifically a plan-only tool. I changed that sentence to a generic comparison against plan-only workflows, which matches Checkov's documented source scanning behavior without mischaracterizing OPA.
- The JUnit XML example used the wrong CLI flag. I changed `--output-file` to `--output-file-path`, which is the current documented Checkov flag.
- The sample output used an outdated/inaccurate description for `CKV_AWS_20`. I updated it to match the current Checkov policy wording for the Terraform S3 ACL check.
- The "Common Checks and Their Fixes" section had mismatched and incomplete examples. I removed the unnecessary private ACL example for `CKV_AWS_20`, added the missing log bucket resources needed by the `CKV_AWS_18` logging example, and corrected the incorrect `CKV_AWS_66` MFA-delete example to the actual S3 versioning check `CKV_AWS_21`.
- The Terraform plan scan example used `--file-type terraform_plan`, which is not a current documented CLI option. I changed it to `--framework terraform_plan`.
- The GitHub Actions snippet omitted checkout, used an unpinned Checkov action reference, and used a less precise upload condition. I added `actions/checkout`, pinned Checkov to `bridgecrewio/checkov-action@v12`, and changed the SARIF upload condition to `success() || failure()` to match upstream guidance.
- The "Run only CIS AWS benchmarks" example used `--check CIS_AWS`, which is not documented as a valid `--check` selector in the current CLI reference. I replaced it with a supported wildcard example, `CKV_AWS*`.

## Review Notes
- `github/codeql-action/upload-sarif@v3` remains supported, although GitHub also supports `v4`; the post's updated snippet keeps `v3` for broad compatibility.
- A complete GitHub Actions workflow that uploads SARIF also needs appropriate job permissions, especially `security-events: write`. The post shows step-level integration rather than a full workflow skeleton.
- Checkov documentation surfaces currently show different policy-count phrasing in different places; the post's `1,000+` claim aligns with the current upstream GitHub README.
