# Validation Summary: How OpenTofu Credentials Helpers Work

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI configuration, credentials helpers)
- Terraform CLI configuration file (`~/.terraformrc`)
- HashiCorp Vault (Go API client)
- macOS Keychain (`security` CLI)
- Go (custom helper implementation)
- Bash (keychain helper script)
- GitHub Actions (CI/CD environment variables)
- `TF_TOKEN_*` environment variables

## Sources Consulted
- OpenTofu CLI Configuration File docs: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Credentials Helpers internals docs: https://opentofu.org/docs/internals/credentials-helpers/
- HashiCorp Vault Go API docs (`github.com/hashicorp/vault/api`)
- macOS `security` man page (find-internet-password / add-internet-password / delete-internet-password)

## Issues Found
No technical issues found.

Verified accurate against official OpenTofu documentation:
- Binary naming convention `terraform-credentials-{name}` (OpenTofu retains the Terraform-prefixed name for compatibility).
- Subcommand protocol: `get`, `store`, `forget`.
- Argument order: configured `args`, then the verb, then the hostname.
- JSON response shape: `{"token": "..."}` on success, `{}` when no credentials are available.
- `store` reads a JSON credentials object from the helper's stdin.
- `credentials_helper "name" { args = [...] }` HCL block syntax in `~/.terraformrc`.
- Static `credentials "<host>" { token = "..." }` block syntax.
- `TF_TOKEN_<hostname>` environment variable convention with periods replaced by underscores (e.g. `TF_TOKEN_registry_mycompany_com` for `registry.mycompany.com`).
- macOS `security find/add/delete-internet-password` flags (`-s` server, `-a` account, `-w` password, `-U` update-if-exists).
- Vault Go API usage (`vault.NewClient(vault.DefaultConfig())`, `client.Logical().Read(...)`).

## Review Notes
- The Go example's `getTokenFromVault` returns an empty string when the secret is missing, which marshals to `{"token":""}` rather than the cleaner `{}` empty-object response specified by the protocol for "no credentials available." Both behave acceptably with OpenTofu in practice, but `{}` is the more correct sentinel. Not a technical error in the prose, just a code-style consideration.
- The bash keychain `store` case uses `cat /dev/stdin | python3 -c "..."` — the `cat` is redundant since `python3` could read stdin directly, but the script is functionally correct.
- Hyphens in hostnames are not covered (they encode to double underscores in `TF_TOKEN_*`), and non-ASCII hostnames require punycode/ACE prefix — these edge cases aren't relevant to the example hostnames used, so no correction needed.
- OpenTofu also reads `~/.tofurc` (and Windows `%APPDATA%\OpenTofu\tofu.rc`) in addition to `~/.terraformrc`; the post focuses on the most common path, which is acceptable.
