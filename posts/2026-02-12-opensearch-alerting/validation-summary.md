# Validation Summary: How to Set Up OpenSearch Alerting

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Alerting plugin
- OpenSearch Notifications plugin
- Slack, webhook, and Amazon SNS notification channels
- Query-level, bucket-level, document-level, and composite monitors
- Painless trigger conditions
- curl REST API examples

## Sources Consulted
- OpenSearch Alerting API: https://docs.opensearch.org/latest/observing-your-data/alerting/api/
- OpenSearch Notifications API: https://docs.opensearch.org/latest/observing-your-data/notifications/api/
- OpenSearch Composite monitors: https://docs.opensearch.org/latest/observing-your-data/alerting/composite-monitors/
- OpenSearch Monitors overview: https://docs.opensearch.org/latest/observing-your-data/alerting/monitors/
- Amazon OpenSearch Service alerting documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/alerting.html

## Issues Found
- The notification examples omitted the top-level `name` field shown in the Notifications API create-channel request. Added `name` to each notification configuration body.
- The standalone email example used `email_group` as if it were an email notification channel. Replaced it with a webhook channel, which is supported by the OpenSearch Notifications API and Amazon OpenSearch Service alerting guidance.
- The query-level monitor used an unsupported `query_level_trigger` wrapper and counted errors with a `value_count` aggregation on `_id`. Removed the wrapper and used `ctx.results[0].hits.total.value`, matching the documented query-level trigger shape.
- The date range filters used monitor period variables without the documented `epoch_millis` format. Added `format: "epoch_millis"` to the range queries.
- The bucket-level monitor used a plain `terms` aggregation and a `params._value` trigger script instead of the documented `bucket_level_trigger.condition` fields. Updated it to use a composite aggregation, `parent_bucket_path`, `buckets_path`, and a Painless script that calculates error rate from bucket counts.
- The document-level monitor used a trigger condition of `true`, which did not tie the alert to the configured document-level queries. Changed it to reference the query IDs with `query[id=fatal-query] || query[id=oom-query]`.
- The composite monitor example used object-shaped `inputs`, omitted `workflow_type`, and placed `actions` inside `chained_alert_trigger`. Updated it to the documented workflow request shape with array `inputs`, `workflow_type: "composite"`, a trigger ID, and sibling `actions`.
- The active alerts example used `state=ACTIVE`; the documented filter parameter is `alertState`. Updated the URL to `?alertState=ACTIVE`.

## Review Notes
The examples assume the log indexes have fields such as `timestamp`, `level`, `service.keyword`, and `level.keyword`. Those field names and keyword subfields are mapping-dependent and may need adjustment in a real deployment.
