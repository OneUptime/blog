# Validation Summary: How to Configure GitHub Actions Notifications

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- GitHub Actions (workflows, expressions, contexts, reusable workflows)
- `slackapi/slack-github-action` v1.26.0 (Slack API method and Incoming Webhook)
- `actions/checkout@v4`, `actions/github-script@v7`, `actions/cache@v4`
- Microsoft Teams Incoming Webhook (MessageCard / Office 365 Connectors)
- SendGrid Mail Send v3 API
- PagerDuty Events API v2
- Generic HTTP webhooks (curl)
- Mermaid (flowchart diagrams)

## Sources Consulted
- GitHub Actions documentation — workflow syntax, contexts and expressions, job outputs, status check functions (`success()`, `failure()`, `always()`): https://docs.github.com/en/actions/learn-github-actions/expressions and https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs
- `slackapi/slack-github-action` README and v1.26.0 release notes (Technique 1 Webhook vs Technique 2 Slack API method): https://github.com/slackapi/slack-github-action
- `actions/github-script` v7 docs: https://github.com/actions/github-script
- `actions/cache` v4 docs: https://github.com/actions/cache
- Microsoft retirement notice for Office 365 Connectors in Teams (announced 2024-07, finalized 2025-12-31): https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/
- Microsoft Teams "Workflows" app / Power Automate Adaptive Card replacement
- PagerDuty Events API v2 reference: https://developer.pagerduty.com/api-reference/368ae3d938c9e-send-an-event
- SendGrid v3 Mail Send API: https://docs.sendgrid.com/api-reference/mail-send/mail-send
- GitHub reusable workflows reference: https://docs.github.com/en/actions/using-workflows/reusing-workflows

## Issues Found
1. **Slack section (§2) — bot token vs webhook URL mismatch.** The narrative instructed readers to "create a Slack app and obtain a webhook URL" and store it as `SLACK_WEBHOOK_URL`, but the YAML immediately below uses `channel-id` + `SLACK_BOT_TOKEN`, which is the Slack API method (chat.postMessage), not the Incoming Webhook method. These two modes of `slackapi/slack-github-action` are mutually exclusive. Updated the prose to describe creating a Bot User OAuth Token with `chat:write` scope and storing it as `SLACK_BOT_TOKEN`, plus a short note pointing readers to the webhook alternative if they prefer it.

2. **Microsoft Teams section (§4) — deprecated connector format.** The example uses `MessageCard` posted to a Teams Incoming Webhook Connector. Microsoft retired Office 365 Connectors for Teams on 2025-12-31, which is before this post's publication date (2026-02-02). New users following the post as-written cannot create a working connector URL. Added a note recommending the Teams "Workflows" app (Power Automate, Adaptive Cards) for new setups, while keeping the existing `MessageCard` example for readers maintaining legacy connector URLs.

## Review Notes
- `slackapi/slack-github-action@v1.26.0` is a real release and still works. v2.x has since been released with a different input surface; readers wanting newer features may want to upgrade, but v1.26.0 is not broken.
- Section 5's `build` job uses `outputs.status: ${{ job.status }}` and downstream consumers read `needs.build.outputs.status`. Job outputs are evaluated at job completion, so `job.status` resolves correctly here; this is a valid (if slightly unusual) pattern.
- The debounce pattern in §8 leans on `actions/cache@v4` semantics that are intentionally eventually-consistent and best-effort — the cache may not be visible to a concurrent run started seconds later. Functional for human-scale debounce; not a hard mutex.
- Status check function calls (`success()`, `failure()`, `always()`) and the `needs.<job>.result` context are used correctly throughout.
- The `actions/github-script@v7` PR comment block mixes GitHub Actions `${{ ... }}` expansion with JS template-literal `${...}` interpolation; both are evaluated at their respective stages and the example is correct.
- PagerDuty Events API v2 endpoint, payload shape (`routing_key`, `event_action`, `payload.summary`, `payload.severity`, `payload.source`) and SendGrid v3 `/mail/send` payload shape both verified against current docs.
