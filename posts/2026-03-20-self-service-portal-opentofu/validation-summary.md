# Validation Summary: How to Build a Self-Service Portal with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu HCL configuration
- AWS RDS
- AWS Secrets Manager managed database passwords
- Amazon S3 OpenTofu backend
- GitHub Actions
- AWS OIDC authentication for GitHub Actions
- YAML
- Bash

## Sources Consulted
- OpenTofu `yamldecode` function documentation: https://opentofu.org/docs/language/functions/yamldecode/
- OpenTofu `file` function documentation: https://opentofu.org/docs/language/functions/file/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `init`, `apply`, and `destroy` command documentation: https://opentofu.org/docs/cli/commands/init/, https://opentofu.org/docs/cli/commands/apply/, https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu setup GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- AWS provider `aws_db_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Amazon RDS DB instance storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands documentation for `$GITHUB_OUTPUT`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions scheduled workflow documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- GitHub `GITHUB_TOKEN` permissions documentation: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- `actions/checkout` documentation: https://github.com/actions/checkout
- `aws-actions/configure-aws-credentials` documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The GitHub Actions provisioning example contained invalid workflow syntax: `for each changed request file do` is not a valid step key. Removed that line and kept the iteration inside the Bash `run` block.
- The provisioning workflow wrote potentially multi-line `git diff` output directly to `$GITHUB_OUTPUT`, which can break step output parsing. Changed the file list to a space-separated single-line value before writing it to `$GITHUB_OUTPUT`.
- The provisioning workflow used deleted request files as provisioning inputs. Added `--diff-filter=AM` so cleanup commits that remove request files do not trigger provisioning against missing files.
- The workflow examples used outdated action versions. Updated `actions/checkout` to `v6` and `opentofu/setup-opentofu` to `v2` based on current official documentation.
- The workflows ran OpenTofu against AWS without configuring AWS credentials. Added `aws-actions/configure-aws-credentials@v6.1.0`, `id-token: write`, and a role-to-assume input for OIDC authentication.
- The original example relied on default local OpenTofu state in ephemeral GitHub-hosted runners, so cleanup would not have the state needed to destroy environments later. Added an S3 backend and per-environment backend configuration with `use_lockfile = true`.
- The RDS example referenced `random_password.db.result` without defining a `random_password` resource and would store the master password in state. Replaced it with `manage_master_user_password = true`, which is supported by the AWS provider for RDS-managed Secrets Manager credentials.
- The `aws_db_instance` example omitted `allocated_storage`, which is required unless creating from a snapshot or replica. Added `allocated_storage = 20`.
- The cleanup workflow called `tofu destroy` without installing OpenTofu or recreating the active working directory from the request and dynamic module files. Added the setup action, backend initialization, and active directory reconstruction before destroy.
- The cleanup workflow attempted to commit and push without configuring a Git author and would create empty cleanup commits. Added bot Git author configuration and committed only when files were staged.
- The cleanup workflow did not explicitly grant repository write permission for removing request files. Added `contents: write`.
- The cleanup loop could fail when no request files matched the glob. Added `shopt -s nullglob`.

## Review Notes
The OpenTofu snippet still assumes surrounding networking resources and variables such as `var.db_subnet_group_name`, `aws_security_group.env`, and `var.base_tags` exist elsewhere in the module. For a production portal, the cleanup script should parse YAML with a YAML-aware tool instead of `grep` and `awk`, but the shown command is correct for the exact request template format in this post.
