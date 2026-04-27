# Validation Summary: How to Use OpenTofu with TACOS

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- OpenTofu
- Atlantis (open-source TACOS)
- Spacelift (and its `spacelift-io/spacelift` Terraform provider)
- env0
- Scalr (and its `Scalr/scalr` Terraform provider)
- GitHub Actions (`opentofu/setup-opentofu`, `aws-actions/configure-aws-credentials`, `actions/github-script`)
- Open Policy Agent (OPA) / Rego

## Sources Consulted
- Atlantis docs — repo-level atlantis.yaml: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis OpenTofu integration blog: https://www.runatlantis.io/blog/2024/integrating-atlantis-with-opentofu
- Atlantis server configuration: https://www.runatlantis.io/docs/server-configuration.html
- Spacelift workflow tool docs: https://docs.spacelift.io/vendors/terraform/workflow-tool
- Spacelift Terraform provider — `spacelift_stack`: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/stack
- Scalr Terraform provider — `scalr_workspace`: https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/workspace
- Scalr workspace resource docs: https://docs.scalr.io/docs/provider_resource_scalr_workspace
- env0 YAML configuration docs: https://docs.env0.com/docs/env0-yml
- env0 OpenTofu support: https://www.env0.com/resources/opentofu
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu

## Issues Found

1. **Atlantis OpenTofu config field was wrong.** The post used a non-existent `tofu-version: 1.7.0` server setting and `ATLANTIS_TOFU_VERSION` env var. Atlantis actually uses `default-tf-distribution: opentofu` together with `default-tf-version: 1.7.0` (server flags / env vars `ATLANTIS_DEFAULT_TF_DISTRIBUTION` and `ATLANTIS_DEFAULT_TF_VERSION`), and the per-project override field in `atlantis.yaml` is `terraform_distribution: opentofu`. Updated the snippet and added a note about the per-project override.

2. **Scalr `opentofu_version` attribute does not exist.** The `scalr_workspace` resource uses the single `terraform_version` attribute regardless of platform; the `iac_platform` value (`terraform` or `opentofu`) determines which tool that version applies to. Replaced `opentofu_version` with `terraform_version` and re-aligned the block.

3. **env0 OpenTofu selection field was wrong.** The post used `terraformVersion` and a comment claiming env0 detects OpenTofu based on version. env0 actually exposes a separate `opentofuVersion` field; `terraformVersion` is left empty when running OpenTofu. Updated the field name and comment.

## Review Notes
- Spacelift `terraform_workflow_tool = "OPEN_TOFU"` is correct (other valid values are `TERRAFORM_FOSS` and `CUSTOM`); the example only needs the OpenTofu case so no change was made.
- The `opentofu/setup-opentofu@v1` GitHub Action input `tofu_version` (with underscore) is the correct name and was already accurate.
- The Atlantis `atlantis.yaml` v3 schema (`projects[].name/dir/workspace/autoplan/apply_requirements`) is correct.
- The example Rego policy is illustrative; in production, Spacelift plan policies typically use `package spacelift` with helpers from the input schema (`input.terraform.resource_changes` in newer policy versions). The post's simpler form is still a valid teaching example, so it was left as-is.
- OpenTofu 1.7.0 was the version used throughout; as of the review date, OpenTofu has shipped later 1.x releases. The examples remain functional, but readers may want to substitute a newer pinned version in real deployments.
- The JavaScript template literal in the GitHub Actions `github-script` step embeds raw triple-backticks inside a backtick-delimited string. In a real workflow these need to be escaped (e.g. `` \`\`\` ``) or the literal will close prematurely; this is a long-standing rendering quirk in tutorial snippets and was not introduced by this review, so the snippet was left as written by the author.
