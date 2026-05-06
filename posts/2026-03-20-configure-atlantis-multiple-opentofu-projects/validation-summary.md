# Validation Summary: How to Configure Atlantis for Multiple OpenTofu Projects

## Status
validated

## Post Type
Guide

## Technologies Covered
- Atlantis
- OpenTofu
- YAML configuration
- tfsec

## Sources Consulted
- Atlantis repo-level configuration docs: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis server-side repo configuration docs: https://www.runatlantis.io/docs/server-side-repo-config
- Atlantis custom workflows docs: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis command usage docs: https://www.runatlantis.io/docs/using-atlantis.html
- Atlantis server configuration docs: https://www.runatlantis.io/docs/server-configuration
- Atlantis Terraform versions docs: https://www.runatlantis.io/docs/terraform-versions
- tfsec usage/reference: https://aquasecurity.github.io/tfsec/v1.19.1/guides/usage/
- tfsec project README: https://github.com/aquasecurity/tfsec

## Issues Found
- The examples set `terraform_version: tofu1.7.0`, which is not the documented way to select OpenTofu in Atlantis. I changed the projects to use `terraform_distribution: opentofu` and `terraform_version: v1.7.0`.
- The main multi-project example said networking "runs first" and app projects "depend on networking", but the configuration did not express those dependencies. I added `execution_order_group` and `depends_on` where appropriate.
- The shared-module `when_modified` paths under `environments/*/app` were off by one directory level if `modules/` lives at the repo root. I corrected them to `../../../modules/**/*.tf`, which matches Atlantis's documented relative-path behavior.
- The post used `ignore` under `autodiscover`, but Atlantis documents this key as `ignore_paths`. I corrected the key and added `autodiscover.mode: auto` to the repo-level example.
- The post used `terraform_variables`, which is not a valid `atlantis.yaml` key. I replaced that example with Atlantis's documented `.tfvars` approach and noted automatic `env/default.tfvars` loading per project.
- The post showed `teams/platform/atlantis.yaml` as though Atlantis would automatically discover per-team config files. Atlantis uses a single repo config file per repo match unless the server-side config points at another path, so I corrected the example to use `repo_config_file`.
- The post used restricted Atlantis keys without noting the required server-side settings. I added the required note for `allowed_overrides` and `allow_custom_workflows`.

## Review Notes
- `execution_order_group` only affects global multi-project plan/apply ordering. `depends_on` remains important when applying specific projects directly.
- The `tfsec` command shown in the workflow is still valid, but Aqua now positions tfsec within the Trivy ecosystem; future revisions may prefer Trivy-based examples.
