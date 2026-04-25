# Validation Summary: How to Configure Activity Logs in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Syslog / SIEM integration
- Docker

## Sources Consulted
- Portainer Documentation, Logs overview: https://docs.portainer.io/admin/logs
- Portainer Documentation, Activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer Documentation, Authentication logs: https://docs.portainer.io/admin/logs/authentication
- Portainer Documentation, SIEM streaming: https://docs.portainer.io/sts/advanced-topics/siem
- Portainer Documentation, API documentation index: https://docs.portainer.io/api/docs
- Portainer API reference for Business Edition 2.39.1: https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer OpenAPI document for Business Edition 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Documentation, Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer Documentation, Install Portainer BE with Docker on Linux: https://docs.portainer.io/sts/start/install/server/docker/linux

## Issues Found
- The post incorrectly said activity logging is managed under `Settings > General` with an enable switch and retention period. Current Portainer docs place activity logs under `Logs > Activity` and do not document that enable/retention UI, so this was corrected to a verification workflow based on the documented UI.
- The post conflated activity logs with authentication logs. Current Portainer docs treat these as separate log views, so the introduction, summary table, and viewing instructions were corrected to distinguish `Logs > Activity` from `Logs > Authentication`.
- The "What Gets Logged" table claimed unsupported field-level details such as compose diffs and old/new setting values. This was replaced with the documented fields: authentication logs expose date/time, origin IP, context, user, and result; activity logs expose date/time, user, endpoint/context, action, and an inspectable payload.
- The syslog example was technically wrong because it configured Docker's container log driver rather than Portainer's documented auth/activity log streaming feature. It was replaced with Portainer's documented `--syslog-*` startup flags.
- The API example used an incorrect endpoint, `/api/logs/activity`. The Business Edition API reference documents `/api/useractivity/logs` and `/api/useractivity/logs.csv`, so the example was corrected to use the proper endpoint.
- The retention section claimed Portainer automatically deletes old logs based on a configurable retention period. I did not find current official documentation for that behavior, so the section was corrected to documented export/archiving guidance instead.

## Review Notes
- The Portainer SIEM documentation is internally inconsistent: the flag table shows `--syslog-address` while the official example command uses `--syslog-addr`. The blog now follows the official example command from that same documentation page.
- Portainer's current documentation recommends HTTPS on port `9443` for API access, with port `9000` described as legacy HTTP.
