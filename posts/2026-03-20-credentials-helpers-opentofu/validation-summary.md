# Validation Summary: How to Use Credentials Helpers in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu CLI configuration (`.terraformrc` / `.tofurc`)
- OpenTofu credentials block and credentials helpers
- AWS Secrets Manager and HashiCorp Vault (as token sources)
- AWS ECR Docker login
- `TF_CLI_CONFIG_FILE` environment variable
- Git HTTPS authentication via `git config url.insteadOf` for private module sources

## Sources Consulted
- OpenTofu CLI Configuration File docs: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Credentials Helpers internals docs: https://opentofu.org/docs/internals/credentials-helpers/
- AWS ECR `get-login-password` CLI behavior (standard `docker login --password-stdin` pattern)
- Git `url.<base>.insteadOf` behavior (standard git-config rewrite pattern)

## Issues Found
1. **Incorrect description of the credentials helper protocol.** The post originally said: "A credentials helper is any executable that accepts a hostname on stdin and prints a JSON object containing `token` to stdout." This is wrong — OpenTofu invokes credentials helpers as `terraform-credentials-<NAME> [args...] <verb> <hostname>`, where `<verb>` is `get`, `store`, or `forget`, and the hostname is the final positional CLI argument (not stdin). Updated the description to match the actual protocol documented in OpenTofu internals.
2. **Bash example used wrong positional argument as hostname.** The script set `HOSTNAME="$1"` and the comment claimed the first argument was the hostname. With `args = []`, `$1` is actually the verb (`get`/`store`/`forget`) and `$2` is the hostname. Without handling the verb, the script would also incorrectly emit a token JSON when OpenTofu calls `store` (which sends JSON on stdin) or `forget`. Updated the script to read `VERB="$1"` and `HOSTNAME="$2"`, and to early-exit unless the verb is `get`.

## Review Notes
- The post uses `~/.terraformrc` throughout. This is technically valid because OpenTofu reads `.terraformrc` for backward compatibility, but the OpenTofu-native location is `~/.tofurc` (or XDG `$XDG_CONFIG_HOME/opentofu/tofurc`). Future readers may benefit from a note recommending the native filename for new projects.
- OpenTofu also accepts `TOFU_CLI_CONFIG_FILE` in addition to `TF_CLI_CONFIG_FILE`. The post only mentions the latter, which still works but is the backward-compat name.
- The `terraform-credentials-<NAME>` binary naming convention is intentionally kept by OpenTofu for compatibility with existing helpers (e.g., `terraform-credentials-vault`); this is correct as written.
- The ECR and Git module sections are correct and unrelated to the credentials helper protocol — they cover orthogonal authentication paths used by OpenTofu (Docker registry auth for image-pulling providers, and git's own credential mechanisms for module sources).
