# Validation Summary: How to Integrate RHEL System Alerts with Microsoft Teams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Microsoft Teams incoming webhooks and Workflows
- Bash scripting
- cron
- systemd services
- GNU coreutils
- Python JSON encoding
- curl

## Sources Consulted
- Microsoft Learn: Create Incoming Webhooks - Teams: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Support: Send messages in Teams using incoming webhooks: https://support.microsoft.com/en-US/Workflows/send-messages-in-teams-using-incoming-webhooks
- Microsoft 365 Developer Blog: Retirement of Office 365 connectors within Microsoft Teams: https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/
- Microsoft Learn: Legacy actionable message card reference: https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
- Python documentation: json encoder and decoder: https://docs.python.org/3/library/json.html
- GNU Coreutils documentation: df invocation: https://www.gnu.org/software/coreutils/df
- GNU Coreutils documentation: nproc invocation: https://www.gnu.org/software/coreutils/nproc
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local crontab(5), df --help, nproc --help, curl --version, and systemctl --version output

## Issues Found
- The Teams setup steps centered on the legacy "Connectors" path and used an old `outlook.office.com/webhook`-style placeholder. Microsoft documentation now directs webhook setup through Teams Workflows, and Microsoft has announced final retirement of Office 365 Connectors in Teams in May 2026. I changed the setup steps to use the "Send webhook alerts to a channel" Workflows template and replaced the hardcoded webhook placeholder with a configurable workflow/webhook URL.
- The alert script manually interpolated shell variables into JSON. Alert titles or messages containing quotes, backslashes, or newlines could produce invalid JSON. I changed the script to generate the MessageCard payload with Python's `json.dumps`, which correctly escapes string values.
- The post advised storing the webhook URL in a restricted config file, but the example still hardcoded it in the script. I updated the script to source `/etc/teams-alert.conf` and added commands to create that file with mode `600`.
- The high-load check used `bc` for floating-point comparison, which adds an avoidable dependency that may not be present on minimal RHEL systems. I replaced it with an `awk` comparison, using tooling already present in the script.

## Review Notes
The remaining examples are technically valid for a lightweight monitoring tutorial. In production, the scripts could be improved with retry/backoff handling for Teams rate limits, explicit PATH settings for cron, alert deduplication, and service lists tailored to the specific RHEL host.
