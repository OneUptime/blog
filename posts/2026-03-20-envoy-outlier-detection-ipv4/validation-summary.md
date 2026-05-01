# Validation Summary: How to Configure Envoy Outlier Detection for IPv4 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy outlier detection
- YAML configuration
- Envoy admin interface

## Sources Consulted
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy `config.cluster.v3.OutlierDetection` API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster manager bootstrap API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy admin cluster status proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto.html

## Issues Found
- The post said `base_ejection_time` doubles with each ejection and described `max_ejection_time` as capping exponential backoff. Envoy documents this as a multiplier based on the number of consecutive ejections, capped by `max_ejection_time`, so those comments were corrected.
- The basic example configured `success_rate_minimum_hosts: 5` while only defining 3 endpoints. Envoy does not perform success-rate outlier detection unless at least that many hosts have sufficient volume, so the example was corrected to `3`.
- The detection-types table described local-origin failures too narrowly and omitted the requirement for `split_external_local_origin_errors: true`. The table wording was corrected to match the Envoy outlier-detection documentation.
- The table described success-rate detection as an anomaly in error rate. Envoy evaluates success-rate statistics, so that wording was corrected.
- The database example included `consecutive_local_origin_failure` without enabling `split_external_local_origin_errors`. Envoy only applies that field when error splitting is enabled, so the ineffective setting was removed.
- The monitoring section referenced deprecated stats `ejections_total` and `ejections_consecutive_5xx`. These were replaced with the current enforced-ejection counters from the official stats reference.
- The event logging example placed `event_log_path` under the per-cluster `outlier_detection` block. Envoy configures outlier event logging under bootstrap `cluster_manager.outlier_detection`, so that location was corrected.
- The database example used `max_ejection_percent: 33` with 3 hosts and commented that it would allow ejecting one-third of the cluster. The example was adjusted to `34` with a precise comment so one host can be ejected in a 3-host cluster.

## Review Notes
- The examples use current Envoy v3 API field names and are technically valid after the corrections above.
- Success-rate detection still depends on enough request volume during each `interval`; on low-traffic clusters, consecutive-failure detection is often the mechanism that actually ejects hosts.
