# Validation Summary: How to Compare Plans Between Runs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON output
- `jq`
- Python 3
- GitHub Actions
- Slack GitHub Action

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.9/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Slack GitHub Action incoming webhook docs: https://docs.slack.dev/tools/slack-github-action/sending-techniques/sending-data-slack-incoming-webhook/

## Issues Found
- The storage example wrote files into `plans/` without creating that directory first. Added `mkdir -p plans` so the commands work in a fresh checkout.
- The scheduled workflow compared `steps.compare.*` without defining an `id` for the compare step. Added `id: compare`.
- The scheduled workflow never failed when the plans differed, so the alert path would not trigger reliably. Added a final `grep -q "Plans are identical." drift-report.txt` check and updated the alert condition to `failure() && steps.compare.conclusion == 'failure'`, which matches GitHub's documented step-status behavior.
- The workflow referenced `scripts/compare-plans.py` even though the earlier runnable example uses `compare-plans.py` in the current directory. Aligned the workflow snippet with the earlier example.
- The Slack notification example used an older action version and omitted the current incoming-webhook input shape. Updated it to `slackapi/slack-github-action@v3` with `webhook-type: incoming-webhook`.
- The attribute-level Python snippet used `plan` without loading any JSON first. Added a minimal `json.load` example so the snippet runs as shown.

## Review Notes
- `tofu show -json` can expose sensitive values in plain text, and saved plan files also contain sensitive data. The post's examples are valid, but readers should treat the resulting artifacts as sensitive.
- The scheduled cron expression is technically correct: GitHub Actions schedules run in UTC by default.
