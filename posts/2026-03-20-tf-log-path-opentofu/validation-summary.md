# Validation Summary: How to Use TF_LOG_PATH for Log File Output in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu logging environment variables (`TF_LOG`, `TF_LOG_PATH`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`)
- Bash shell commands
- GitHub Actions workflows
- GitHub Actions artifact uploads

## Sources Consulted
- OpenTofu Debugging documentation: https://opentofu.org/docs/internals/debugging/
- OpenTofu Environment Variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu logging source code: https://github.com/opentofu/opentofu/blob/main/internal/logging/logging.go
- `opentofu/setup-opentofu` GitHub Action README and releases: https://github.com/opentofu/setup-opentofu
- `actions/checkout` GitHub Action README: https://github.com/actions/checkout
- `actions/upload-artifact` GitHub Action README: https://github.com/actions/upload-artifact
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/learn-github-actions/contexts

## Issues Found
- The post used `TF_LOG_PATH_CORE` and `TF_LOG_PATH_PROVIDER` and claimed core and provider logs could be written to separate files. OpenTofu documents and implements `TF_LOG_PATH` as the single log file path, while `TF_LOG_CORE` and `TF_LOG_PROVIDER` control log levels. Updated the example to use one shared `TF_LOG_PATH` with different core/provider log levels.
- The GitHub Actions example used older action major versions. Updated `actions/checkout@v4` to `actions/checkout@v6`, `opentofu/setup-opentofu@v1` to `opentofu/setup-opentofu@v2`, and `actions/upload-artifact@v4` to `actions/upload-artifact@v7` to match current upstream README examples.
- The long-running apply example wrote OpenTofu debug logs to `TF_LOG_PATH` and also piped terminal output through `tee` into the same file. Since `TF_LOG_PATH` already appends debug logs to its file, this could interleave two writers into one file. Updated the example to create a local `logs` directory, use a daily log path, and let `tofu apply` write debug logs through `TF_LOG_PATH`.
- The sensitive-data note stated that DEBUG/TRACE logs contain full HTTP request/response bodies. Provider logging content varies, and OpenTofu specifically warns that TRACE logs may contain sensitive details. Updated the wording to say DEBUG/TRACE logs can contain HTTP request/response details.

## Review Notes
- The local workspace did not have the `tofu` binary installed, so command validation was performed against official OpenTofu documentation and the current OpenTofu logging source code rather than local `tofu --help` output.
- The log analysis script uses `grep -P`, which is available with GNU grep on typical Linux CI runners but is not portable to default macOS BSD grep.
