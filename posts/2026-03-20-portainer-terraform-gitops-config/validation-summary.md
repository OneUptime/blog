# Validation Summary: How to Set Up GitOps for Portainer Configuration with Terraform (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Terraform
- Terraform S3 backend
- GitHub Actions
- GitOps

## Sources Consulted
- Portainer Terraform provider repository: https://github.com/portainer/terraform-provider-portainer
- Portainer `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform state/backends docs: https://developer.hashicorp.com/terraform/language/state/backends
- Terraform `plan` command docs: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform releases page: https://github.com/hashicorp/terraform/releases
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub `GITHUB_TOKEN` permissions docs: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token
- GitHub deployment environments docs: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- `actions/github-script` documentation: https://github.com/actions/github-script

## Issues Found
- The prerequisites said GitHub or GitLab would hold Terraform state. I changed that to Terraform configuration, because Terraform state should live in a backend such as S3 or Terraform Cloud rather than in Git.
- The S3 backend example used `dynamodb_table` for locking. I replaced it with `use_lockfile = true` because DynamoDB-based locking is deprecated in current Terraform S3 backend documentation.
- The original Terraform version examples (`required_version = ">= 1.0"` and `terraform_version: "1.7.0"`) were too old for the updated native S3 lockfile configuration. I raised the minimum Terraform version to `>= 1.10` and pinned the GitHub Actions examples to `1.14.5` so the backend example is consistent with the current S3 locking approach.
- The provider example used `skip_tls_verify`, which is not the current Portainer provider argument name. I corrected it to `skip_ssl_verify`.
- The `portainer_environment` module used invalid resource arguments (`environment_url`, `environment_type`, and `tls`). I corrected them to the current resource schema (`environment_address`, `type`, and `tls_enabled`) based on the official Portainer provider docs.
- The Kubernetes module example omitted the required environment address. I added a placeholder Kubernetes API endpoint so the example matches the documented required arguments.
- The PR plan workflow did not trigger on `terraform.tfvars` or stack file changes. I expanded the path filters so the workflow runs when those managed inputs change.
- The PR plan workflow could hide Terraform failures because the output was piped through `tee` without a shell configuration that enables `pipefail`. I set the step to `shell: bash` so the pipeline fails correctly on Terraform errors.
- The PR comment script contained an invalid JavaScript template literal because the Markdown code fence backticks were embedded directly inside a template string. I rewrote the comment body construction and used `await github.rest.issues.createComment(...)`.
- The PR comment workflow did not explicitly request token permissions needed to comment reliably in repositories with restricted defaults. I added `contents: read` and `issues: write`.
- The apply workflow only watched environment and stack files. I added `modules/**/*.tf` and `environments/**/*.tfvars` so merges that change modules or tfvars still trigger `terraform apply`.
- The apply workflow comment implied that simply naming an environment guarantees manual approval. I clarified that approval depends on environment protection rules such as required reviewers.
- The drift detection workflow would exit incorrectly under GitHub Actions' default `bash -e` behavior when `terraform plan -detailed-exitcode` returned `2`, and it also omitted the AWS credentials needed for the configured S3 backend. I added explicit handling for exit codes, pinned the Terraform version for consistency, and added the missing AWS credential environment variables.

## Review Notes
The examples are now consistent with current Portainer provider and Terraform backend documentation. The GitHub Actions examples still assume pull requests originate from branches that can access the required secrets and write comments; fork-based PR workflows would need additional design changes.
