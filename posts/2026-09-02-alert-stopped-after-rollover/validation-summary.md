# Validation Summary: Why Did an OpenSearch Alert Stop Firing After an Index Rollover? Fixing Aliases and Monitor Queries

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- OpenSearch Alerting monitors and the Execute Monitor API
- OpenSearch index aliases and the Manage Aliases API
- Composable index templates and index rollover
- Index State Management (ISM) policies and error-prevention validation
- OpenSearch data streams and backing indexes
- Field mappings, date ranges, and the Field Capabilities API
- OpenSearch Security permissions and Notifications channels

## Sources Consulted

- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
- [OpenSearch Alerting monitors](https://docs.opensearch.org/latest/observing-your-data/alerting/monitors/)
- [OpenSearch per-query and per-bucket monitors](https://docs.opensearch.org/latest/observing-your-data/alerting/per-query-bucket-monitors/)
- [OpenSearch Alerting trigger context](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch Alerting security](https://docs.opensearch.org/latest/observing-your-data/alerting/security/)
- [OpenSearch Notifications API](https://docs.opensearch.org/latest/observing-your-data/notifications/api/)
- [OpenSearch index aliases](https://docs.opensearch.org/latest/im-plugin/index-alias/)
- [OpenSearch Manage Aliases API](https://docs.opensearch.org/latest/api-reference/alias/aliases-api/)
- [OpenSearch Get Index Alias API](https://docs.opensearch.org/latest/api-reference/alias/get-alias/)
- [OpenSearch Roll Over Index API](https://docs.opensearch.org/latest/api-reference/index-apis/rollover/)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch ISM API](https://docs.opensearch.org/latest/im-plugin/ism/api/)
- [OpenSearch ISM error prevention](https://docs.opensearch.org/latest/im-plugin/ism/error-prevention/index/)
- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [OpenSearch Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [OpenSearch date field type](https://docs.opensearch.org/latest/mappings/supported-field-types/date/)
- [OpenSearch range query](https://docs.opensearch.org/latest/query-dsl/term/range/)
- [OpenSearch Alerting implementation: dry-run action handling](https://github.com/opensearch-project/alerting/blob/dd6ad82564fb050638e07c4c712ff9d3c24e1979/alerting/src/main/kotlin/org/opensearch/alerting/QueryLevelMonitorRunner.kt#L224-L249)

## Issues Found

- The monitor inspection instructions treated `inputs[].search.indices` as a generic response path. Scoped the instructions to query-level and bucket-level extraction-query monitors and corrected the GET response path to `monitor.inputs[].search.indices`; document-level and PPL monitors use different input objects.
- Dry-run mode was described as running without actions. Clarified that it prevents actions from sending messages while still allowing action rendering results to be inspected.
- The rollover-template recipe was described as applying to regular-index rollover generally, even though `plugins.index_state_management.rollover_alias` is specific to ISM-managed rollover. Qualified the recipe as ISM-managed.
- The time-window check referred to `ctx.periodStart` and `ctx.periodEnd` as fields returned by the dry run. Replaced them with the Execute API response fields `period_start` and `period_end` and identified the camel-case names as trigger/action context variables.
- The permissions section said monitors use only their creator's permissions. Corrected it to state that, when the Security plugin is enabled, a monitor runs with the permissions of the user who created or last modified it, and updated related wording about the execution identity.
- The ISM command implied that `validate_action=true` always returns error-prevention details. Added the requirement that `plugins.index_state_management.action_validation.enabled` must be enabled cluster-wide; normal Explain output remains available without it.
- The notification guidance could imply that a successful dry run validates delivery. Clarified that dry-run action results can reveal rendering errors but delivery must be verified separately through Notifications because dry-run mode sends no messages.

## Review Notes

- The CAT indices, Get Alias, Get Data Stream, Get Monitor, Execute Monitor, Manage Aliases, Field Capabilities, and ISM Explain requests are syntactically valid and current.
- The composable-template setting, bootstrap alias definition, atomic write-index switch, and requirement for one write index on a multi-index alias match the current OpenSearch documentation.
- The data-stream explanation is accurate: writes target the newest backing index, searches target all backing indexes, and monitors should use the data-stream name rather than hidden `.ds-*` backing-index names.
- ISM error-prevention validation and `validate_action` were introduced in OpenSearch 2.4; the post otherwise makes no version-specific claims.
- All external references in the post resolve to the intended official OpenSearch documentation pages.
