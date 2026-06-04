# Validation Summary: How to Configure Elasticsearch Alerting with Watcher for Log-Based Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch
- Watcher
- Watcher REST APIs
- Watcher search inputs, compare and script conditions
- Watcher logging, email, and webhook actions
- Elasticsearch licensing and secure settings

## Sources Consulted
- Elastic Watcher getting started documentation: https://www.elastic.co/docs/explore-analyze/alerts-cases/watcher/watcher-getting-started
- Elastic Watcher API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/group/endpoint-watcher
- Elastic create or update watch API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-watcher-put-watch
- Elastic get Watcher statistics API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-watcher-stats
- Elastic Watcher internals and throttling documentation: https://www.elastic.co/docs/explore-analyze/alerting/watcher/how-watcher-works
- Elastic Watcher email action documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/actions-email.html
- Elastic Watcher webhook action documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/actions-webhook.html
- Elastic get license API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
- Elastic start trial API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/start-trial.html
- Elastic 8.0 migration notes for removed `_xpack` endpoint paths: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/migrating-8.0.html
- Elastic subscription feature matrix: https://www.elastic.co/subscriptions/

## Issues Found
- The post said development environments can use the Basic license with limited Watcher features. Watcher requires a trial or a paid subscription that includes Watcher, so the licensing paragraph was corrected.
- The post used `GET /_xpack?pretty` to verify X-Pack/Watcher availability. Top-level `_xpack` endpoint paths were removed in Elasticsearch 8, so that command was removed and the post now relies on `GET /_license` and `GET /_watcher/stats`.
- Watch creation examples were fenced as `json` even though they include Kibana Dev Tools Console request lines such as `PUT _watcher/watch/...`. The fences were changed to `console` so the examples are not presented as standalone JSON.
- The command for listing watches used `GET /_watcher/_query/watches`. The official Watcher API uses `POST /_watcher/_query/watches`, so the command was changed to `POST` with a `match_all` request body.

## Review Notes
The examples assume mappings where fields such as `source.ip` and `service.name` are aggregatable, which is true for common ECS-style mappings. In custom mappings, equivalent `.keyword` fields may be required for `terms` aggregations.
