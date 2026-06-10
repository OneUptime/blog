# Validation Summary: How to Implement Terraform Drift Detection

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Terraform (CLI: `plan -detailed-exitcode`, `apply -refresh-only`, `state rm`, `import`)
- Terraform Cloud (`tfe_workspace`, `assessments_enabled`, Workspaces API)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `aws-actions/configure-aws-credentials@v4`, `slackapi/slack-github-action@v1.26.0`, `actions/download-artifact@v4`)
- GitLab CI (scheduled pipelines, `hashicorp/terraform:1.7.0` image)
- Bash scripting (`set -e`, `PIPESTATUS`, exit codes)
- Python (`prometheus_client`, `requests`, `dataclasses`, `subprocess`)
- AWS IAM policies (deny conditions with `aws:PrincipalTag`)
- PagerDuty Events API v2
- Slack Incoming Webhooks
- Prometheus Pushgateway

## Sources Consulted
- Terraform CLI docs — `terraform plan` exit codes for `-detailed-exitcode`: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform Cloud Workspaces API (`assessments-enabled` attribute): https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- `tfe_workspace` resource (Terraform Cloud provider, `assessments_enabled`): https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- `terraform show -json` plan JSON format (`resource_changes`, `change.actions`): https://developer.hashicorp.com/terraform/internals/json-format
- `slackapi/slack-github-action` (v1.26.0 is a valid published release): https://github.com/slackapi/slack-github-action
- PagerDuty Events API v2 (`https://events.pagerduty.com/v2/enqueue`, `routing_key`, `event_action`, payload schema): https://developer.pagerduty.com/docs/events-api-v2/trigger-events/
- `prometheus_client` Python library — `push_to_gateway` signature (verified locally via `inspect.signature`): https://github.com/prometheus/client_python
- Python `datetime` deprecation of `utcnow()` in 3.12+: https://docs.python.org/3.12/library/datetime.html#datetime.datetime.utcnow
- Bash manual on `!` (negation) and `$?` semantics — verified locally with a test script

## Issues Found

1. **Bash drift-check script: `if ! terraform plan; then exit_code=$?` always captures `0`, not the original exit code.**
   - The `!` operator inverts the exit status, so inside the `then` block `$?` reflects the inverted code (always `0` when the body runs). As written, exit code `2` (drift) was being treated as "Error running plan", so the script never took the drift branch.
   - Verified with a local bash test (`return 2` from a function inside `if ! ...; then echo $?` printed `0`).
   - **Fix:** Replaced the `if ! ...; then local exit_code=$?` pattern with `local exit_code=0; terraform plan ... || exit_code=$?` and restructured the branching to use `if/elif` on the captured code. This also addresses the latent `set -e` interaction (the `||` keeps `set -e` from terminating the script on a non-zero plan exit).

2. **`push_to_gateway(... registry=None)` would fail at runtime.**
   - `prometheus_client.push_to_gateway`'s `registry` parameter expects a `CollectorRegistry` (verified via `inspect.signature`: `registry: prometheus_client.registry.Collector`). Passing `None` breaks metric collection during push.
   - **Fix:** Imported `REGISTRY` from `prometheus_client` (the default global registry where module-level `Counter`/`Gauge` instances are registered) and changed the call to `registry=REGISTRY`.

3. **`datetime.datetime.utcnow()` is deprecated in Python 3.12+.**
   - Confirmed locally with `DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects...`
   - **Fix:** Replaced with `datetime.datetime.now(datetime.timezone.utc)`, which preserves the same UTC semantics and is forward-compatible.

## Review Notes
- The `terraform plan -detailed-exitcode` exit-code mapping (0/1/2) is correct.
- The GitHub Actions `actions/download-artifact@v4` cross-workflow-run download technically also requires a `github-token` with appropriate permissions to fetch artifacts from another workflow run; the snippet omits it. Left as-is because the auto-remediation pipeline is illustrative and adding tokens/permissions blocks would expand the scope beyond what the post sets up.
- The auto-remediate workflow is gated on `github.event.workflow_run.conclusion == 'failure'`, but the drift-detection job uses `continue-on-error: true`, so the workflow's conclusion would typically be `success` even when drift is detected. This is a workflow-design quirk, not an incorrect API claim, so I left it alone — the post's intent is clearly illustrative.
- Committing `terraform.tfstate` to git (in the auto-remediation step) is generally discouraged; most teams use a remote backend. The post doesn't explicitly recommend it as best practice — it's just showing a generic auto-commit pattern — so no fix made.
- `tfe_workspace.assessments_enabled` is a valid attribute (Terraform Cloud provider) and the corresponding API attribute `assessments-enabled` is correct (hyphenated in JSON:API).
- The PagerDuty Events API v2 endpoint, fields, and shape are correct.
- The plan-JSON parsing logic only handles single-action arrays cleanly; replace operations (`["delete", "create"]`) are coerced to `"update"`. Not technically wrong for an alerting summary, but a reader extending this should be aware.
