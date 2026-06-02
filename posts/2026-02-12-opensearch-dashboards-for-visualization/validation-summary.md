# Validation Summary: How to Use OpenSearch Dashboards for Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Dashboards
- Dashboards Query Language (DQL)
- OpenSearch Dashboards saved objects API
- OpenSearch Vega visualizations
- OpenSearch Alerting plugin and API
- OpenSearch Anomaly Detection plugin and API
- AWS CLI
- SSH tunneling
- curl

## Sources Consulted
- Amazon OpenSearch Service Dashboards documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/dashboards.html
- Amazon OpenSearch Service VPC domain access documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
- AWS CLI `opensearch update-domain-config` reference: https://docs.aws.amazon.com/cli/latest/reference/opensearch/update-domain-config.html
- OpenSearch Dashboards documentation: https://docs.opensearch.org/latest/dashboards/
- OpenSearch Dashboards Query Language documentation: https://docs.opensearch.org/latest/dashboards/dql/
- OpenSearch Dashboards Vega documentation: https://docs.opensearch.org/latest/dashboards/visualize/vega/
- OpenSearch Dashboards saved objects API reference: https://opensearch-project.github.io/OpenSearch-Dashboards/docs/openapi/saved_objects/
- OpenSearch Alerting API documentation: https://docs.opensearch.org/latest/observing-your-data/alerting/api/
- OpenSearch Anomaly Detection API documentation: https://docs.opensearch.org/latest/observing-your-data/ad/api/

## Issues Found
- The Alerting API example used a `query_level_trigger` wrapper inside `triggers`. The documented query-level monitor schema uses direct trigger objects with `name`, `severity`, `condition`, and `actions`; only bucket-level and document-level monitor examples use wrapped trigger objects. Updated the JSON to match the official query-level monitor schema.
- The alerting description said the monitor fires when "error rate" exceeds a threshold, but the query and Painless condition count matching error documents. Updated the wording and message template to say "error count."
- The line chart and Vega instructions described an "error rate" while using a Count aggregation filtered to errors. Updated the wording to "error count" to match the actual visualization.
- The saved query examples used Lucene-style bracket ranges while the post otherwise presents default Dashboards Query Language examples. Updated the range examples to DQL inequality syntax.
- The Cognito access sentence said to configure it during domain setup, while the following command uses `update-domain-config`, which configures an existing domain. Updated the sentence to say it can be configured during or after domain setup.

## Review Notes
- The saved objects, Vega, DQL, SSH tunnel, Cognito options, anomaly detector, and import/export examples are structurally consistent with current official documentation.
- Some UI labels may vary slightly by OpenSearch Dashboards version and deployment mode, but the workflow remains technically valid.
