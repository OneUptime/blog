# Validation Summary: How to Set Up Notifications in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, contexts, expressions, job dependencies)
- Slack (Incoming Webhooks, Block Kit, slackapi/slack-github-action)
- Microsoft Teams (Office 365 Connectors / Workflows, MessageCard)
- Email (dawidd6/action-send-mail, SMTP)
- Discord (webhooks, embeds)
- GitHub CLI (`gh run list`) and `jq`
- curl / shell scripting

## Sources Consulted
- slackapi/slack-github-action repository and action.yml (input definitions) — https://github.com/slackapi/slack-github-action
- slack-github-action v2.0.0 release notes — https://github.com/slackapi/slack-github-action/releases/tag/v2.0.0
- Slack Developer Docs, slack-github-action sending techniques — https://docs.slack.dev/tools/slack-github-action/
- GitHub Actions contexts documentation (`job.status`, `needs.<job>.result`, `github.*`) — https://docs.github.com/en/actions/learn-github-actions/contexts
- dawidd6/action-send-mail documentation — https://github.com/dawidd6/action-send-mail
- Slack Block Kit / Incoming Webhooks documentation — https://api.slack.com/messaging/webhooks
- Discord webhook / embeds documentation — https://discord.com/developers/docs/resources/webhook

## Issues Found
- **Slack GitHub Action v2 example used the deprecated v1 interface.** The "Using the Slack GitHub Action" example pinned `slackapi/slack-github-action@v2` but configured it with the v1-style `channel-id` input and a `SLACK_BOT_TOKEN` environment variable. In v2 these were removed: the action's `action.yml` no longer defines `channel-id`, and authentication via the `SLACK_BOT_TOKEN` env var was replaced by an explicit `token` input together with a `method` input. As written, the example would fail under `@v2`. Fixed by switching to the correct v2 form: added `method: chat.postMessage`, added `token: ${{ secrets.SLACK_BOT_TOKEN }}` as an input, moved the channel into the payload (`"channel": "C0123456789"`), and removed the now-invalid `env:` block. Verified against the v2 `action.yml` input list and the official v2 documentation/release notes.

## Review Notes
- The Slack and Discord raw `curl` webhook examples, the Teams `MessageCard` payload, the `dawidd6/action-send-mail@v3` usage, and the `gh run list` + `jq` summary script are all syntactically correct and use current, working APIs.
- The post correctly notes that Microsoft Teams is transitioning from Office 365 Connectors to Workflows. Microsoft has announced the retirement of Office 365 Connectors, so readers building new Teams integrations should prefer the Workflows (Power Automate) path; the legacy `MessageCard` example still functions on existing connector URLs but is on a deprecation track. Worth a future update if Connectors are fully removed.
- `dawidd6/action-send-mail@v3` is valid and widely used; a newer `@v4` exists. v3 is not broken, so no change was required, but a future refresh could bump the major version.
- Job-level `outputs: status: ${{ job.status }}` in the conditional-notifications example is valid (the `job` context exposes `status`), though the downstream steps actually rely on `needs.build.result`, which is the more idiomatic choice.
