# Validation Summary: How to Set Up Terraform Pipeline in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, stages, rules, needs, dependencies, artifacts, reports, resource_group, environment, cache)
- Terraform (init, validate, fmt, plan, apply, show, output, workspaces, S3 backend)
- GitLab-managed Terraform state (`gitlab-terraform` wrapper, HTTP backend)
- AWS S3 + DynamoDB state backend
- Security scanning: Checkov, tfsec, Terrascan
- Cost estimation: Infracost
- Container images: `hashicorp/terraform`, `bridgecrew/checkov`, `aquasec/tfsec`, `tenable/terrascan`, `infracost/infracost`

## Sources Consulted
- GitLab-managed Terraform/OpenTofu state — https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab Terraform images project (`registry.gitlab.com/gitlab-org/terraform-images/stable:latest`)
- Terraform CLI documentation (init/validate/fmt/plan/apply/show/output) — https://developer.hashicorp.com/terraform/cli
- Terraform S3 backend — https://developer.hashicorp.com/terraform/language/settings/backends/s3
- Checkov CLI docs — https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- tfsec / Trivy migration — https://github.com/aquasecurity/tfsec
- Terrascan CLI docs — https://runterrascan.io/docs/
- Infracost CLI docs — https://www.infracost.io/docs/
- GitLab CI/CD `.gitlab-ci.yml` keyword reference — https://docs.gitlab.com/ci/yaml/

## Issues Found
No technical issues found.

All code and configuration was verified as accurate:
- The GitLab-managed state setup (`TF_ADDRESS = ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${TF_STATE_NAME}`, the `gitlab-terraform init/validate/plan/plan-json/apply` wrapper commands, and the `stable:latest` image) matches the current GitLab documentation.
- Terraform CLI flags are correct and current: `validate`, `fmt -check [-recursive]`, `plan -out=`, `apply -auto-approve <plan>`, `show -no-color`, `show -json`, `init -backend=false`, `init -backend-config=...`, `output -json`, and `workspace select/new`.
- The S3 backend block (`bucket`, `key`, `region`, `encrypt`, `dynamodb_table`) is valid HCL.
- Security scanner invocations are correct: Checkov `--output junitxml --output-file-path .` (produces `results_junitxml.xml`) and `--soft-fail`; tfsec `--format junit --out`; Terrascan `-i terraform -d terraform/ -o junit-xml`.
- Infracost `breakdown --path <plan.json> --format json/table --out-file` usage is correct (plan generated via `terraform show -json`).
- GitLab CI keywords (`stages`, `rules`, `needs`, `dependencies`, `artifacts.reports.terraform`, `resource_group`, `environment`, `cache`, `extends`, `before_script`) are used correctly, and the `reports: terraform:` report consumes the JSON from `terraform show -json`.

## Review Notes
- **tfsec is deprecated.** As of 2023–2024, tfsec has been merged into Aqua Security's Trivy; tfsec still runs but receives no new checks, and Terraform features released after the merge are not covered. Existing tfsec check IDs (e.g., `AVD-AWS-0086`) carry over unchanged to Trivy. A future revision could replace the `aquasec/tfsec` job with `trivy config terraform/`. The current example remains functional, so it was left as-is.
- **`hashicorp/terraform` image entrypoint:** Depending on the GitLab Runner version/executor, the `hashicorp/terraform` image's default entrypoint (`terraform`) sometimes needs to be overridden with `entrypoint: [""]` to allow `before_script`/multi-command `script` blocks to run. Modern runners generally handle this automatically, so it is not an error, but it is a common gotcha worth being aware of.
- **OpenTofu / `gitlab-tofu`:** GitLab now also ships `gitlab-tofu` as the OpenTofu-based successor to `gitlab-terraform`. Both wrappers remain supported; the `gitlab-terraform` commands shown are still valid.
- The multi-environment example intentionally auto-applies `apply_dev` on the `develop` branch (no `when: manual`) while gating `apply_prod` behind manual approval — this is a deliberate and reasonable design choice, not an error.
- Terraform is pinned to `1.6`, which is appropriate and reproducible for a tutorial; readers may wish to bump to a newer 1.x patch line.
