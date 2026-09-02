# Validation Summary: Add Log Fields and Dashboard Links to OpenSearch Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenSearch Alerting
- OpenSearch Query DSL
- Painless
- Mustache templates
- OpenSearch Dashboards
- OpenSearch Notifications and custom webhooks
- OpenSearch Security plugin

## Sources Consulted

- [OpenSearch Alerting triggers and context variables](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch Alerting actions](https://docs.opensearch.org/latest/observing-your-data/alerting/actions/)
- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
- [OpenSearch Alerting security](https://docs.opensearch.org/latest/observing-your-data/alerting/security/)
- [OpenSearch Notifications](https://docs.opensearch.org/latest/observing-your-data/notifications/)
- [OpenSearch 3.8 Alerting `MustacheTemplateService` source](https://github.com/opensearch-project/alerting/blob/3.8/alerting/src/main/kotlin/org/opensearch/alerting/util/MustacheTemplateService.kt)
- [OpenSearch 3.8 release notes](https://github.com/opensearch-project/opensearch-build/blob/main/release-notes/opensearch-release-notes-3.8.0.md)

## Issues Found
No technical issues found.

## Review Notes
The OpenSearch 3.8 renderer behavior is version-specific and was checked against the Alerting 3.8 branch source: enabling `plugins.alerting.multi_tenancy_enabled` selects direct upstream Mustache rendering, while the disabled path delegates to OpenSearch `ScriptService`. The post correctly recommends iterating `ctx.results`, source-filtering a bounded number of hits, testing webhook serialization with representative content, and using a reviewed saved-dashboard URL. Deployments on a different OpenSearch version should recheck the renderer behavior and monitor-editor-generated query variables for that version.
