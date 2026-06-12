# Validation Summary: How to Implement Terraform CI/CD Pipelines

## Status

validated

## Post Type

Tutorial / Guide — comprehensive how-to covering GitHub Actions and GitLab CI workflows for Terraform, including plan/apply separation, PR-based workflows (including Atlantis), automated testing (TFLint, Checkov, Terratest), OPA policy-as-code, approval gates, and secret management (Vault, AWS OIDC, Terraform Cloud).

## Technologies Covered

- Terraform (v1.7.0 pinned)
- GitHub Actions (`hashicorp/setup-terraform@v3`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `actions/github-script@v7`, `actions/setup-go@v5`)
- GitLab CI (HTTP backend with GitLab-managed state)
- Atlantis (server-side `atlantis.yaml` v3)
- TFLint (`terraform-linters/setup-tflint@v4`, v0.50.0)
- Checkov (`bridgecrewio/checkov-action@v12`)
- Terratest (Go, `github.com/gruntwork-io/terratest`)
- Open Policy Agent / Rego (`open-policy-agent/setup-opa@v2`)
- HashiCorp Vault (`hashicorp/vault-action@v3`, JWT/OIDC auth)
- AWS OIDC (`aws-actions/configure-aws-credentials@v4`)
- Terraform Cloud (`cloud {}` block with workspace tags)
- Slack (`slackapi/slack-github-action@v1`)

## Sources Consulted

- Terraform CLI docs: https://developer.hashicorp.com/terraform/cli/commands/plan (`-detailed-exitcode`, `-out`), `apply`, `init`, `validate`, `fmt`
- Terraform HTTP backend config: https://developer.hashicorp.com/terraform/language/backend/http (verified `address`, `lock_address`, `unlock_address`, `lock_method`, `unlock_method`, `username`, `password`, `retry_wait_min`)
- Terraform `cloud {}` block + workspace tags: https://developer.hashicorp.com/terraform/cli/cloud/settings
- GitHub Actions docs (workflow `concurrency`, `environment`, `permissions: id-token: write` for OIDC, `issue_comment` trigger)
- GitLab CI docs: `artifacts:reports:terraform`, `dependencies`, `rules: when: manual`, YAML anchors
- Atlantis docs: https://www.runatlantis.io/docs/server-side-repo-config.html (`version: 3`, `autoplan`, `apply_requirements`, custom workflows)
- Terratest pkg.go.dev: `aws.GetVpcById`, `aws.GetSubnetById` (does NOT exist), `aws.GetTagsForSubnet`, `random.UniqueId`, `terraform.WithDefaultRetryableErrors`, `terraform.InitAndApply`, `terraform.Output`, `terraform.OutputList`, `terraform.Destroy`
- OPA Rego docs: `import future.keywords.in`, `import future.keywords.every`, `deny[msg]` rule syntax, `sprintf`
- TFLint releases (v0.50.0 confirmed published)
- Action versions checked against marketplace listings (all pinned majors were current at post publication date of 2026-01-27)

## Issues Found

1. **Terratest example: missing imports.** The Go test file used `fmt.Sprintf("test-vpc-%s", uniqueID)` and `random.UniqueId()` but neither `fmt` nor `github.com/gruntwork-io/terratest/modules/random` was imported. Added both. Without these the file would not compile.

2. **Terratest example: unused `time` import.** The `time` package was imported but never referenced, which is a Go compile error (`imported and not used`). Removed it.

3. **Terratest example: non-existent `aws.GetSubnetById` function.** The original loop called `subnet := aws.GetSubnetById(t, subnetID, awsRegion)` — this function does not exist in `github.com/gruntwork-io/terratest/modules/aws`. The `subnet` variable was also unused (which would itself be a Go compile error). Replaced the call with `aws.GetTagsForSubnet(t, subnetID, awsRegion)` (which does exist) and tightened the assertion to check the returned tag map for a meaningful key (`"Tier"`) rather than the original `"public"` literal that does not correspond to anything in the test's `Vars`.

## Review Notes

- The post's GitHub Action major-version pins (`@v3` of setup-terraform, `@v3` of vault-action, `@v4` of configure-aws-credentials, `@v4` of setup-tflint, `@v1` of slack-github-action) were all the current majors as of the post's publication date (2026-01-27). They have since been superseded — at the time of this review (2026-06-12), newer majors exist: `setup-terraform@v4`, `vault-action@v4`, `configure-aws-credentials@v6`, `setup-tflint@v6`, and `slack-github-action@v3` (with v1 now considered deprecated/unmaintained). Readers using this post late in 2026 may want to bump to the newer majors, but the pinned versions still resolve and work.
- Terraform 1.7.0 and TFLint v0.50.0 are both real published releases. Current Terraform is in the 1.15.x line, so 1.7.0 is on the older side but still supported.
- `aws.GetVpcById` returns `*aws.Vpc` whose `CidrBlock` field is a `*string`, so the dereference in `assert.Equal(t, "10.0.0.0/16", *vpc.CidrBlock)` is correct (verified against pkg.go.dev).
- `terratest/modules/random.UniqueId()` is functional but deprecated in favor of `UniqueID()`. Left as-is since `UniqueId` still compiles and resolves.
- The GitLab CI HTTP backend config includes `retry_wait_min`, which is a real Terraform HTTP backend option.
- The Atlantis `atlantis.yaml` references `workflow: production` on the prod project — the referenced workflow is defined further down in the same file, so this is consistent.
- The `actions/github-script@v7` PR-comment workflow uses template literals with embedded `${{ steps.plan.outputs.stdout }}`. This is fine because `hashicorp/setup-terraform@v3` exposes `stdout` via its wrapper (the `terraform_wrapper: true` setting in the post). Worth noting that very large plan outputs can overflow GitHub's 65,536-character comment limit — a real-world consideration the post does not mention, but not a correctness issue.
- The OPA policy uses `import future.keywords.in` and the `deny[msg]` rule head style — both are valid in current OPA. In v1.0+ OPA, the `if` keyword is required for new-style rules, but the legacy `deny[msg] { ... }` partial-rule syntax remains supported with the future-keyword imports shown.
