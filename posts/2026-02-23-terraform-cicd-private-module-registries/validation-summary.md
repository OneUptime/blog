# Validation Summary: How to Handle Terraform CI/CD with Private Module Registries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules and module sources
- Terraform CLI configuration files
- HCP Terraform / Terraform Cloud private module registry
- GitHub Actions
- GitHub private repositories
- GitLab CI
- JFrog Artifactory Terraform registry
- AWS S3 module sources
- Self-hosted Terraform registry protocol

## Sources Consulted
- Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform module block and module source documentation: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module registry protocol reference: https://developer.hashicorp.com/terraform/internals/module-registry-protocol
- Terraform registry module usage documentation: https://developer.hashicorp.com/terraform/registry/modules/use
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- GitHub GITHUB_TOKEN documentation: https://docs.github.com/en/actions/concepts/security/github_token
- GitLab CI/CD job token documentation: https://docs.gitlab.com/ci/jobs/ci_job_token/
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- JFrog Artifactory Terraform repository documentation: https://docs.jfrog.com/artifactory/docs/terraform-opentofu-and-terraform-backend-repositories

## Issues Found
- Updated `hashicorp/setup-terraform@v3` to `hashicorp/setup-terraform@v4` to match the current documented major version.
- Corrected GitHub private repository authentication guidance. The default `GITHUB_TOKEN` is scoped to the workflow repository, so the post now recommends a token with read access to the module repositories and uses `MODULES_TOKEN` in the example.
- Corrected the SSH Git module source example to use Terraform's explicit Git source prefix with the scp-like SSH syntax.
- Corrected S3 module source examples for `us-east-1` to use `s3.amazonaws.com`, which Terraform documents as required for S3 bucket module sources in that region.
- Corrected the Artifactory module source example to include the repository key, namespace, module name, and provider path components required by JFrog's Terraform registry source format.
- Removed a misleading `TF_CLI_CONFIG_FILE` export from the self-hosted registry snippet because Terraform reads `~/.terraformrc` by default and the export would not persist across CI steps.
- Fixed the internal CA installation snippet to use `sudo tee`, because redirecting directly into `/usr/local/share/ca-certificates` would fail on typical GitHub-hosted runners.
- Reworked the GitLab CI private module authentication snippet to configure Git in `before_script` with `CI_JOB_TOKEN`, and clarified that access depends on GitLab's job token allowlist and permissions.
- Updated the GitLab Terraform image from `hashicorp/terraform:1.7.4` to `hashicorp/terraform:1.14.6` to align with the current Terraform version shown in HashiCorp's setup action documentation.

## Review Notes
Terraform CLI was not installed in the local environment, so CLI behavior was verified against official documentation rather than local `terraform --help` output.
