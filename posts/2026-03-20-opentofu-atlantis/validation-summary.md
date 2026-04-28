# Validation Summary: How to Set Up OpenTofu with Atlantis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, HCL configuration, state management, variable validation)
- Atlantis (self-hosted PR automation server for Terraform/OpenTofu)
- AWS provider (S3 + DynamoDB backend)
- GitHub (webhooks, PR comments)
- Docker (running the Atlantis server)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu backend `s3` configuration: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- Atlantis server configuration: https://www.runatlantis.io/docs/server-configuration.html
- Atlantis repo-level `atlantis.yaml` reference: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis "Using Atlantis" (PR commands): https://www.runatlantis.io/docs/using-atlantis.html
- Atlantis webhook configuration: https://www.runatlantis.io/docs/configuring-webhooks.html
- Atlantis deployment / Docker image: https://www.runatlantis.io/docs/deployment.html
- Atlantis OpenTofu integration blog: https://www.runatlantis.io/blog/2024/integrating-atlantis-with-opentofu

## Issues Found

1. **Step 4 covered the wrong tool.** The post's title, description, and introduction promise Atlantis configuration, but the original Step 4 ("Set Up Automation") instead defined a GitHub Actions workflow with `actions/checkout`, `opentofu/setup-opentofu`, and `actions/upload-artifact@v3`. This contradicted the entire premise of the post and did not deliver the advertised "automated OpenTofu plan and apply from pull request comments" workflow (Atlantis's signature feature).

   **Fix:** Replaced the GitHub Actions YAML in Step 4 with a proper Atlantis setup that includes:
   - Running the official `ghcr.io/runatlantis/atlantis` Docker image with the correct `ATLANTIS_*` environment variables, including `ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu` for OpenTofu support.
   - Configuring the GitHub webhook (URL, content type, secret, and the four required events: Pull request reviews, Pushes, Issue comments, Pull requests).
   - A repo-level `atlantis.yaml` (version 3) using `terraform_distribution: opentofu`, `terraform_version: v1.7.0`, `autoplan`, and `apply_requirements: [approved, mergeable]`.
   - The standard PR comment commands (`atlantis plan`, `atlantis plan -- -var-file=...`, `atlantis apply`, `atlantis unlock`, `atlantis help`), which all match the documented Atlantis CLI surface.

   As a side benefit, this fix also removes the deprecated `actions/upload-artifact@v3` / `actions/download-artifact@v3` references that the original Step 4 contained.

## Review Notes

- Steps 1, 2, 3, 5, and 6 are technically accurate. The S3 backend block, provider `default_tags`, locals, and `variable` validation block all match current OpenTofu/HCL syntax.
- `tofu plan -refresh-only` is the documented way to detect drift without applying changes, and `tofu show tfplan` correctly renders a binary plan file in human-readable form.
- The `terraform { ... }` block is the canonical name even in OpenTofu — `tofu` does not introduce a separate top-level block name, so the post's usage is correct.
- The post pins `terraform_version: v1.7.0` in the Atlantis config and `OpenTofu v1.6+` in the prerequisites; these are mutually consistent (1.7.0 satisfies 1.6+). Newer OpenTofu releases (1.8.x, 1.9.x) exist but the example's pinned 1.7.0 remains valid.
- Atlantis's `terraform_distribution` field has been documented since the v0.25–v0.29 series; users on very old Atlantis versions should upgrade if `terraform_distribution: opentofu` is rejected.
- For production use, readers should put Atlantis behind TLS and consider running it on Kubernetes/ECS with a persistent volume; the Docker `run` example is intentionally a quickstart, not a production deployment.
