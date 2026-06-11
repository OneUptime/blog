# Validation Summary: How to Implement Manual Failover

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL replication and promotion
- Bash scripting
- Kubernetes Jobs and kubectl rollout/scale commands
- Cloudflare DNS API
- DNS TTL behavior
- Slack incoming webhooks
- PagerDuty Events API v2
- systemd service restart commands

## Sources Consulted
- PostgreSQL documentation: Connections and Authentication (`max_connections`): https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL documentation: ALTER DATABASE: https://www.postgresql.org/docs/current/sql-alterdatabase.html
- PostgreSQL documentation: System Administration Functions (`pg_promote`, WAL replay functions, replay timestamps): https://www.postgresql.org/docs/current/functions-admin.html
- Kubernetes documentation: kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Cloudflare documentation: Manage DNS records: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/
- Cloudflare API documentation: Update DNS Record: https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/edit/
- Cloudflare documentation: DNS TTL: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- Slack Developer Docs: Sending messages using incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- PagerDuty Developer Docs: Sending an Alert Event / Events API v2: https://developer.pagerduty.com/docs/send-alert-event

## Issues Found
- The PostgreSQL failover script used `ALTER SYSTEM SET max_connections = 0` followed by `pg_reload_conf()` to stop new connections. PostgreSQL documents `max_connections` as a server-start parameter, so changing it requires restart and is not appropriate for an immediate failover drain. Replaced this with `ALTER DATABASE ... WITH ALLOW_CONNECTIONS false`, which is documented for disabling new connections to a specific database.
- The PostgreSQL replication-lag check used `pg_last_xact_replay_timestamp()` without handling `NULL`. PostgreSQL documents that this function returns `NULL` when no transactions have been replayed or when the server was started normally. Added `COALESCE(...)` so the Bash numeric comparison does not fail on an empty result.
- The Kubernetes failover job used `kubectl rollout status deployment --timeout=300s` without naming or selecting the deployment resources. Kubernetes documents the command shape as `TYPE NAME`, `TYPE/NAME`, filename, or selector. Added an `APP_LABEL` environment variable and used `-l "$APP_LABEL"` for scale and rollout status commands.
- The rollback script invoked `./dns-failover.sh --target "$ORIGINAL_PRIMARY"`, but the DNS failover script did not implement a `--target` argument and updated by `NEW_IP`. Updated the DNS script to allow `NEW_IP` environment overrides and changed rollback to call `NEW_IP="$ORIGINAL_PRIMARY_IP" ./dns-failover.sh`.
- The rollback script did not undo the database-level connection block added during failover. Added an `ALTER DATABASE ... WITH ALLOW_CONNECTIONS true` step before switching traffic back to the original primary, and corrected the step counters.

## Review Notes
- The examples are still illustrative runbook scripts and assume local conventions such as database names, labels, service names, health-check response formats, and Cloudflare zone/record IDs. Operators should adapt and test them in staging before using them in production.
- The PostgreSQL LSN comparison is a simplified equality check. In production, teams often also account for receive/replay lag, replication slots, synchronous replication mode, timelines, and whether the old primary has been fenced before promotion.
- Slack incoming webhooks and PagerDuty Events API v2 payload shapes are broadly correct, but real integrations should avoid hard-coded secrets and should handle non-2xx API responses.
