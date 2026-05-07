# Validation Summary: How to Use Atlantis for Team OpenTofu Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Atlantis
- OpenTofu
- GitHub pull requests and webhooks
- Kubernetes
- Terraform Helm provider (`helm_release`)
- Terraform GitHub provider (`github_repository_webhook`)

## Sources Consulted
- Atlantis repo-level configuration docs: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis custom workflows docs: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis command usage docs: https://www.runatlantis.io/docs/using-atlantis.html
- Atlantis command requirements docs: https://www.runatlantis.io/docs/command-requirements
- Atlantis deployment docs: https://www.runatlantis.io/docs/deployment.html
- Atlantis webhook configuration docs: https://www.runatlantis.io/docs/configuring-webhooks.html
- Atlantis webhook secret docs: https://www.runatlantis.io/docs/webhook-secrets
- Atlantis Helm chart values: https://raw.githubusercontent.com/runatlantis/helm-charts/main/charts/atlantis/values.yaml
- Atlantis Helm chart StatefulSet template: https://raw.githubusercontent.com/runatlantis/helm-charts/main/charts/atlantis/templates/statefulset.yaml
- Atlantis Helm chart index: https://runatlantis.github.io/helm-charts/index.yaml
- GitHub provider `github_repository_webhook` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/repository_webhook.md
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post described Atlantis as running OpenTofu, but the `atlantis.yaml` example did not set `terraform_distribution: opentofu`. I added `terraform_distribution: opentofu` to both projects so Atlantis is explicitly configured to use OpenTofu.
- The production `when_modified` module path was one directory too shallow for the repo structure implied by `environments/production`. I changed `../modules/**/*.tf` to `../../modules/**/*.tf` so root-level module changes trigger plans correctly.
- The custom `apply` workflow step passed `-var-file=production.tfvars`. Atlantis applies the saved plan file, so plan-changing flags are not applied at `atlantis apply` time. I removed the extra args from the `apply` step.
- The Helm chart version was pinned to `4.23.0`, which the official chart index shows packages Atlantis `v0.27.0`. Atlantis documents `terraform_distribution` as available since `v0.33.0`, so that chart version was incompatible with the OpenTofu example. I updated the chart version to `6.4.0`.
- The Helm values used unsupported or incorrect chart keys: `repoAllowlist`, `requireApproval`, `requireMergeable`, and an `environmentSecrets` structure that does not match the chart schema. I replaced them with supported values: `orgAllowlist`, `vcsSecretName`, `repoConfig`, and `environmentSecrets` entries that use `secretKeyRef`.
- The `orgAllowlist` value was `github.com/myorg`, which is not a valid repo allowlist pattern for the chart’s `ATLANTIS_REPO_ALLOWLIST` wiring. I changed it to `github.com/myorg/*`.
- The post used repo-level `apply_requirements` and a repo-defined custom workflow without the required server-side Atlantis repo config. I added a `repoConfig` example that sets `apply_requirements`, allows `workflow` and `apply_requirements` overrides, and enables custom workflows.
- The best-practices section advised using separate webhook secrets per repository, but Atlantis documentation states that repositories managed by the same Atlantis deployment should use the same webhook secret. I corrected that guidance.

## Review Notes
- The post still pins `terraform_version: v1.6.0`. That is technically valid, but it is a version pin that should be reviewed periodically as Atlantis and OpenTofu releases advance.
- `automerge: true` is configured at the repo level in the example. Teams with stricter production controls may want to separate production and non-production repos or use different repo-level policies.
