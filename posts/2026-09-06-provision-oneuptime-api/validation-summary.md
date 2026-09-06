# Validation Summary: How to Provision Monitors and Status Pages Automatically with the OneUptime API

## Status
validated

## Post Type
Technical guide with Bash/curl commands, JSON request bodies, and declarative YAML input.

## Technologies Covered
- OneUptime 12.0.33 REST API and project API keys
- Monitor configuration, MonitorSteps/MonitorStep data types, and status pages
- Bash, curl, JSON, and YAML
- Declarative reconciliation and CI automation
- OneUptime Terraform provider

## Sources Consulted
- [API reference guide](https://oneuptime.com/docs/en/api-reference/api-reference)
- [API authentication](https://oneuptime.com/reference/en/authentication)
- [Monitor API](https://oneuptime.com/reference/en/monitor)
- [MonitorStep data type](https://oneuptime.com/reference/en/monitor-step)
- [MonitorSteps data type and serialization](https://oneuptime.com/reference/en/monitor-steps)
- [Status Page API](https://oneuptime.com/reference/en/status-page)
- [Status page resources and groups](https://oneuptime.com/docs/en/status-pages/resources-and-groups)
- [Terraform provider guide](https://oneuptime.com/docs/en/terraform/index)
- [Version 12.0.33 package metadata](https://github.com/OneUptime/oneuptime/blob/12.0.33/package.json)
- [Version 12.0.33 Monitor model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/Monitor.ts)
- [Version 12.0.33 Monitor service](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/MonitorService.ts)
- [Official curl manual](https://curl.se/docs/manpage.html) and local `curl --help all` output

## Issues Found
1. **Incorrect separate Monitor Step resource endpoint.** The article directed readers to `/api/monitor-step`. The reference describes a nested data type, and the versioned Monitor model stores `monitorSteps` as JSON. Corrected the instructions to update the monitor's `monitorSteps` field with `PUT /api/monitor/:id` and use the documented serialization. Corrected the introduction, conclusion, and link label accordingly.
2. **Incorrect initial status requirement.** The article required a caller-supplied `currentMonitorStatusId`. In 12.0.33, MonitorService selects the project's operational status during creation and assigns that field. Removed it from the minimal request and explained the actual prerequisite: an operational monitor status must exist in the project. This also avoids submitting a field whose create permissions differ from ordinary monitor creation.
3. **Incorrect permission scope.** Removed the suggestion that Monitor Step has separate resource permissions. Monitor steps use Monitor permissions. Included the separate status page resource/group and probe assignment resources when managed by the provisioner.
4. **Overgeneralized disabled creation.** The reconciliation checklist applied disabled creation to every resource. Restricted the active-monitoring disable instruction to monitors; status pages and other resource types do not share that flag.

## Review Notes
- Verified the named release against its package metadata and inspected its Monitor model and creation service. Live references are unversioned and may differ from the pinned release; source inspection resolved the initial-status discrepancy.
- Authentication documentation confirms the dashboard path, initially permission-empty keys, and `ApiKey` header. The list example uses the documented POST get-list route and request shape. The project environment variable is not used by that example; project API keys provide project context.
- The revised JSON creates a disabled monitor record, not a complete working API check. Steps, criteria, probe assignments, and status page relationships still need reconciliation before activation, as the guide explains.
- Reviewed the YAML as provisioner-owned desired state, not a OneUptime API payload. Its keys are intentionally illustrative.
- Checked Bash syntax with `bash -n`, parsed the JSON example and inline list body, and verified curl flags. `--fail-with-body` requires curl 7.76.0 or later.
- All six official documentation links resolve to relevant pages. The Monitor Step link resolves to a data type reference, now labeled correctly. Example domains and IDs are placeholders requiring substitution.
- Status page resources and groups are explicitly configured; creating a page alone does not publish every monitor. Terraform is a supported alternative client.
- Stable identity, duplicate detection, read-after-error reconciliation, field ownership, concurrency locks, secret redaction, and controlled activation are sound operational recommendations. A read after an ambiguous failure is a safeguard, not a server-side exactly-once guarantee.
- No authenticated requests or failure/recovery exercises were executed: no test deployment or credentials were provided. Validation is based on official documentation, versioned source, and local syntax checks.
