# Validation Summary: How to Import Existing Uptime Kuma Monitors into OneUptime

## Status
validated

## Post Type
Technical migration guide with an inventory schema, monitor-secret substitution example, and automation pseudocode.

## Technologies Covered
- OneUptime 12.0.33 monitor configuration and REST API
- Uptime Kuma v1 and v2 backup and migration behavior
- HTTP/API, TCP, ICMP, DNS, TLS certificate, incoming request, Docker, and database monitoring
- API keys, monitor secrets, and migration reconciliation

## Sources Consulted
- OneUptime API reference guide: https://oneuptime.com/docs/en/api-reference/api-reference
- OneUptime API authentication: https://oneuptime.com/reference/en/authentication
- OneUptime Monitor API: https://oneuptime.com/reference/en/monitor
- OneUptime Monitor Steps data type: https://oneuptime.com/reference/en/monitor-steps
- OneUptime Monitor Step data type: https://oneuptime.com/reference/en/monitor-step
- OneUptime Monitor Secrets documentation: https://oneuptime.com/docs/en/monitor/monitor-secrets
- OneUptime 12.0.33 source tree, tag resolving to bccf2519397d334a40cda3c5c87a5d7e29f35ed5: https://github.com/OneUptime/oneuptime/tree/12.0.33
- Versioned Monitor model, including embedded steps, permissions, labels, and disabled state: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/Monitor.ts
- Versioned MonitorSteps serialization and validation: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/Monitor/MonitorSteps.ts
- Versioned MonitorStep configuration and validation: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/Monitor/MonitorStep.ts
- Versioned monitor types: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/Monitor/MonitorType.ts
- Versioned Monitor service: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/MonitorService.ts
- Versioned monitor-secret documentation: https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/monitor/monitor-secrets.md
- Uptime Kuma repository: https://github.com/louislam/uptime-kuma
- Uptime Kuma v1-to-v2 migration and backup guidance: https://github.com/louislam/uptime-kuma/wiki/Migration-From-v1-To-v2

## Issues Found
1. **Incorrect monitor resource model.** The post described monitor steps as separate API resources and implied that the Monitor endpoint could not create the full check. Steps and their criteria are nested in the Monitor model's `monitorSteps` JSON field. Corrected the explanation, reconciliation pseudocode, and documentation link label.
2. **Nonexistent separate monitor-step permissions.** Replaced this instruction with monitor create/read/update permissions plus permissions for related resources actually managed by the migration. The versioned field access controls use monitor permissions.
3. **Overstated idempotency.** A label does not enforce uniqueness or make POST retries safe. Added a persisted source-instance/source-id mapping, serialized creation, and reconciliation of ambiguous outcomes before retrying.
4. **Unconditional probe assignment.** Some monitor types use inbound requests or telemetry rather than scheduled probe checks. Made probe assignment conditional on monitor type and identified `disableActiveMonitoring: true` explicitly.
5. **Unqualified use of current API documentation.** Live documentation can differ from version 12.0.33. Changed payload guidance to use the reference matching the installed version.

## Review Notes
- This is technically relevant even though the automation block is pseudocode. The CSV is a proposed inventory header, not a product export schema. No executable migration script or terminal commands are supplied.
- Confirmed the published 12.0.33 tag and searched its extracted source tree for Uptime Kuma references; no Kuma-specific importer was found. The absence claim is scoped to the reviewed release, not future versions or third-party tools.
- Confirmed the documented API key creation location, initially unassigned permissions, and `ApiKey` request header.
- Confirmed the monitor-secret substitution syntax and per-monitor access selection. The example requires an existing secret named `ApiToken` and access granted to the destination monitor.
- The listed destination monitor types exist in the versioned enum. Their presence does not guarantee semantic equivalence; the post correctly calls for reviewing status matching, retries, timeouts, authentication, routing, and alert behavior.
- Uptime Kuma's official migration guide confirms removal of JSON backup/restore in v2 and instructs stopping the service before backing up the data directory. The inventory is deliberately separate from backup restoration; internal database and Socket.IO structures are not presented as a stable migration contract.
- Side-by-side checks, controlled failure testing, count reconciliation, key revocation, and retention of historical source data are operational recommendations. Recreating monitors alone does not transfer historical data or unrelated configuration.
- All six links originally included in the post resolved to their intended official resources. Monitor Step is a data-type reference despite its URL resembling a resource URL.
- Validation was based on official documentation and versioned source inspection. No live OneUptime/Uptime Kuma deployment or end-to-end migration was run, and no credentials were used.
