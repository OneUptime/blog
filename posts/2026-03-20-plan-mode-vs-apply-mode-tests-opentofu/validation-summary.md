# Validation Summary: How to Use Plan Mode vs Apply Mode in Tests in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu test files (`*.tftest.hcl`)
- GitHub Actions
- AWS provider examples for OpenTofu/Terraform-compatible configuration

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `opentofu/setup-opentofu` action repository: https://github.com/opentofu/setup-opentofu
- AWS provider `aws_instance` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_s3_bucket` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown

## Issues Found
- The GitHub Actions workflow example placed `on` inside individual jobs, which is invalid workflow syntax. I moved the trigger definitions to the workflow root and used job-level `if` conditions to keep the intended PR-vs-main split.
- The workflow example did not check out the repository before running `tofu init` and `tofu test`, so it would not have the configuration files available on the runner. I added `actions/checkout@v5` to both jobs.
- The example used `tofu test -filter=tests/unit/` and `tofu test -filter=tests/integration/`, but OpenTofu documents `-filter` for individual test files, not directories. I replaced those commands with `-test-directory=tests/unit` and `-test-directory=tests/integration`.

## Review Notes
- The post's explanation of `command = plan` versus `command = apply` matches current OpenTofu documentation.
- The AWS assertion examples use valid attribute names (`bucket`, `instance_type`, `instance_state`, `public_ip`, and `arn`) according to the provider documentation.
- Plan-mode tests can still contact providers during refresh unless the test uses mocks, provider overrides, or `plan_options { refresh = false }`. The post's main distinction between plan mode and apply mode is still technically correct.
