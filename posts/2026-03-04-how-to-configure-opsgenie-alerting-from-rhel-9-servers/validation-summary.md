# Validation Summary: How to Configure Opsgenie Alerting from RHEL 9 Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Bash
- cron
- systemd/systemctl
- curl
- GNU coreutils
- Opsgenie Alert API

## Sources Consulted
- Opsgenie Alert API: https://docs.opsgenie.com/docs/alert-api
- Opsgenie alert fields documentation: https://support.atlassian.com/opsgenie/docs/alert-fields/
- Opsgenie API integration documentation: https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/
- Red Hat cron documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- GNU coreutils manual for df output fields: https://www.gnu.org/software/coreutils/manual/coreutils.html

## Issues Found
- The alert creation script used a double-quoted JSON string with unescaped JSON field quotes. Bash would strip those quotes, so the payload sent to Opsgenie would not be valid JSON. Escaped the JSON quotes so the request body matches Opsgenie's Alert API format.
- The alias hash used `echo $MESSAGE`, which allowed word splitting and shell glob expansion. Changed it to `printf '%s' "$MESSAGE"` so the deduplication alias is derived from the exact alert message.
- The examples wrote scripts into `/opt/scripts` without creating that directory first. Added `sudo mkdir -p /opt/scripts` before writing each script.

## Review Notes
- Opsgenie's documented create-alert endpoint, `GenieKey` authorization header, alert fields, P1-P5 priorities, and close-by-alias endpoint match the post's API usage.
- The `/etc/cron.d` examples use the expected system crontab format with an explicit `root` user field.
- The disk usage command uses GNU `df --output=pcent`, which is supported by GNU coreutils.
