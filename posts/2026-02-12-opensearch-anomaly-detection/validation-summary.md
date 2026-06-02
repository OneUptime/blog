# Validation Summary: How to Use OpenSearch Anomaly Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Anomaly Detection plugin
- OpenSearch Alerting plugin
- OpenSearch Query DSL and metric aggregations
- Random Cut Forest anomaly detection

## Sources Consulted
- OpenSearch Anomaly Detection API: https://docs.opensearch.org/latest/observing-your-data/ad/api/
- OpenSearch Anomaly Detection overview: https://docs.opensearch.org/latest/observing-your-data/ad/index/
- Amazon OpenSearch Service anomaly detection: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ad.html
- OpenSearch Alerting API: https://docs.opensearch.org/latest/observing-your-data/alerting/api/
- OpenSearch metric aggregations: https://docs.opensearch.org/docs/3.0/aggregations/metric/index/
- OpenSearch sum aggregation: https://docs.opensearch.org/latest/aggregations/metric/sum/
- OpenSearch percentile aggregation: https://docs.opensearch.org/docs/latest/aggregations/metric/percentile/

## Issues Found
- The post described anomaly grade as a threshold derived from an anomaly score. OpenSearch documentation describes Random Cut Forest as computing an anomaly grade and confidence score for each incoming data point. I changed the explanation to say a non-zero anomaly grade flags an anomalous point and higher grades indicate greater severity.
- The first detector example used a `term` query and `value_count` aggregation on `level`. For exact matching and aggregation in typical OpenSearch mappings, this should use the keyword subfield. I changed those references to `level.keyword`.
- The multi-feature detector used a nested `filter` bucket aggregation inside a feature. Detector features should resolve to usable metric values, and OpenSearch documentation emphasizes metric aggregations such as count, sum, average, min, and max for features. I changed the error feature to a single-value scripted `sum` that counts ERROR documents.
- The multi-feature detector used a `percentiles` aggregation for a p99 feature. Percentiles are multi-value metric aggregations, while anomaly detector features are intended to be single metric values. I changed the feature to `max_response_time` using a single-value `max` aggregation.
- The anomaly results query used `_plugins/_anomaly_detection/detectors/<detector-id>/results/_search`, but the documented search results API is `_plugins/_anomaly_detection/detectors/results/_search` with detector filtering in the query. I corrected the endpoint and added a `detector_id` filter.
- The alerting example queried the legacy `.opendistro-anomaly-results-*` index. Current OpenSearch documentation uses `.opensearch-anomaly-results*`. I updated the index pattern.
- The alerting example counted anomaly documents but labeled the count as a grade in the notification. I changed the aggregation and trigger to use `max_anomaly_grade`, then updated the message to report the maximum grade.

## Review Notes
The article remains version-neutral. The API paths and index names now match current OpenSearch documentation. Amazon OpenSearch Service domains may still require SigV4-signed requests or appropriate network access/IAM permissions, which the post does not cover.
