# Validation Summary: Why Does an OpenSearch Per-Document Monitor Omit Source Fields? Fixing Trigger Context and Templates

## Status
validated

## Post Type
Troubleshooting guide / technical tutorial

## Technologies Covered
- OpenSearch Alerting per-document and document-level monitors
- OpenSearch alert, finding, and action execution contexts
- Mustache notification templates
- OpenSearch Multi-get Documents API
- OpenSearch `_source`, derived source, and source filtering
- OpenSearch Security field-level and index-level permissions

## Sources Consulted
- OpenSearch alerting triggers and sample-document context: https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/
- OpenSearch 2.13 trigger documentation: https://docs.opensearch.org/2.13/observing-your-data/alerting/triggers/
- OpenSearch 2.12 trigger documentation: https://docs.opensearch.org/2.12/observing-your-data/alerting/triggers/
- OpenSearch per-document monitors and findings: https://docs.opensearch.org/latest/observing-your-data/alerting/per-document-monitors/
- OpenSearch Alerting API, findings search, and monitor execution: https://docs.opensearch.org/latest/observing-your-data/alerting/api/
- OpenSearch alerting actions: https://docs.opensearch.org/latest/observing-your-data/alerting/actions/
- OpenSearch alerting security: https://docs.opensearch.org/latest/observing-your-data/alerting/security/
- OpenSearch field-level security: https://docs.opensearch.org/latest/security/access-control/field-level-security/
- OpenSearch `_source` metadata field and derived source: https://docs.opensearch.org/latest/mappings/metadata-fields/source/
- OpenSearch Multi-get Documents API, response fields, routing, and permissions: https://docs.opensearch.org/latest/api-reference/document-apis/multi-get/
- OpenSearch alerting system-index guidance: https://docs.opensearch.org/latest/observing-your-data/alerting/settings/#alerting-indexes
- Mustache sections and dotted-name behavior: https://mustache.github.io/mustache.5.html
- OpenSearch Alerting 3.8 document-level sample retrieval implementation: https://github.com/opensearch-project/alerting/blob/3.8.0.0/alerting/src/main/kotlin/org/opensearch/alerting/transport/TransportDocLevelMonitorFanOutAction.kt
- OpenSearch Alerting sample-document context feature and 2.13 backport: https://github.com/opensearch-project/alerting/pull/1450 and https://github.com/opensearch-project/alerting/pull/1477
- OpenSearch Alerting required-routing bug and proposed fix: https://github.com/opensearch-project/alerting/issues/2149 and https://github.com/opensearch-project/alerting/pull/2150

## Issues Found
- **The post did not state the minimum version for `associated_queries` and `sample_documents`.** These enriched document-level alert fields first appear in the OpenSearch 2.13 release. Added the OpenSearch 2.13-or-later requirement.
- **The context sketch included `_score` for document-level samples.** Current document-level Alerting constructs `sample_documents` from Multi-get responses, which do not contain a relevance score. Removed `_score` from the sketch.
- **The post described `_source` as the complete original JSON payload.** Alerting source-filters the follow-up multi-get to fields referenced in sample-document template sections, so the context may contain only retrieved fields. Changed the wording to “retrieved source fields.”
- **The verification command tested search access instead of the retrieval operation used by Alerting.** Replaced the IDs search against a wildcard with a Multi-get request against the concrete index and added the requirement for Multi-get permission on that index.
- **The `_source` checklist assumed that source must be stored and fully enabled.** Current OpenSearch can reconstruct derived source, while mapping-level `_source` includes and excludes can permanently omit fields. Updated the checklist to test retrievability and source filtering.
- **The nested-field check referred to the mapping rather than the JSON shape Mustache traverses.** Updated it to verify that the returned `_source` contains nested objects rather than a literal dotted key.
- **The permissions explanation only named the monitor creator and incorrectly treated channel reassignment as permission-neutral.** OpenSearch runs a monitor with permissions captured from the user who created or last modified it. Updated the explanation to note that recipient permissions do not affect source retrieval, but editing the monitor as another user, including a channel change, can change its effective permissions.
- **The source troubleshooting advice omitted a current custom-routing failure mode.** Added the open Alerting bug affecting document-level sample retrieval through OpenSearch 3.8, where the follow-up Multi-get request omits the document routing value.
- **The action-scope explanation implied only per-alert execution.** Clarified per-alert versus per-execution behavior and the corresponding number of entries normally supplied in `ctx.alerts`.
- **The dry-run instructions treated `ctx.error` as an Execute API response field and implied that actions were skipped entirely.** Updated the response fields to top-level, input, and per-trigger `error`; retained `ctx.error` only as a template variable; and clarified that dry run renders action output but does not send action messages.
- **The findings-index statement was unconditional.** Added “By default” because Alerting supports custom findings data sources.

## Review Notes
- The final nested Mustache template matches the documented `ctx.alerts` → `associated_queries` / `sample_documents` structure, and unqualified names inside sections correctly use the current Mustache context.
- The Multi-get and monitor execute HTTP examples are syntactically valid current OpenSearch APIs.
- The upstream custom-routing issue and proposed fix were still open on 2026-09-02. Readers using a later release should check the linked issue and release notes for resolution status.
- The cautions about dumping `ctx`, editing Alerting-owned indexes, notification disclosure, and destination-specific encoding remain technically sound.
