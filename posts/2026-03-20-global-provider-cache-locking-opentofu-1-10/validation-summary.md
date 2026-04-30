# Validation Summary: How to Use Global Provider Cache Locking Introduced in OpenTofu 1.10

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTofu 1.10 CLI
- OpenTofu CLI configuration (`.tofurc`, `plugin_cache_dir`, `provider_installation`)
- OpenTofu environment variables (`TF_PLUGIN_CACHE_DIR`)
- GitHub Actions workflows
- Docker
- Shell commands for cache inspection (`mkdir`, `du`, `find`, `sort`, `head`)

## Sources Consulted
- [OpenTofu 1.10: What's new](https://opentofu.org/docs/v1.10/intro/whats-new/)
- [OpenTofu CLI configuration file](https://opentofu.org/docs/v1.11/cli/config/config-file/)
- [OpenTofu environment variables](https://opentofu.org/docs/cli/config/environment-variables/)
- [OpenTofu provider network mirror protocol](https://opentofu.org/docs/internals/provider-network-mirror-protocol/)
- [OpenTofu 1.10.0 release announcement](https://opentofu.org/blog/opentofu-1-10-0/)
- [GitHub Docs: GitHub-hosted runners](https://docs.github.com/en/actions/how-tos/using-github-hosted-runners/using-github-hosted-runners/about-github-hosted-runners)
- [GitHub Docs: Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions)
- [GitHub Docs: Using labels with self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/using-labels-with-self-hosted-runners)
- [opentofu/setup-opentofu action README](https://github.com/opentofu/setup-opentofu)

## Issues Found
1. **Locking guarantees were stated too absolutely**: The post said shared caches could be used "without conflicts" and implied unconditional safety. OpenTofu's CLI configuration docs describe the provider cache as making a best effort to be concurrency-safe using standard filesystem locking, with guarantees depending on the operating system and filesystem. I updated the introduction, description, and summary to reflect that nuance.
2. **The GitHub Actions CI example did not actually demonstrate a shared cache**: `ubuntu-latest` jobs run on separate fresh GitHub-hosted VMs, so the original `plan-prod` and `plan-staging` jobs would not share `~/.tofu/plugin-cache` at runtime. The original snippet also wrote `plugin_cache_dir` to `/root/.tofu/plugin-cache` while creating `~/.tofu/plugin-cache`, and it did not install OpenTofu before calling `tofu init`. I corrected the example to target self-hosted runners with a shared cache path, set `TF_PLUGIN_CACHE_DIR` consistently, and install OpenTofu before running `tofu init`.
3. **The Docker example was incomplete for a real `tofu init` run**: The original `docker run` command mounted only the cache volume, not the working directory containing the OpenTofu configuration. I fixed it by mounting `$PWD` to `/workspace` and setting the container working directory explicitly.
4. **The cache-inspection command did not match the example paths shown**: `du -sh "$TF_PLUGIN_CACHE_DIR"/*/*` would only summarize much shallower directories than the example output paths. I replaced it with a `find ... -mindepth 5 -maxdepth 5` command so it targets the provider-version-platform directories shown in the examples.

## Review Notes
- The `.tofurc` example using `plugin_cache_dir` is valid, and the earlier shell example correctly creates the cache directory first. OpenTofu does not create the plugin cache directory automatically.
- The network mirror example is technically valid: it uses an HTTPS base URL with a trailing slash and excludes direct access to `registry.opentofu.org/*/*`, which is the right pattern when mirrored providers should come only from the internal mirror.
- The cache directory should not also be used as a filesystem mirror directory. This post's network mirror example keeps those concerns separate, so no change was needed there.
