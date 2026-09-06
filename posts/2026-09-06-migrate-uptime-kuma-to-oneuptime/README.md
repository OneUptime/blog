# How to Import Existing Uptime Kuma Monitors into OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Uptime Kuma, Migration, REST API, Monitoring

Description: Migrate Uptime Kuma monitors through an explicit inventory, field mapping, staged OneUptime creation, and side-by-side validation.

---

OneUptime 12.0.33 does not document or ship a one-click Uptime Kuma importer. A dependable migration is therefore an export, transform, and create workflow, with manual review for semantics the products do not share.

Do not point an undocumented script at production and assume that matching URLs means matching behavior.

## Preserve the source first

Back up Uptime Kuma by the method supported for the installed major version. Uptime Kuma v2 removed the v1 JSON backup and restore feature, so an old tutorial that says to click a JSON export button is not a universal migration path. Preserve the v2 data directory and database using the project's documented backup guidance before reading or changing anything.

For a small installation, build the migration inventory from the Uptime Kuma interface. For a large installation, only use a source extraction method supported by the exact Uptime Kuma version. Its internal Socket.IO calls and database schema are implementation details, not a stable cross-version migration API.

Capture at least:

```csv
source_id,name,type,target,interval_seconds,timeout_seconds,retries,expected_status,keyword,tags,notification_route,active
```

Keep credentials out of this file. Record only a reference to the source secret so it can be recreated in OneUptime's monitor secrets.

## Map intent, not only fields

Create a review table before creating resources:

| Uptime Kuma intent | OneUptime destination | Review required |
| --- | --- | --- |
| HTTP or keyword check | Website or API monitor plus steps and criteria | method, redirects, body, accepted status, keyword semantics |
| TCP port | Port monitor | host, port, timeout, probe network |
| Ping | Ping monitor | private routing and ICMP policy |
| DNS | DNS monitor | record type, resolver, expected answer |
| Certificate expiry | SSL Certificate monitor | hostname, port, warning threshold |
| Push monitor | Incoming Request monitor | new endpoint and sender changes |
| Docker or database check | Matching OneUptime monitor type where available | permissions, agent or probe placement |

Pause entries that do not have an unambiguous mapping. Maintenance windows, retry timing, upside-down logic, accepted status ranges, authentication, and notification routing must be reviewed separately.

## Prepare OneUptime safely

Create a migration-specific OneUptime API key under **Project Settings > API Keys**. API keys start without permissions, so grant only the monitor and monitor-step permissions required for the target project. Send it as the `ApiKey` header, never in a query string.

Create monitor secrets first and grant only the appropriate monitors access. Translate tokens in headers to references such as:

```text
Authorization: Bearer {{monitorSecrets.ApiToken}}
```

The OneUptime API separates a monitor resource from its monitor steps and criteria. Creating only `/api/monitor` is not enough to reproduce an active HTTP check. Use the current Monitor and Monitor Step API reference to construct and validate both objects.

## Migrate in disabled batches

Start with five representative monitors, one of each important type. Create them disabled, attach the correct probe, steps, criteria, labels, owners, and notification policies, then have a second person review the result.

For API automation, use this control flow rather than blind repeated POSTs:

```text
for each reviewed source monitor:
    look up target by migration label and source id
    if it exists, compare and update deliberately
    otherwise, create a disabled monitor
    create or reconcile its monitor steps
    read the result back and record the OneUptime id
```

The migration label makes retries idempotent. The API request bodies are version-specific, so generate them from the current OneUptime reference rather than copying a stale payload. Log IDs and validation errors, but redact the `ApiKey` header and secret values.

## Run both systems side by side

Enable the first batch without disabling Uptime Kuma. Compare at least several normal check cycles and one controlled failure:

- check frequency and timeout
- failure and recovery timestamps
- regional or private probe path
- redirect, TLS, and DNS behavior
- incident and alert creation
- notification recipients and escalation

Duplicate notifications are expected during this window. Route the OneUptime test project to a controlled recipient until its behavior is approved.

Migrate the remaining monitors in bounded batches. Reconcile counts after every batch, then keep Uptime Kuma read-only for an agreed observation period. Revoke the migration API key and archive the source inventory after acceptance.

## What does not migrate automatically

Historical heartbeat data, status-page history, notification credentials, users, and product-specific settings do not become OneUptime records merely because monitors were recreated. Retain the Uptime Kuma backup according to audit requirements and document the cutover timestamp.

## Conclusion

There is no verified built-in Uptime Kuma importer in OneUptime 12.0.33. Treat migration as controlled data translation: preserve the source, map monitor semantics, create disabled resources through the documented OneUptime API or UI, validate side by side, and cut over in batches.

## Official Documentation

- [OneUptime API reference guide](https://oneuptime.com/docs/en/api-reference/api-reference)
- [OneUptime API authentication](https://oneuptime.com/reference/en/authentication)
- [OneUptime Monitor API](https://oneuptime.com/reference/en/monitor)
- [OneUptime Monitor Step API](https://oneuptime.com/reference/en/monitor-step)
- [Uptime Kuma repository](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma migration from v1 to v2](https://github.com/louislam/uptime-kuma/wiki/Migration-From-v1-To-v2)
