# Validation Summary: How to Integrate Plan JSON Analysis in CI/CD for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- AWS OIDC authentication for GitHub Actions
- Python 3
- GitHub Actions artifact upload and download
- Pull request commenting in GitHub Actions

## Sources Consulted
- OpenTofu install docs: https://opentofu.org/docs/intro/install/
- OpenTofu setup action README: https://github.com/opentofu/setup-opentofu
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifact docs: https://docs.github.com/en/actions/tutorials/store-and-share-data
- AWS credentials action README: https://github.com/aws-actions/configure-aws-credentials
- Sticky PR comment action README: https://github.com/marocchino/sticky-pull-request-comment
- OpenTofu releases page: https://github.com/opentofu/opentofu/releases

## Issues Found
- The manual OpenTofu install URL used `https://github.com/opentofu/opentofu/releases/latest/download/tofu_linux_amd64.tar.gz`, but current OpenTofu release assets include the version in the filename. I replaced the broken manual install with `opentofu/setup-opentofu@v2` and disabled the wrapper for plain CLI behavior.
- The workflow only triggered on `pull_request`, so the `apply` job condition for `push` to `main` could never evaluate true. I added a `push` trigger for `main` with the same `infra/**` path filter.
- The `plan` job explicitly scoped `permissions` but omitted `contents: read`. GitHub documents that unspecified permissions become `none` once any permission is set, so `actions/checkout` could fail. I added `contents: read`.
- The `Analyze Plan` step attempted to write `$?` to `$GITHUB_OUTPUT` after a command that intentionally exits non-zero on destructive changes. GitHub Actions bash steps use fail-fast behavior, so that step would stop before writing the output. I changed it to `continue-on-error: true` and gated later on `steps.analyze.outcome`.
- Once the workflow also runs on `push`, the PR comment step must be limited to pull request events. I added `if: github.event_name == 'pull_request'`.
- The apply job was missing AWS authentication, repository checkout, OpenTofu installation, an initialization step, and an artifact download path aligned with `working-directory: infra`. I added those so the saved plan can actually be applied from a fresh runner.
- I updated `tofu show -json tfplan` to the current explicit `tofu show -json -plan=tfplan` form recommended by the OpenTofu CLI docs.

## Review Notes
- OpenTofu documents that saved plan files and `tofu show -json` output can contain sensitive values in cleartext. Treat `tfplan` and `plan.json` as sensitive artifacts and limit retention and access accordingly.
- GitHub documents that pull request workflows from forks usually do not receive write-scoped `GITHUB_TOKEN` permissions unless repository settings explicitly allow them. In those cases, automated PR commenting may be read-only or unavailable.
