# Validation Summary: How to Build Log Dashboards in Kibana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kibana
- Elasticsearch
- Kibana data views
- Kibana Lens, TSVB, aggregation-based visualizations, Vega, Maps, and Canvas
- Kibana alerting rules
- Kibana saved objects import/export APIs
- KQL and Lucene query syntax
- Kibana configuration

## Sources Consulted
- Elastic Kibana API documentation: Create a data view - https://www.elastic.co/docs/api/doc/kibana/operation/operation-createdataviewdefaultw
- Elastic Docs: Data views - https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views
- Elastic Docs: KQL - https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql
- Elastic Docs: Lens - https://www.elastic.co/docs/explore-analyze/visualize/lens
- Elastic Kibana API documentation: Create a rule - https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-alerting-rule-id
- Elastic Docs: Elasticsearch query rule type - https://www.elastic.co/docs/explore-analyze/alerting/alerts/rule-type-es-query
- Elastic Kibana API documentation: Export saved objects - https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-export
- Elastic Kibana API documentation: Import saved objects - https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-import
- Elastic Docs: Import and export dashboard APIs deprecation note - https://www.elastic.co/guide/en/kibana/8.19/dashboard-api.html
- Elastic Docs: Configure security in Kibana - https://www.elastic.co/docs/deploy-manage/security/using-kibana-with-security
- Elastic Docs: Kibana security settings - https://www.elastic.co/docs/reference/kibana/configuration-reference/security-settings
- Elastic Docs: Kibana reporting settings - https://www.elastic.co/docs/reference/kibana/configuration-reference/reporting-settings
- Elastic Docs: Kibana alerting and action settings - https://www.elastic.co/docs/reference/kibana/configuration-reference/alerting-settings

## Issues Found
- The `xpack.reporting.encryptionKey` and `xpack.security.encryptionKey` placeholder values were shorter than the documented minimum of 32 characters. Updated the placeholders to strings of at least 32 characters and clarified the comment.
- The alerting UI path was incomplete for current Kibana navigation. Updated it to `Stack Management > Alerts and insights > Rules`.
- The Elasticsearch query alert example used the outdated/incorrect rule type ID `xpack.elasticsearch.query`. Updated it to the current `.es-query` rule type ID.
- The Elasticsearch query alert example supplied `esQuery` as an object, but the current API expects the Elasticsearch Query DSL definition as a string for this rule type. Updated the example accordingly and added the required/current rule parameters.
- The alert action group used `threshold met`, which applies to index threshold examples rather than Elasticsearch query rules. Updated it to `query matched`.
- The dashboard export and import examples used deprecated `/api/kibana/dashboards/export` and `/api/kibana/dashboards/import` endpoints. Replaced them with the current saved objects export/import APIs.

## Review Notes
The post does not pin a Kibana version, so the review used current Elastic documentation as of 2026-06-21. Some UI labels can vary slightly by Kibana version and solution navigation, but the corrected API examples match current documented request shapes.
