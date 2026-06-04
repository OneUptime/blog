# Validation Summary: How to Deploy NATS Surveyor for Real-Time NATS Cluster Monitoring

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- NATS Server
- NATS Surveyor
- JetStream
- Kubernetes StatefulSet, Deployment, Service, and ConfigMap resources
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Prometheus metrics and PromQL
- Grafana dashboards

## Sources Consulted
- NATS Surveyor official README and CLI flag documentation: https://github.com/nats-io/nats-surveyor
- NATS Surveyor source metric definitions: https://github.com/nats-io/nats-surveyor/blob/main/surveyor/collector_statz.go
- NATS Server monitoring endpoint documentation: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS Server system account documentation: https://docs.nats.io/running-a-nats-service/configuration/sys_accounts
- NATS Server configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus Operator ServiceMonitor design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Docker Official Image for NATS: https://hub.docker.com/_/nats

## Issues Found
- Surveyor architecture was described as polling NATS HTTP monitoring endpoints directly. Updated the explanation to reflect current Surveyor behavior: it connects to NATS with system account credentials and requests monitoring data through NATS system services.
- The NATS example enabled `http_port` but did not configure the required system account access for Surveyor. Added a minimal `SYS` account and `system_account` configuration.
- The NATS image was pinned to an older `nats:2.10-alpine` tag. Updated it to the current `nats:2.14-alpine` line.
- The Surveyor image was pinned to `natsio/nats-surveyor:0.5.0`, which predates current JSZ metric support. Updated it to `natsio/nats-surveyor:0.9.10`.
- The Surveyor deployment used invalid or obsolete flags such as `-varz`, `-connz`, `-routez`, `-subz`, `-healthz`, and positional HTTP monitoring URLs. Replaced them with current flags: `--servers`, `--count`, `--gatewayz`, `--jsz=all`, `--jsz-leaders-only`, `--user`, and `--password`.
- Several environment variables did not match Surveyor's documented flag-to-env mapping. Replaced `NATS_SURVEYOR_JETSTREAM`, `NATS_SURVEYOR_OBSERVE_ONLY`, `NATS_SURVEYOR_COUNT_CONNECTIONS`, `NATS_SURVEYOR_POLL_TIMEOUT`, and `NATS_SURVEYOR_EXPECTED_SERVERS` with valid Surveyor variables.
- Dashboard, alert, PromQL, and troubleshooting examples used non-existent metric names such as `nats_core_server_info`, `nats_core_in_msgs`, `nats_core_total_connections`, `nats_jetstream_store_bytes`, and `nats_jetstream_consumer_num_pending`. Replaced them with current Surveyor metric names such as `nats_core_info`, `nats_core_recv_msgs_count`, `nats_core_connection_count`, `nats_stream_total_bytes`, and `nats_consumer_num_pending`.
- The JetStream storage alert divided stream-level bytes by a non-existent max-storage metric. Replaced it with a label-compatible expression using `nats_stream_total_bytes` and `nats_jetstream_server_max_storage`.
- The memory alert used a non-existent `nats_core_mem_max` metric. Replaced it with `nats_core_go_memlimit_bytes` and added a guard to avoid alerting when no Go memory limit is set.
- The consumer alert annotation referenced a non-existent `consumer` label. Updated it to `consumer_name`.
- The Grafana ConfigMap used an API-style `dashboard` wrapper and deprecated `graph` panels. Updated it to a dashboard model JSON with `timeseries` panels.
- The best-practices section recommended multiple Surveyor replicas without noting double-counting risk. Adjusted the guidance to avoid duplicate metric aggregation when scraping multiple replicas.

## Review Notes
The Kubernetes resource shapes are broadly valid, but the example still uses inline demonstration credentials. A production version should place NATS users/passwords or credentials files in Kubernetes Secrets and avoid passing sensitive values as command-line arguments.
