# Validation Summary: Alert Only on OpenSearch Monitor State Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenSearch Alerting
- Bucket-level monitors
- Query-level monitors
- Document-level monitors
- Mustache notification templates
- OpenSearch Alerting API

## Sources Consulted
- [OpenSearch Alerting overview and alert states](https://docs.opensearch.org/latest/observing-your-data/alerting/)
- [OpenSearch alerting actions and throttling](https://docs.opensearch.org/latest/observing-your-data/alerting/actions/)
- [OpenSearch alerting triggers and template variables](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
- [OpenSearch per document monitors](https://docs.opensearch.org/latest/observing-your-data/alerting/per-document-monitors/)
- [OpenSearch Alerting plugin source code](https://github.com/opensearch-project/alerting)

## Issues Found
No technical issues found.

## Review Notes
The API fragment is valid for bucket-level monitor actions and correctly selects `NEW` and `COMPLETED` while excluding `DEDUPED`. The alert lifecycle, Mustache context arrays, acknowledgment behavior, per-execution fallback, default actionable-alert limit, per-alert throttling behavior, and document-level sequence-number tracking were also checked. Some runner and throttling details are implementation-specific, so the post's advice to test against the installed OpenSearch version remains important.
