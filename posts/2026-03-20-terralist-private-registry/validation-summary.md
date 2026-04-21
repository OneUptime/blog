# Validation Summary: How to Use Terralist as a Private Registry for OpenTofu

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Terralist
- OpenTofu
- Terraform/OpenTofu private registry protocols
- OpenTofu modules and providers
- AWS provider and S3 backend
- GitHub Actions

## Sources Consulted
- Terralist official Getting Started guide: https://www.terralist.io/getting-started/
- Terralist official Installation guide: https://www.terralist.io/installation/
- Terralist official AWS S3 bucket configuration guide: https://www.terralist.io/user-guide/aws-s3-bucket-configuration/
- Terralist GitHub repository README: https://github.com/terralist/terralist
- OpenTofu official Private Registries documentation: https://opentofu.org/docs/cli/private_registry/
- OpenTofu official Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu official S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu official `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu official `tofu refresh` documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu `setup-opentofu` GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
The blog post is fundamentally not an article about using Terralist as a private registry for OpenTofu. It contains generic OpenTofu project setup, planning, applying, monitoring, and best-practice snippets, but it does not configure, deploy, authenticate to, publish to, or consume from Terralist.

Specific problems:

1. **No Terralist setup is provided.** The official Terralist workflow requires installing/running the Terralist server, configuring OAuth settings, setting `token-signing-secret` and `cookie-secret`, and starting the server with a config file. None of these appear in the post.

2. **The post omits the HTTPS requirement for registry interactions.** Terralist documents that Terraform/OpenTofu registry interactions require responses from an HTTPS endpoint; plain `localhost:5758` will not work for registry use unless it is exposed through TLS or a reverse proxy.

3. **No Terralist authentication flow is shown.** A working private registry tutorial should cover `tofu login <registry-host>` or equivalent CLI credential configuration. The post only configures cloud provider credentials.

4. **No Terralist authority or API key is created.** Terralist uses authorities as namespaces and API keys with RBAC policies for module/provider upload operations. The post never creates or references either.

5. **No module upload or provider upload is shown.** Terralist publishes modules and providers through API upload endpoints. The post contains no `curl` API calls, artifact payloads, storage configuration, module archive/source setup, or provider package metadata.

6. **No OpenTofu registry source addresses are used.** OpenTofu private registry modules require a source address prefixed with the private registry hostname, such as `<host>/<namespace>/<name>/<provider>`, and private registry providers require a provider source including the registry host. The post uses only the public `hashicorp/aws` provider and no module block.

7. **The "core feature" step does not implement the stated topic.** `tofu init`, `tofu plan`, `tofu show`, and `tofu apply` are valid OpenTofu workflow commands, but they do not set up or exercise Terralist as a private registry.

8. **The automation example is generic and partially outdated.** It does not configure Terralist credentials or private registry hostnames. It also uses `actions/upload-artifact@v3` and `actions/download-artifact@v3`, which GitHub deprecated for GitHub.com workflows starting January 30, 2025.

9. **Troubleshooting recommends `tofu refresh`.** OpenTofu documents `tofu refresh` as deprecated because it updates state without a review step; `tofu apply -refresh-only` is the recommended alternative when a refresh-only state update is needed.

Because the article's central premise is missing from the implementation and correcting it would require replacing most of the post with a real Terralist workflow, it cannot be fixed with minor technical edits. Per the review rubric's instruction not to add new sections, restructure the post, or rewrite content beyond targeted corrections, the post should be removed or completely rewritten.

## Review Notes
- The S3 backend snippet is broadly valid OpenTofu configuration. OpenTofu 1.11 documents both `use_lockfile = true` native S3 locking and `dynamodb_table` locking as supported, with no current plan to deprecate either.
- `opentofu/setup-opentofu@v1` and its `tofu_version` input are valid, but pinning `1.7.0` is old as of April 21, 2026. OpenTofu 1.11 is the current stable documentation line, and 1.12.0-beta1 has been announced.
- A replacement article should cover Terralist installation, OAuth configuration, HTTPS exposure, `tofu login`, authority/API key creation, module/provider upload, and OpenTofu `source` addresses that point at the Terralist hostname.
