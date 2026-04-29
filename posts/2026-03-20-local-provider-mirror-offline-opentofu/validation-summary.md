# Validation Summary: How to Create a Local Provider Mirror for Offline OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider mirrors (`filesystem_mirror` and `network_mirror`)
- OpenTofu CLI configuration (`.tofurc`, `TF_CLI_CONFIG_FILE`)
- HCL
- NGINX
- Shell scripting
- cron

## Sources Consulted
- OpenTofu docs: CLI Configuration File — https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu docs: Command: providers mirror — https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu docs: Provider Network Mirror Protocol — https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu docs: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- OpenTofu docs: Dependency Lock File — https://opentofu.org/docs/language/files/dependency-lock/
- Datadog docs: Terraform integration — https://docs.datadoghq.com/integrations/terraform/
- NGINX docs: `types` directive — https://nginx.org/en/docs/http/ngx_http_core_module.html#types
- NGINX docs: `add_header` directive — https://nginx.org/en/docs/http/ngx_http_headers_module.html
- NGINX docs: `http2` directive — https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The introduction said a mirror would "pin exact provider versions." I changed that to "control which provider versions are available" because exact pinning depends on the selected versions and lock file, not the mirror directory by itself.
- The setup example wrote `/tmp/mirror-setup/main.tf` without first creating `/tmp/mirror-setup`. I added `mkdir -p` so the command works as written.
- The mirror directory example omitted `index.json`, even though `tofu providers mirror` generates JSON index files for network-mirror compatibility. I updated the tree to reflect the documented output more accurately.
- The OpenTofu CLI config example used `~/.terraform.rc` and `/etc/opentofu/terraform.rc`. I corrected these to `.tofurc` and a `*.tfrc` example path to match current OpenTofu documentation.
- The `direct` fallback excluded only two of the four mirrored providers. I added `helm` and `random` so the example does not still consult the upstream registry for some mirrored providers.
- The multi-platform section used `GOOS` and `GOARCH` environment variables with `tofu providers mirror`. I replaced that with the documented `-platform=OS_ARCH` flags, which are the supported interface for selecting mirror target platforms.
- The maintenance script refreshed only the current host platform. I updated it to use the same explicit `-platform` flags so a multi-platform mirror remains complete when it is refreshed.
- The nginx example used `add_header Content-Type ...` to set MIME types for static files. I changed it to use nginx `types` mappings instead, and also updated the HTTP/2 configuration from deprecated `listen 443 ssl http2;` syntax to `listen 443 ssl;` with `http2 on;`.
- The version-locking example created a second provider file in the same directory as the earlier example, which could create conflicting provider requirements. I moved it into its own temporary directory.
- The third-party provider example reused the original temp directory and asserted a specific generated path. I moved it into its own temporary directory and generalized the comment so it remains correct without depending on registry namespace path casing.

## Review Notes
- The provider version numbers shown in the examples are illustrative and may become dated over time without making the post technically incorrect.
- For teams that commit `.terraform.lock.hcl` and run OpenTofu on multiple platforms, `tofu providers lock -platform=...` can be useful to pre-populate platform-specific checksums. The current post does not cover that command, but its omission is not a correctness issue for the mirror workflow described here.
- The local workspace did not have a `tofu` binary installed, so command behavior was verified against official documentation rather than local `tofu -help` output.
