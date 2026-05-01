# Validation Summary: How to Use Environment Variables with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu environment variables
- GitHub Actions
- YAML
- Shell scripting

## Sources Consulted
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu debugging documentation: https://opentofu.org/docs/v1.6/internals/debugging/
- OpenTofu CLI configuration file documentation: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- GitHub Actions variables documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs

## Issues Found
- The post described its list as covering "all" or a "complete" set of OpenTofu environment variables, but the official docs include additional documented variables such as `TF_CLI_CONFIG_FILE`, `TF_REGISTRY_DISCOVERY_RETRY`, `TF_PROVIDER_DOWNLOAD_RETRY`, `TF_STATE_PERSIST_INTERVAL`, and cloud backend environment variables. I corrected the wording to scope the article to common environment variables.
- The reference listed `TF_LOG_PATH_CORE` and `TF_LOG_PATH_PROVIDER`, which are not documented in OpenTofu's official environment variable or debugging docs. I removed those entries and kept the documented `TF_LOG_PATH`, `TF_LOG_CORE`, and `TF_LOG_PROVIDER` variables.
- The `TF_LOG` reference omitted the documented `JSON` logging mode. I added `JSON` and normalized the disabled value to `off` to match the official docs.
- The `TF_IN_AUTOMATION` section incorrectly claimed it removes prompts and makes output machine-readable. Official docs say it only changes human-readable output and suppresses follow-up suggestions. I corrected the explanation and clarified that `TF_INPUT=false` is what disables prompts.
- The local development example used `export TF_IN_AUTOMATION=false`, but OpenTofu treats any non-empty value as enabling automation mode. I replaced this with `unset TF_IN_AUTOMATION`.
- The local development profile recommended persistently exporting `TF_WORKSPACE` in a shell profile, while the official docs recommend `TF_WORKSPACE` only for non-interactive use because it is easy to forget locally. I replaced that with a comment showing manual workspace selection instead.
- The `TF_CLI_ARGS` examples used `-compact-warnings` as a global default. That flag is documented for commands such as `plan` and `apply`, but not as a safe general default for every OpenTofu command. I changed the shared example to `-no-color` and kept `-compact-warnings` on command-specific variables.
- The plugin cache example used two sequential `cd ... && tofu init` commands that would leave the shell in the first directory and make the second relative `cd` incorrect. I changed both lines to subshell form so the example works as written.
- The CI example set `TF_PLUGIN_CACHE_DIR` to `~/.opentofu-plugin-cache` inside workflow `env`. GitHub Actions workflow `env` values are literal strings unless you use expressions, so this is not a reliable way to provide an expanded absolute path to OpenTofu. I changed it to `${{ runner.temp }}/opentofu-plugin-cache`, aligned the cache path, and added a step to create the directory because OpenTofu does not create the plugin cache directory itself.
- The CI example used `opentofu/setup-opentofu@v1`, while the current action README documents `@v2`. I updated the workflow snippet to `@v2`.
- The post described `TF_PLUGIN_CACHE_DIR` as sharing providers across workspaces in some places, but the official docs describe it as a shared cache across working directories/configurations. I corrected that wording.

## Review Notes
- The post is now technically accurate for the variables and examples it covers, but it is intentionally scoped to common environment variables rather than every documented OpenTofu environment variable.
- The workflow example still pins OpenTofu CLI to `1.6.x`. That remains valid for the examples shown, but it is older than the latest OpenTofu documentation consulted during review.
