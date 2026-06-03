# Validation Summary: Using TimescaleDB Continuous Aggregates for Real-Time Analytics on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TimescaleDB
- TimescaleDB continuous aggregates
- PostgreSQL SQL
- TimescaleDB Helm chart
- Kubernetes
- Kubernetes StorageClass
- AWS EBS CSI StorageClass parameters

## Sources Consulted
- Tiger Data/TimescaleDB continuous aggregates overview: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/about-continuous-aggregates/
- Tiger Data/TimescaleDB CREATE MATERIALIZED VIEW for continuous aggregates: https://www.tigerdata.com/docs/api/latest/continuous-aggregates/create_materialized_view
- Tiger Data/TimescaleDB add_continuous_aggregate_policy(): https://www.tigerdata.com/docs/api/latest/continuous-aggregates/add_continuous_aggregate_policy
- Tiger Data/TimescaleDB refresh_continuous_aggregate(): https://www.tigerdata.com/docs/api/latest/continuous-aggregates/refresh_continuous_aggregate
- Tiger Data/TimescaleDB hierarchical continuous aggregates: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/hierarchical-continuous-aggregates/
- Tiger Data/TimescaleDB real-time aggregates: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/real-time-aggregates/
- Tiger Data/TimescaleDB data retention policy API: https://www.tigerdata.com/docs/api/latest/data-retention/add_retention_policy
- Tiger Data/TimescaleDB informational view for continuous aggregates: https://www.tigerdata.com/docs/api/latest/informational-views/continuous_aggregates
- Tiger Data/TimescaleDB informational view for jobs: https://www.tigerdata.com/docs/api/latest/informational-views/jobs
- Tiger Data/TimescaleDB informational view for job_stats: https://www.tigerdata.com/docs/api/latest/informational-views/job_stats
- Tiger Data/TimescaleDB continuous aggregate troubleshooting and watermark checks: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/troubleshooting
- Timescale Helm charts repository: https://github.com/timescale/helm-charts
- TimescaleDB HA Docker image tags: https://hub.docker.com/r/timescale/timescaledb-ha/tags
- Tiger Data/TimescaleDB configuration guidance: https://docs.timescale.com/self-hosted/latest/configuration/about-configuration/
- PostgreSQL resource configuration documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The deployment section called the Timescale Helm chart "official" without noting that the repository is no longer actively maintained. Updated the wording to identify it as the Timescale Helm chart and to advise checking chart and image versions before production use.
- The Helm install command did not pin a TimescaleDB image version, while the chart default is old. Added `--set image.tag=pg17.10-ts2.27.1` to use a current TimescaleDB HA image tag.
- The hierarchical aggregate examples used `AVG(avg_cpu)` and `AVG(avg_memory)`, which can produce incorrect results when lower-level buckets have different sample counts. Replaced these with weighted averages using `sample_count`.
- The real-time aggregation section said continuous aggregates include real-time data by default. Current TimescaleDB behavior changed in v2.13: real-time aggregates are disabled by default. Updated the explanation and added an explicit `timescaledb.materialized_only = false` example.
- The refresh job monitoring query selected run-stat columns from `timescaledb_information.jobs`, but those columns live in `timescaledb_information.job_stats`. Updated the query to join `jobs` and `job_stats`.
- The materialization lag query referenced `timescaledb_information.continuous_aggregate_stats` and `completed_threshold`, which are not available in the current official informational views. Replaced it with the documented continuous aggregate watermark query using the materialization hypertable and `_timescaledb_functions.cagg_watermark`.

## Review Notes
The continuous aggregate syntax, refresh policy parameters, manual refresh call, retention policy examples, materialized-only setting, PostgreSQL/TimescaleDB configuration parameters, and Kubernetes StorageClass structure are valid against current documentation. The percentile example depends on TimescaleDB 2.7 or later, where ordered-set and non-parallelizable PostgreSQL aggregate functions are supported in continuous aggregates.
