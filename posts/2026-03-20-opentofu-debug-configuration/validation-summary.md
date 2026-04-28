# Validation Summary: How to Debug OpenTofu Configuration Issues - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI v1.6+, examples reference v1.7.0)
- HCL configuration (terraform block, providers, backends, locals, variable validation)
- AWS provider (`hashicorp/aws ~> 5.0`)
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD workflow with plan/apply pattern)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu 1.7.0 release: https://github.com/opentofu/opentofu/releases/tag/v1.7.0
- `opentofu/setup-opentofu` releases (via `gh api`) — confirmed v2.0.0 was published 2026-03-16, v1 line still receives patch releases
- GitHub deprecation notice for v3 artifact actions: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/ (v3 deprecated and stopped working on 2025-01-30)
- `aws-actions/configure-aws-credentials` — v4 confirmed current

## Issues Found
1. **`actions/upload-artifact@v3` → `v4`** (Step 4 workflow). v3 was deprecated and stopped working on 2025-01-30; jobs pinned to v3 fail. Updated to v4.
2. **`actions/download-artifact@v3` → `v4`** (Step 4 workflow). Same deprecation as above. Updated to v4. Note: v4 is not backward-compatible with v3-uploaded artifacts, but here both upload and download are upgraded together so the pair stays consistent.
3. **`opentofu/setup-opentofu@v1` → `v2`** (both jobs in Step 4 workflow). v2.0.0 was published 2026-03-16, four days before this post's date. Updated to the current major to keep the example in line with the current recommendation.

## Review Notes
- The `common_tags` local declared in Step 6 is not referenced anywhere in the snippet. This is illustrative only and not a technical error.
- The plan/apply split in the GitHub Actions workflow relies on the binary plan file being valid against the same state and provider versions at apply time; this is the documented OpenTofu behavior and is correct as written.
- `tofu plan -refresh-only` is the correct way to detect drift without proposing changes.
- `TF_LOG` accepts `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, and `JSON` (for structured logs); the values used in the post (`INFO`, `DEBUG`) are valid.
- The post is titled around "debugging" but the bulk of the content is general OpenTofu setup/CI scaffolding rather than debugging-specific guidance. Technically correct, but the framing could be tightened in a future revision.
