# Validation Summary: How to Use OpenTofu with Terrateam for GitHub Integration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (1.7.0)
- Terrateam (GitHub-native IaC automation)
- GitHub (App, PR comments, Actions secrets, team-based access)
- Infracost (cost estimation provider)
- tfsec (security scanning)

## Sources Consulted
- Terrateam configuration overview: https://docs.terrateam.io/configuration/
- `dirs` reference: https://docs.terrateam.io/reference/configuration/dirs
- `engine` reference: https://docs.terrateam.io/reference/configuration/engine/
- `when_modified` reference: https://docs.terrateam.io/reference/configuration/when-modified/
- `cost_estimation` reference: https://docs.terrateam.io/reference/configuration/cost-estimation/
- `access_control` reference: https://docs.terrateam.io/reference/configuration/access-control/
- `apply_requirements` reference: https://docs.terrateam.io/reference/configuration/apply-requirements/
- `hooks` reference: https://docs.terrateam.io/reference/configuration/hooks/
- `notifications` reference: https://docs.terrateam.io/reference/configuration/notifications/
- Command reference: https://docs.terrateam.io/command-reference/
- Lock management: https://docs.terrateam.io/workflows/advanced/lock-management/

## Issues Found

The post originally used several invented or wrong-product config keys. Corrections:

1. **`engine.name: opentofu` → `tofu`.** Terrateam's engine name for OpenTofu is `tofu`, not `opentofu`. `opentofu` is not a recognized engine value.

2. **`dirs.<dir>.stacks` → removed.** `stacks` is not a valid sub-key under `dirs` in Terrateam. The supported abstraction is `workspaces`. Per-stack `env` and `hooks` blocks under directories don't exist; rewrote the example to use `tags` and to define `hooks` at the top level (which is where Terrateam supports them, with `all`/`plan`/`apply` and `pre`/`post`).

3. **`dirs.<dir>.depends_on: [...]` → `when_modified.depends_on: "<query>"`.** `depends_on` is a sub-key of `when_modified`, accepts a tag-query string (e.g. `"dir:..."`), not a list, and is not a valid top-level dir key.

4. **`when_modified.file_patterns` glob.** Replaced `**/*.tf` with the documented `${DIR}/*.tf` form, which is the convention used in the Terrateam reference defaults.

5. **`integrations:` block removed.** There is no `integrations` top-level key in Terrateam config. Cost estimation lives under the top-level `cost_estimation` key (`enabled`, `provider`, `currency`); the Infracost API key is **not** a YAML field — it must be set as a GitHub Actions Secret named `INFRACOST_API_KEY`. The original `api_key: "${INFRACOST_API_KEY}"` field is not a valid Terrateam config option. The `tfsec` "integration" block is also not a real config key; security scans are wired in via `hooks` or `workflows`. Rewrote the section accordingly.

6. **`access_control` structure rewritten.** The original used `access_control.plan.teams: [my-org/engineers]` and `access_control.apply.teams: [...]`, which are not valid keys. The correct structure is `access_control.policies: [{tag_query, plan, apply, ...}]` with team queries written as `team:<slug>` (just the slug, not `<org>/<slug>`).

7. **`separate_plan_and_apply: true` removed.** This key does not exist in Terrateam. To gate apply on a separate approval, the documented mechanism is `apply_requirements.checks[*].approved.enabled: true`, which I added in its place.

8. **Per-dir `hooks:` block in environment-specific section removed.** Terrateam's `hooks` reference documents hooks only at the top level of the config file, not nested under `dirs`. Removed the per-dir hook to avoid showing an unsupported pattern. The remaining glob patterns (`environments/*/networking`, `environments/prod/**`, `environments/dev/**`) are valid because `dirs` keys do support glob expansion.

9. **`notifications` structure rewritten.** The original showed a flat list of typed entries (`type: github_check`, `type: pull_request_comment`, `collapsed: true`). The actual `notifications` schema is `notifications.policies: [{tag_query, comment_strategy}]` where `comment_strategy` is one of `minimize` / `append` / `delete`. Rewrote the example to match.

## Review Notes

- The PR comment commands section (`terrateam plan`, `terrateam plan dir:...`, `terrateam apply`, `terrateam apply dir:...`, `terrateam unlock`) was correct as written and was left unchanged.
- The introduction's claim that Terrateam provides plan output in PR comments, Infracost cost estimates, security scanning, and approval gates via a YAML config file is accurate.
- The conclusion's claim that Terrateam is "fully managed" and "without requiring any server infrastructure" is accurate for the SaaS / GitHub App offering — note that Terrateam also has a self-hosted mode, but the post is clearly about the hosted GitHub App, so this isn't misleading.
- Terrateam provides `hooks` at top-level and per-workflow (under `workflows`), but does not document per-dir hooks. If the author wants per-environment hook behaviour, that would normally be done via custom `workflows` keyed by tag rather than per-dir hook blocks.
