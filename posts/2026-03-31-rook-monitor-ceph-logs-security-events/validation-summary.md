# Validation Summary: How to Monitor Ceph Logs for Security Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (monitors, OSDs, RGW)
- Kubernetes (kubectl log access)
- CephX authentication
- Grafana Loki (LogQL queries)
- Grafana Alerting (provisioned alert rules)
- Elasticsearch Watcher (SIEM integration)
- Ceph RGW S3 Bucket Logging
- AWS CLI (S3 API)

## Sources Consulted
- Grafana Loki documentation — labels and LogQL syntax: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Elasticsearch 7.x breaking changes — `hits.total` object format: https://www.elastic.co/guide/en/elasticsearch/reference/current/breaking-changes-7.0.html
- Elasticsearch Watcher API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/watcher-api.html
- Elasticsearch match_phrase query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
- Ceph RGW Bucket Logging documentation: https://docs.ceph.com/en/latest/radosgw/bucket_logging/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

1. **LogQL label `ceph_component` is non-standard** — Changed `ceph_component="rook-ceph-mon"` to `app="rook-ceph-mon"` in the Loki query. In standard Kubernetes + Loki (Promtail/Grafana Agent) setups, the Kubernetes pod label `app` is the standard label for filtering by application, not `ceph_component` which does not exist by default.

2. **Grafana alert rule `condition: C` references non-existent refId** — Changed `condition: C` to `condition: A`. The `condition` field must reference an existing `refId` in the `data` array. Only `refId: A` was defined, so referencing `C` would cause the alert rule to fail evaluation.

3. **Elasticsearch `match` query should be `match_phrase`** — Changed `{"match": {"log": "could not find secret"}}` to `{"match_phrase": {"log": "could not find secret"}}`. The `match` query tokenizes the input and matches documents containing any individual term (OR by default), producing many false positives. `match_phrase` requires all terms to appear consecutively in the correct order.

4. **Elasticsearch Watcher condition uses ES 6.x `hits.total` format** — Changed `ctx.payload.hits.total` to `ctx.payload.hits.total.value`. In Elasticsearch 7+, `hits.total` is an object `{"value": N, "relation": "eq"}`, not a plain integer. The numeric comparison would fail against the object.

5. **`radosgw-admin bucket logging enable` is not a valid subcommand** — Replaced the entire command with the correct S3 API approach using `aws s3api put-bucket-logging`. The `radosgw-admin bucket logging` subcommands are limited to `flush`, `info`, and `list` for operational tasks. Enabling bucket logging is done through the S3 PutBucketLogging API, not via radosgw-admin.

## Review Notes
- The Grafana alert rule YAML is simplified/partial — it only includes the data source query (refId A) without the typical Reduce (refId B) and Threshold (refId C) expressions. This is acceptable for a blog post showing the key concept, but readers may need to add expression queries for a complete production alert rule.
- The Loki label `app` requires that Promtail or Grafana Agent is configured with a relabel rule to promote the Kubernetes pod label `app` to a Loki stream label. This is a common configuration but not automatic. Readers without this relabeling could alternatively use `{namespace="rook-ceph", pod=~"rook-ceph-mon.*"}`.
- The kubectl log grep commands are correct but will only show recent logs. For production use, centralized logging (as shown in the Loki and Elasticsearch sections) is the proper approach, which the post correctly recommends.
