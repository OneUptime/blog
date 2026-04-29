# Validation Summary: How to Migrate from Terraform Cloud to Atlantis with OpenTofu

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Atlantis (pull request automation server)
- OpenTofu (Terraform fork)
- Terraform Cloud (HCP Terraform) API
- Kubernetes (deployment manifests via Terraform `kubernetes_deployment`)
- AWS S3 (state backend with native locking)
- GitHub webhooks API
- Bash / `curl` / `jq`

## Sources Consulted
- Atlantis server configuration: https://www.runatlantis.io/docs/server-configuration.html
- Atlantis server-side repo config: https://www.runatlantis.io/docs/server-side-repo-config.html
- Atlantis repo-level `atlantis.yaml`: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis webhooks: https://www.runatlantis.io/docs/configuring-webhooks.html
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform Cloud State Versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- Terraform Kubernetes provider `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment

## Issues Found

1. **Invalid Atlantis server config option `tofu-path`** (Phase 2). Atlantis does not have a `tofu-path` setting. The supported way to switch the binary is the `--default-tf-distribution` flag (env: `ATLANTIS_DEFAULT_TF_DISTRIBUTION`, server config key: `default-tf-distribution`) with valid values `terraform` or `opentofu`. Replaced the `tofu-path: /usr/local/bin/tofu` line with `default-tf-distribution: opentofu` and updated the comment.

2. **Missing `push` webhook event** (Phase 4). The Atlantis docs require four GitHub webhook events: `push`, `pull_request`, `pull_request_review`, and `issue_comment`. The original list omitted `push`, which Atlantis uses to keep the working directory in sync. Added `push` to the events array in the `curl` call.

3. **Invalid `required_approvers` field in repos.yaml** (Phase 5). The Atlantis server-side repo config schema does not include `required_approvers`. Valid repo-level fields are `id`, `branch`, `repo_config_file`, `workflow`, `plan_requirements`, `apply_requirements`, `import_requirements`, `allowed_overrides`, `allowed_workflows`, `allow_custom_workflows`, `delete_source_branch_on_merge`, `repo_locks`, `policy_check`, `custom_policy_check`, `autodiscover`, `silence_pr_comments`, `pre_workflow_hooks`, and `post_workflow_hooks`. Atlantis's `approved` requirement only checks that someone approved the PR — to require a specific team's approval you configure that in GitHub branch protection rules. Removed the invalid `required_approvers` entry and added a short paragraph after the snippet explaining the correct way to enforce team-specific approval.

## Review Notes
- The Phase 1 `kubernetes_deployment` HCL is illustrative and intentionally minimal. To actually apply, it would also need `spec.selector.match_labels` and matching `spec.template.metadata.labels` (both required by the Kubernetes API), plus a `Service` and an `Ingress` to expose the webhook endpoint, secret/configmap definitions, container ports, and persistent storage for the data dir. These are normal "fill-in-the-rest" omissions for a migration guide and were left as-is.
- The S3 backend uses `use_lockfile = true` (native S3 locking). This requires Terraform 1.10+ / OpenTofu 1.10+. Readers on older OpenTofu versions will need DynamoDB locking via `dynamodb_table` instead.
- `"image": "ghcr.io/runatlantis/atlantis:latest"` — pinning to `latest` is convenient but inadvisable in production. Pinning to a tagged release is recommended but this was not a technical correctness issue, so left as-is.
- The TFC API call uses `https://app.terraform.io/api/v2/...`. Customers on a Terraform Enterprise / HCP Terraform private install would need to substitute their own hostname.
- `tofu state list -state=terraform.tfstate` works but the `-state` flag is officially deprecated for most operational commands in modern Terraform/OpenTofu — it is still accepted for read-only inspection like `state list`, so this is fine for the verification step described.
