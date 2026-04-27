# Validation Summary: Using the Provider Plugin Cache in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI, plugin cache, `.tofurc` config file)
- Terraform (compatibility - `.terraformrc`, lock file)
- HCL (CLI config syntax)
- Bash / shell (env vars, mkdir, find, du, mount)
- Docker / Dockerfile
- GitHub Actions (`actions/checkout`, `actions/cache`)
- NFS (shared filesystem)

## Sources Consulted
- OpenTofu CLI Configuration File: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Provider Installation / Plugin Cache: https://opentofu.org/docs/cli/config/config-file/#provider-installation
- Terraform CLI Config File (HashiCorp): https://developer.hashicorp.com/terraform/cli/config/config-file
- OpenTofu install (Debian/Ubuntu): https://opentofu.org/docs/intro/install/deb/
- OpenTofu issue #1483 — Concurrent access to plugin cache: https://github.com/opentofu/opentofu/issues/1483
- Terraform issue #27399 — `zh` hashes missing with plugin cache: https://github.com/hashicorp/terraform/issues/27399
- Terraform issue #27769 — Caching not usable due to lock file checksums: https://github.com/hashicorp/terraform/issues/27769
- HashiCorp Discuss — "Incomplete lock file information for providers": https://discuss.hashicorp.com/t/how-to-enable-plugin-caching-without-getting-incomplete-lock-file-information-for-providers-warning/51055
- actions/cache (current major version, deprecation of v3): https://github.com/actions/cache
- OpenTofu Registry — `hashicorp/aws`: https://search.opentofu.org/provider/hashicorp/aws/latest

## Issues Found

1. **Cache mechanism described as "copies" — actually uses symlinks where supported.**
   - The intro paragraph claimed OpenTofu "copies providers from the cache". Per the official docs, OpenTofu/Terraform use **symbolic links** to share cached providers with workspaces, falling back to copies only on filesystems that don't support symlinks.
   - Updated the intro paragraph and the "With cache" diagram (changed "copies from cache" to "links from cache") to reflect this.

2. **Shared Team Cache section recommended a read-only NFS mount and didn't note concurrency caveats.**
   - The cache directory must be **writable** because OpenTofu writes new providers into it on cache misses, so a read-only mount cannot serve as a general plugin cache.
   - The official docs explicitly warn the plugin cache is **not concurrency-safe** (OpenTofu issue #1483).
   - Removed the misleading "or read-only mount" wording, added a one-line caveat about writability and concurrency, and pointed readers to the provider-mirror feature for the air-gapped/team-distribution use case (which is the documented mechanism for that).

3. **Dockerfile used `apt-get install -y opentofu` against the default Ubuntu repos.**
   - OpenTofu is **not** in the default Ubuntu/Debian repos. Furthermore, when the official OpenTofu apt repository is added, the package name is `tofu`, not `opentofu`.
   - Replaced with the documented `install-opentofu.sh --install-method deb` flow, which is the canonical scripted install on Debian-based images.

4. **GitHub Actions used `actions/cache@v3`, which is deprecated.**
   - `actions/cache@v3` was officially deprecated as of February 1, 2025 when the legacy cache backend was retired. Bumped to `@v4`.

5. **Missing caveat about `.terraform.lock.hcl` `zh:` hashes when using only the plugin cache.**
   - This is a well-known issue (Terraform #27399, #27769; same behavior in OpenTofu): when providers are installed via the cache rather than freshly downloaded from the registry, only `h1:` hashes are recorded and users see an "Incomplete lock file information for providers" warning.
   - Added a short caveat paragraph to the Conclusion describing the warning and the standard `tofu providers lock -platform=...` workaround. No new section was introduced.

## Review Notes

- The `~/.tofurc` vs `~/.terraformrc` framing is correct. For completeness, OpenTofu also reads `~/.terraformrc` for backward compatibility, with `.tofurc` taking precedence when both exist — the post's wording isn't wrong, just simplified.
- `TF_PLUGIN_CACHE_DIR` is the correct environment variable; OpenTofu currently retains the `TF_*` prefix for this variable. There is no `TOFU_PLUGIN_CACHE_DIR`.
- The cache directory layout (`registry.opentofu.org/<namespace>/<type>/<version>/<os_arch>/`) and the `hashicorp/aws` namespace example are correct.
- The `_x5` suffix on provider binary filenames denotes plugin protocol version 5; this is currently accurate for AWS provider 5.x but is per-provider and could change to `_x6` for providers that adopt the v6 plugin protocol in the future.
- The `head -n -1` trick in the cache-cleanup snippet is a GNU coreutils-ism (works on Linux, not BSD/macOS `head`); not strictly an error since the surrounding examples assume Linux paths, but worth noting for macOS readers.
- The `actions/cache@v5` (Node 24) is also available as of April 2026; v4 was chosen as the safer broadly-compatible minimum.
