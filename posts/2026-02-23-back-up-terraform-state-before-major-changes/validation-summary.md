# Validation Summary: How to Back Up Terraform State Before Major Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI and state management
- Terraform remote backends
- AWS S3 and AWS CLI
- Google Cloud Storage and gsutil
- GitHub Actions
- GitLab CI
- Terraform AWS provider S3 resources
- Bash, jq, and JSON validation

## Sources Consulted
- Terraform CLI state pull documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform CLI state push documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform CLI providers command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers
- Terraform CLI version command documentation: https://docs.hashicorp.com/terraform/cli/commands/version
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform state refactoring documentation: https://developer.hashicorp.com/terraform/language/state/refactor
- Terraform AWS provider S3 bucket documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Amazon S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- Amazon S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- AWS CLI s3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Google Cloud Storage gsutil cp documentation: https://docs.cloud.google.com/storage/docs/gsutil/commands/cp
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitLab CI/CD YAML syntax documentation: https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- The provider upgrade example used `terraform providers -json`, but the official `terraform providers` command documentation does not list a `-json` option. Changed it to `terraform version -json | jq .provider_selections`, which is documented and records the installed provider selections.
- The GitHub Actions example defined a job without `runs-on`. GitHub Actions jobs need a runner environment unless they call a reusable workflow. Added `runs-on: ubuntu-latest`.

## Review Notes
- Terraform CLI was not installed in the local environment, so CLI behavior was verified against official documentation instead of local `--help` output.
- The backup and restore commands are technically correct, but real pipelines also need backend credentials and cloud permissions configured before these snippets can run.
