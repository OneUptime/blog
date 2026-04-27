# Validation Summary: How to Use OpenTofu with env0 Cost Controls

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- env0 (SaaS infrastructure-as-code platform)
- env0 Terraform provider (`env0/env0`)
- OpenTofu
- Infracost (used by env0 for cost estimation)
- Terraform `http` data source
- AWS / GCP / Azure cost credentials

## Sources Consulted
- env0 Terraform provider source of truth: https://github.com/env0/terraform-provider-env0/tree/main/docs
  - `docs/index.md` — provider auth (`api_key`, `api_secret`)
  - `docs/resources/project.md`
  - `docs/resources/project_policy.md` (`include_cost_estimation`, `default_ttl`, `max_ttl`)
  - `docs/resources/project_budget.md` (`amount`, `timeframe`, `thresholds`)
  - `docs/resources/aws_cost_credentials.md`, `gcp_cost_credentials.md`, `azure_cost_credentials.md`
  - `docs/resources/environment.md` (`ttl` is an ISO timestamp)
  - `docs/resources/environment_scheduling.md`
  - `docs/resources/notification.md` (types: `Slack`, `Teams`, `Email`, `Webhook`)
  - `docs/resources/notification_project_assignment.md` (event enum incl. `budgetExceeded`)
- env0 docs (now docs.envzero.com): `cost-estimation`, `version-2-schema`, `workflows/workflow-file-reference`, `reference/authentication`
- env0 API reference: `api-reference/cost/get-costs-for-an-environment`, `api-reference/environments/update-environment-ttl`

## Issues Found

The post was substantially rewritten because most of its YAML examples and several Terraform/API examples were fabricated. Concretely:

1. **Fabricated `.env0/configuration.yml` schema (3 separate sections).** env0 has no top-level YAML config file with `cost_estimation`, `environments`, `ttl`, or `notifications` blocks. `env0.yaml` exists only for custom flows; cost estimation, TTL, and notifications are configured via UI / API / the env0 Terraform provider. Replaced all three YAML examples (Configuring Cost Estimation, Environment TTL, Cost Notification Configuration) with the equivalent env0 Terraform provider resources: `env0_project_policy` (`include_cost_estimation`, `default_ttl`, `max_ttl`), `env0_project_budget`, `env0_environment.ttl`, `env0_notification`, and `env0_notification_project_assignment`.
2. **Fabricated cost-threshold field names** (`monthly_budget`, `auto_approve_threshold`, `approval_required_threshold_percentage`). These do not exist. Replaced with the actual `env0_project_budget` schema (`amount`, `timeframe`, `thresholds` as percentages).
3. **Fabricated TTL `type: business_days`.** env0 TTL only accepts `INFINITE`, `HOURS`, `DATE` at the API level, and the Terraform `env0_environment.ttl` field is an absolute ISO timestamp, not a duration enum. Rewrote with absolute timestamp via `timeadd(timestamp(), "8h")` and pointed users at `env0_environment_scheduling` for recurring schedules.
4. **Non-existent `env0_cost_credentials` resource.** The provider exposes three cloud-specific resources: `env0_aws_cost_credentials` (requires `arn`), `env0_gcp_cost_credentials`, `env0_azure_cost_credentials`. Replaced with the AWS resource and noted GCP/Azure equivalents.
5. **Wrong cost API endpoint.** The post used `https://api.env0.com/environments/{id}/cost`. The actual endpoint is `https://api.env0.com/costs/environments/{environmentId}`.
6. **Wrong auth scheme.** The post used `Authorization: Bearer <token>`. env0 uses HTTP Basic auth with the API key id/secret. Replaced with `Basic ${base64encode("${api_key}:${api_secret}")}`.
7. **Non-existent response field.** The post read `.monthlyToDate` from the response. The actual response is an array of daily records `[{date, total: {AWS, GCP, AZURE}, id, isStale}, ...]`. Rewrote the parsing to take the latest record's `total.AWS`.
8. **Incorrect "approval thresholds" framing in intro/conclusion.** Reworded the introduction to describe what env0 actually offers (Infracost cost estimation at plan time, project budgets with notification thresholds, cost API). The conclusion was left mostly intact since it stays at a conceptual level.

The "Tagging for Cost Attribution" section is generic Terraform/HCL using user-defined tag keys and was left unchanged — it is conceptually fine even though `env0:environment` is illustrative rather than a built-in env0 propagation mechanism.

## Review Notes
- env0 docs migrated to `docs.envzero.com` after a rebrand; older `docs.env0.com` URLs redirect.
- env0 cost estimation depends on Infracost — a note about the required `INFRACOST_API_KEY` org variable was added since cost estimation will silently do nothing without it.
- `env0_project_policy` only has a boolean `include_cost_estimation`; for actual cost thresholds use `env0_project_budget` and wire it to `env0_notification_project_assignment` with the `budgetExceeded` event.
- The `env0_environment.ttl` field expects an absolute ISO-8601 timestamp; using `timeadd(timestamp(), "8h")` will cause TTL to drift on every plan. Users who want a stable TTL should set a fixed timestamp or use `env0_environment_scheduling.destroy_cron`. This subtlety is worth calling out in a future revision.
- Conclusion still says "Start with monitoring-only mode to establish cost baselines before enabling approval gates" — env0 doesn't have a formal "monitoring-only mode" toggle, but the underlying advice (enable cost estimation before enforcing budgets) maps cleanly to leaving `requires_approval_default = false` and not wiring `budgetExceeded` to a blocking workflow until baselines are established. Left as-is since it's reasonable guidance.
