# Validation Summary: How to Install Filebeat for Log Shipping on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation, configuration, and operations reference for Filebeat on Ubuntu)

## Technologies Covered
- Filebeat 8.x (Elastic Beats)
- Elasticsearch
- Logstash
- Kafka
- Elastic Stack modules (system, nginx, mysql)
- Kubernetes (DaemonSet deployment)
- TLS/SSL (elasticsearch-certutil, OpenSSL)
- systemd / Ubuntu APT packaging

## Sources Consulted
- Filebeat filestream input reference — https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-filestream.html
- Introducing Filestream fingerprint mode (Elastic blog) and related beats issues (#40197, #45621) on file_identity vs scanner fingerprinting
- add_docker_metadata processor reference — https://www.elastic.co/guide/en/beats/filebeat/current/add-docker-metadata.html
- HTTP endpoint reference — https://www.elastic.co/guide/en/beats/filebeat/current/http-endpoint.html
- Settings for internal collection (monitoring) — https://www.elastic.co/guide/en/beats/filebeat/current/configuration-monitor.html
- Elasticsearch output reference — https://www.elastic.co/guide/en/beats/filebeat/current/elasticsearch-output.html

## Issues Found
1. **filestream `file_identity.native` conflicting with scanner fingerprint** (Filestream Input section). The example enabled `prospector.scanner.fingerprint.enabled: true` while setting `file_identity.native: ~`. These conflict — a non-fingerprint `file_identity` causes Filebeat to silently disable scanner fingerprinting, contradicting the stated intent. Changed to `file_identity.fingerprint: ~` to match the fingerprint scanner setting.

2. **Wrong filestream buffer option name** (Performance Tuning → High-Throughput). The post used `harvester_buffer_size`, which is a `log` input option. The filestream input uses `buffer_size` (default 16384). Renamed the key; the value and default note were already correct.

3. **Incorrect `bulk_max_size` default** (Performance Tuning → High-Throughput). The comment claimed "Default is 2048". The actual Elasticsearch output default is 1600. Corrected the comment.

4. **Invalid monitoring config keys** (Monitoring → Internal Metrics to Elasticsearch). `metrics.index`, `state.index`, and a top-level `period:` are not valid settings. The valid keys are `metrics.period` and `state.period` under `monitoring.elasticsearch` (monitoring indices like `.monitoring-beats-*` are managed automatically). Replaced the invalid keys accordingly.

5. **Non-existent Prometheus `/metrics` endpoint** (Monitoring → HTTP Metrics Endpoint). Filebeat's HTTP endpoint serves JSON (paths `/`, `/stats`, `/inputs/`), not the Prometheus exposition format, and there is no native `/metrics` path. Reworded the intro to clarify the JSON output (and that an exporter is needed for Prometheus), corrected the documented paths, and replaced the `curl .../metrics` example with `curl .../inputs/`.

## Review Notes
- Verified as correct (no change needed): Elastic 8.x APT repo + GPG keyring install steps; `add_docker_metadata` `match_source_index: 4` (correct default); container/syslog/log input options; Kafka output (`partition.round_robin`, `required_acks`, `sasl.mechanism`, `max_message_bytes`); Logstash output (`loadbalance`, `compression_level`, `pipelining`); module file formats; processors; multiline parser config; `queue.mem` default of 3200; `worker` default of 1; SSL settings under the `ssl` key; the Kubernetes DaemonSet manifest.
- Minor caveat (left as-is): for the Elasticsearch output, Filebeat effectively retries indefinitely and largely ignores `max_retries`; the inline comment "Retries before dropping events" is a slight oversimplification but not a config error.
- Version note: the post targets Filebeat 8.x (image pinned to `8.12.0`). On Filebeat/Beats 9.x the filestream default file identity is already `fingerprint`, so the fingerprint example aligns with newer defaults as well. The `log` input shown is deprecated in favor of `filestream`, which the post already recommends.
