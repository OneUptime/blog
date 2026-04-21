# Validation Summary: How to Enable Debug Logging with TF_LOG in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu debug logging environment variables (`TF_LOG`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`, `TF_LOG_PATH`)
- Bash shell commands
- GitHub Actions workflow configuration
- GitHub Actions artifact upload

## Sources Consulted
- OpenTofu Debugging documentation: https://opentofu.org/docs/internals/debugging/
- OpenTofu Environment Variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- GitHub Actions Workflow Syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions Contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions Expressions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- `actions/checkout` README: https://github.com/actions/checkout
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` README: https://github.com/actions/upload-artifact

## Issues Found

1. **TRACE logging was described too absolutely**: The post claimed TRACE includes "all API requests/responses" and "full HTTP request/response bodies." OpenTofu documents TRACE as the most verbose level and warns that it may contain sensitive details, but provider log contents vary. Changed the wording to say TRACE may include request/response details and sensitive data.

2. **Debug logging behavior was over-guaranteed**: The introduction and authentication scenario implied debug logs always reveal specific API/provider details. Changed those statements to "can reveal" and "may show" so they remain accurate across providers.

3. **Disable command did not match the documented form**: The post used `export TF_LOG=` to disable logging. OpenTofu documents disabling logging by unsetting `TF_LOG` or setting it to `off`. Changed the example to `export TF_LOG=off` and kept `unset TF_LOG`.

4. **`TF_LOG_PATH` wording was imprecise**: The post described saving logs as "redirecting" output. OpenTofu documents `TF_LOG_PATH` as appending logs to a specific file while logging is enabled, and `TF_LOG` must still be set. Updated the comments accordingly.

5. **GitHub Actions example was incomplete and partially outdated**: The workflow referenced a manual debug input without defining `workflow_dispatch`, omitted `runs-on`, did not check out the repository, did not install OpenTofu, and used older action major versions. Added the manual boolean input, `runs-on: ubuntu-latest`, `actions/checkout@v6`, `opentofu/setup-opentofu@v2`, and `tofu init`.

6. **Debug artifact upload would be skipped after a failing plan**: The upload step used a simple input check, so GitHub Actions' default `success()` behavior would skip log upload when `tofu plan` failed. Changed the condition to `always() && inputs.debug_enabled` so debug logs are still uploaded for failed runs.

## Review Notes
- The local environment did not have the `tofu` binary installed, so CLI behavior was verified against official OpenTofu documentation rather than local `tofu --help` output.
- The remaining shell examples use standard Unix tools. The `grep -P` option in the structured log analysis section requires GNU grep, so macOS users may need GNU grep (`ggrep`) or a different pattern.
- The AWS provider log snippets are illustrative examples; exact message text depends on provider version and provider logging implementation.
