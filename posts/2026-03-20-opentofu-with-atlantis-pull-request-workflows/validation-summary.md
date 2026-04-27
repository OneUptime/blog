# Validation Summary: How to Use OpenTofu with Atlantis Pull Request Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Atlantis (Terraform/OpenTofu PR automation)
- OpenTofu
- GitHub (and references to GitLab, Bitbucket)
- YAML configuration (atlantis.yaml, server config, repos.yaml)
- Checkov (used in a workflow example)

## Sources Consulted
- [Atlantis Repo Level atlantis.yaml Config](https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html)
- [Atlantis Server Configuration](https://www.runatlantis.io/docs/server-configuration.html)
- [Atlantis Server Side Repo Config](https://www.runatlantis.io/docs/server-side-repo-config.html)
- [Atlantis Custom Workflows](https://www.runatlantis.io/docs/custom-workflows.html)

## Issues Found
1. **Incorrect `terraform_version` format for OpenTofu.** The post used `terraform_version: tofu1.7.0`, which is not a valid value for the field. According to Atlantis docs, `terraform_version` requires a semver-compatible string (e.g., `v1.7.0`), and OpenTofu is selected via the separate `terraform_distribution` field. Fixed both project entries to `terraform_version: v1.7.0` plus `terraform_distribution: opentofu`.

2. **Incorrect server flag `terraform-download-url` with `{version}` template.** The post invented a `terraform-download-url` flag with a `{version}` substitution template. The actual Atlantis flag is `tf-download-url`, and it accepts a base URL whose directory structure must mirror `releases.hashicorp.com` — it is not a per-version template and is not the right mechanism for selecting OpenTofu. Replaced this with the proper flag `default-tf-distribution: opentofu`, which is the documented way to make Atlantis use OpenTofu instead of Terraform.

3. **Invalid server flag `repo-config-file`.** The correct flag name is `repo-config`. Renamed accordingly.

4. **Invalid server flag `allow-repo-config`.** This flag does not exist in the Atlantis server configuration. Removed it.

5. **Invalid `pr_review_count` field in repos.yaml.** This field does not exist in the Atlantis server-side repo config schema. The number of required approvals is enforced by the VCS provider's branch protection rules, not by Atlantis directly. Removed the field and its preceding comment.

## Review Notes
- The `apply_requirements` values `approved` and `mergeable` are valid (Atlantis also supports `undiverged`).
- The `env`, `run`, `init` (with `extra_args`), and `plan` (with `extra_args`) workflow steps used in the custom workflow example are all valid per the Custom Workflows docs.
- The example `atlantis plan -p` / `atlantis apply -p` / `atlantis unlock -p` PR comment commands are correct.
- The post does not specify a minimum Atlantis version, but `terraform_distribution` was introduced in relatively recent releases — readers on older Atlantis versions may need to upgrade for the OpenTofu support shown here.
