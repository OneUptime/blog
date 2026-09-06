# Validation Summary: How to Prevent OneUptime Alert Storms

## Status

validated

## Post Type

Technical configuration and troubleshooting guide. The post contains actionable implementation details despite having no executable code or terminal commands; the text block illustrates a dependency graph.

## Technologies Covered

- OneUptime 12.0.33
- Monitor dependencies and alert/incident suppression
- API monitoring, retries, and period-based criteria
- On-call escalation, acknowledgement, and reminder rules
- Notification email rollup
- Custom workflow deduplication design

## Sources Consulted

- [API monitor documentation](https://oneuptime.com/docs/en/monitor/api-monitor)
- [Incident states and severities](https://oneuptime.com/docs/en/incidents/states-and-severities)
- [Versioned API monitor documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/monitor/api-monitor.md)
- [Notification email rollup documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/emails/notification-rollup.md)
- [Monitor dependency interface](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Pages/Monitor/View/Dependencies.tsx)
- [Dependency suppression logic](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorDependencySuppression.ts)
- [Dependency validation and cycle guards](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/MonitorService.ts)
- [Alert creation and suppression logs](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorAlert.ts)
- [Incident creation and suppression logs](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorIncident.ts)
- [Monitor retry settings](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/Monitor/MonitorStep.ts)
- [On-call repeat settings](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/OnCallDutyPolicy.ts)
- [Pending on-call execution and acknowledgement](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Workers/Jobs/OnCallDutyPolicyExecutionLog/ExecutePendingExecutions.ts)
- [Alert reminder stop states](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/AlertReminderRule.ts)
- [Incident reminder stop states](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/IncidentReminderRule.ts)
- [Email rollup flush implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/EmailRollup/EmailRollupFlushRunner.ts)

## Issues Found

1. **Detection delay was generalized to all longer windows.** Qualified the statement to sustained-breach and averaging criteria. The documented `Any Value` behavior can match immediately on one breaching check, even with a longer lookback window.
2. **Acknowledgement stopping escalation sounded like a policy option that must be enabled.** Reworded this as existing behavior: the pending-execution worker completes execution when the associated incident or alert is acknowledged. Policy repetition is separately configurable for unacknowledged events.
3. **Email delivery and preservation wording omitted storm-size limits.** Replaced the implication that all held messages arrive together with the documented 500-notification batch limit and overflow behavior. Clarified that rendering folds updates by resource, displays at most 100 resource rows, and uses totals and a project link beyond that limit; it does not reproduce every original notification independently.

## Review Notes

- Verified the 12.0.33 tag and referenced source paths through the official GitHub tree API and raw source downloads. GitHub HTML retrieval failed in the browsing tool, so the corresponding tagged raw files were used. Both live documentation links resolved to the intended resources.
- Dependency suppression checks immediate parents, uses configured suppressing statuses or offline statuses by default, and skips new alert/incident creation. Child evaluation, status recording, and existing-event auto-resolution continue. A chain propagates through the intermediate monitors' actual statuses; it is not an instantaneous recursive ancestor check.
- Confirmed dependency form labels, write-time cycle validation, runtime mutual-cycle protection, and alert/incident suppression log entries.
- Confirmed API period evaluation options and missing-data behavior against the versioned official documentation. Retry settings exist for probe-based monitor steps. Treating missing data as a failure for heartbeat-style monitoring is operational guidance rather than a restriction enforced by OneUptime.
- Alert and incident reminder rules support acknowledged and resolved stop states; the model default is resolved. Acknowledged incidents remain unresolved until resolution.
- Confirmed email thresholds, grouping scope, excluded channels and notification families, and the per-user, per-project opt-out path. Approximate rollup timing is not a delivery guarantee under backlog or worker/mail failures.
- The cooldown claim is appropriately scoped to a general control covering every alert source. This review does not imply that no individual integration or feature has its own grouping or deduplication. The custom workflow item is explicitly a design proposal, not a built-in feature claim.
- Review is pinned to 12.0.33; live documentation may change. No claim is made that this is the latest release.
- No runnable code, commands, or configuration payloads required execution. Validation consisted of documentation/source inspection and checking the resulting files; no live outage, paging, or email-delivery tests were performed.
