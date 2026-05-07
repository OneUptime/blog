# Validation Summary: How to Set Up Alerts Based on Podman Container Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman events
- Bash scripting
- jq
- mail-based email alerts
- Slack incoming webhooks
- systemd user services

## Sources Consulted
- Podman official documentation: podman-events - https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Slack Developer Docs: Sending messages using incoming webhooks - https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- Local jq 1.7 command availability and syntax behavior
- Local systemctl help output for user service commands

## Issues Found
1. **Incorrect Podman event JSON paths:** The scripts used Docker-style fields such as `.Actor.Attributes.name`, `.Actor.Attributes.containerExitCode`, and `.time`. Podman documents top-level fields including `.Name`, `.ContainerExitCode`, and `.Time`. Updated all jq expressions to use the documented Podman fields.
2. **Incorrect event status name for container exits:** The post used `die`, but Podman's documented container event status is `died`. Updated the event lists, case statements, test description, and filter examples to use `died`.
3. **Nonexistent Podman `oom` event status:** Podman's documented container event statuses do not include `oom`. Updated the post to treat exit code `137` on a `died` event as a possible OOM-kill signal instead of filtering or matching an `oom` event.
4. **Email script would alert on clean exits after switching to `died`:** A `died` event can represent a normal exit with code `0`. Added a guard to skip exit code `0` in the email alert loop.

## Review Notes
- Podman events alone can indicate a possible OOM kill through exit code `137`, but definitive OOM confirmation may require inspecting container state or logs.
- The systemd unit assumes the alert script exists at `/usr/local/bin/podman-alerts.sh`; readers need to install their chosen script at that path or adjust `ExecStart`.
