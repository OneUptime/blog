# Validation Summary: How to Set Up Slack Alert Notifications from RHEL Using Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Slack incoming webhooks
- Bash scripting
- curl
- jq
- GNU df/coreutils
- systemd unit files and drop-ins
- cron

## Sources Consulted
- Slack Developer Docs, "Sending messages using incoming webhooks": https://api.slack.com/messaging/webhooks
- Slack Developer Docs, incoming webhook error documentation: https://api.slack.com/incoming-webhooks
- systemd.unit manual, including drop-ins, OnFailure=, %N, %i, and %H specifiers: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service manual, including Type=oneshot and ExecStart= command syntax: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- GNU Coreutils df manual, including --output, pcent, and target fields: https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html
- Local curl help output for -s, -X, -H, and -d options.
- Local jq help output for -n/--null-input and --arg.
- Local crontab(5) manual for /etc/cron.d system crontab format with a username field.

## Issues Found
- The original Slack payload examples interpolated shell variables directly into JSON strings. Alert messages, service names, hostnames, or mount paths containing quotes, backslashes, or newlines could produce malformed JSON and trigger Slack invalid_payload errors. Updated the examples to build JSON with jq -n and --arg so string values are JSON-escaped correctly.
- The disk monitoring example parsed `df --output=target,pcent` with `read mount usage`, which breaks for mount points containing spaces. Changed the output order to `pcent,target` and used `read -r usage mount` so the mount field can contain spaces.
- The disk thresholds used `-gt`, so an exact 80% warning or exact 90% critical value would not alert even though those values were named as thresholds. Changed the comparisons to `-ge`.
- The systemd OnFailure example hardcoded the failed service instance in the drop-in. Updated it to use systemd's documented `%N` specifier pattern, so the drop-in passes the actual unit name into the template service.
- The introduction said only curl was required. Since the corrected scripts use jq to generate valid JSON safely, updated the prerequisite wording to mention jq.

## Review Notes
- Slack incoming webhooks accept JSON payloads with text, blocks, and attachments. Attachments remain supported, but Slack's newer formatting examples emphasize blocks for richer layouts.
- The service list is illustrative. On RHEL systems, PostgreSQL service unit names can vary depending on how PostgreSQL was installed and configured.
