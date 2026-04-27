# Validation Summary: How to Use OpenTofu with env0 Custom Flows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- env0 (Custom Flows / `env0.yml`)
- Terraform-compatible CLI tools: Checkov, tfsec
- Bash / shell hooks
- Slack webhooks (notification example)

## Sources Consulted
- env0 Custom Flows docs: https://docs.env0.com/docs/custom-flows (redirects to https://docs.envzero.com/docs/custom-flows)
- env0 Custom Flows examples repo: https://github.com/env0/custom-flows-examples
- env0 Checkov plugin example `env0.yml`: https://github.com/env0/templates/blob/master/plugins/checkov/env0.yml
- env0 Project-level Custom Flow docs: https://docs.env0.com/docs/project-level-custom-flow
- env0 Plugins overview: https://docs.env0.com/docs/plugins

## Issues Found
The original post used a YAML schema that does not exist in env0. Every code example was rewritten against the real schema. Specific corrections:

1. **Wrong file name and location.** Original used `.env0/custom-flow.yml`. The real file is `env0.yml` (or `env0.yaml`) placed in the template folder, repo root, or a project-level custom-flow repository. Fixed in all four code blocks.
2. **Wrong top-level structure.** Original used a top-level `flows:` array with `name:` and `trigger:` keys (`environment:`, `action:`, `type: drift_detected`). env0 Custom Flows have no such concept — the top level is `version:`, optional `shell:`, and `deploy:` / `destroy:` sections. Replaced in all examples.
3. **Fictional step types.** Original used `type: tofu-plan`, `type: tofu-apply`, `type: custom`, and `type: approval`. The real schema has predefined steps (`terraformInit`, `terraformPlan`, `terraformApply`, `storeState`, `terraformOutput` for deploy; `terraformDestroy` for destroy) — even when the underlying binary is OpenTofu, the keys keep the `terraform*` prefix. Custom commands attach via `before:` and `after:` arrays on those steps. Rewrote every step accordingly.
4. **Approval steps don't exist in env0.yml.** Original modeled approval as `type: approval` with `approvers:`, `message:`, and `timeout_hours:`. env0 enforces approvals via Approval Policies / template settings configured outside the YAML. Removed the YAML approval step and added a clarifying note.
5. **Cost-check step doesn't exist.** Original showed a `type: custom` step calling `env0 run cost --format json` (not a real CLI subcommand). Removed and noted that cost gates are configured via env0's Cost Estimation feature, not the YAML.
6. **No top-level `variables:` block.** Original showed a `variables:` array under a flow. env0 has no such field — variables are managed in the UI/API/Terraform provider, or injected via shell `export` in a `before:` hook. Rewrote the variables example accordingly and used real env0 built-in env vars (`ENV0_COMMIT_SHA`, `ENV0_REQUESTED_BY_USER_NAME`).
7. **Drift remediation cannot be triggered from `env0.yml`.** Original used `trigger: - type: drift_detected`. Drift detection is environment-level configuration in env0; remediation runs the same `env0.yml`. Rewrote the drift section to demonstrate `onSuccess` / `onFailure` lifecycle hooks for notifications, which is the actual mechanism.
8. **`auto_approve: true` step field doesn't exist.** Original showed it on a `tofu-apply` step. Auto-apply is a per-environment template setting in env0. Removed and added a note.
9. **Added explanatory prose** before each rewritten YAML block so the changes read naturally and the reader understands which env0 concepts live in YAML vs. the UI/API.

## Review Notes
- The `version: 2` schema is the current Custom Flows schema; older `env0.yml` files used `version: 1` with a slightly different layout. Examples standardize on v2 to match current docs.
- The post intentionally references step keys `terraformInit` / `terraformPlan` / `terraformApply` even though the post is about OpenTofu — this matches env0's docs (they explicitly note Terraform's Custom Flow format is interchangeable with OpenTofu's, and the keys do not change).
- The post leaves `$SLACK_WEBHOOK` as an unset shell variable in the drift example. This is intentional: env0 lets the user provide it via environment/configuration variables in the env0 UI. Not an error.
- The Conclusion paragraph still mentions "approval gates, security scanning, cost checks, and post-deployment validation." All of these are achievable with env0, but only security scanning and post-deployment validation are demonstrated *in the YAML*; approval gates and cost checks come from env0 features outside the YAML. The conclusion is left unchanged since it accurately describes the overall env0 capability set.
- Built-in env0 environment variables can change over time; users should check the env0 docs (Variables → Built-in Variables) for the current authoritative list.
