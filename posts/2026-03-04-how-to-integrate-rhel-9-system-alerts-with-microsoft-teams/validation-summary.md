# Validation Summary: How to Integrate RHEL 9 System Alerts with Microsoft Teams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Bash shell scripting
- cron system crontabs
- curl HTTP POST requests
- Microsoft Teams Incoming Webhooks
- Microsoft 365 connector cards

## Sources Consulted
- Microsoft Learn: Create Incoming Webhooks - https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Learn: Create and send actionable messages - https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
- Microsoft Learn: Create and explore card types in Teams - https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference
- Local `crontab(5)` manual page for system crontab format and percent-sign handling
- Local `top(1)` manual page and `top -bn1` output for CPU summary behavior
- Local `curl(1)` manual page and `curl --version` output for HTTP POST option support

## Issues Found
- The Teams UI steps used the older direct "Connectors" menu path. Updated the steps to the current Microsoft-documented path through "Manage channel" and the Connectors edit option.
- The script wrote to `/opt/scripts/teams-alert.sh` without ensuring that `/opt/scripts` exists. Added `sudo mkdir -p /opt/scripts`.
- The webhook placeholder used the older `outlook.office.com/webhook` style. Updated it to the current `webhook.office.com` placeholder format shown in Microsoft examples.
- The JSON payload was embedded in a double-quoted shell string, so keys such as `"@type"` would terminate the string and make the script invalid. Replaced it with a Python `json.dumps` payload builder to produce valid JSON and safely quote message values.
- The connector card payload was missing `@context` and `summary`, both shown or recommended in Microsoft's connector card documentation. Added both fields.
- The cron command contained an unescaped `%`, which cron treats as a newline in command fields. Escaped it as `\%`.
- The CPU check used `awk '{print int($2)}'`, which reads only the user CPU percentage from `top`, not total CPU usage. Changed it to calculate total non-idle CPU from the `top` summary line.

## Review Notes
- Microsoft documents Incoming Webhooks and connector cards, but also warns that Microsoft 365 Connectors are nearing deprecation and recommends Teams Workflows or notification bots for new implementations. The post remains technically valid for an Incoming Webhook connector, but a future revision should consider a Workflows-based version.
