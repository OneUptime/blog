# Validation Summary: How to Use Podman with Fluentd for Log Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Fluentd
- Fluentd `in_tail`, `record_transformer`, `out_file`, `forward`, `elasticsearch`, `s3`, and Prometheus plugins
- Elasticsearch
- Kibana
- Prometheus
- Compose-style container orchestration with `podman compose`

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `logs` reference: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `compose` reference: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman `build` reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Fluentd config file syntax: https://docs.fluentd.org/configuration/config-file
- Fluentd `in_tail` input plugin: https://docs.fluentd.org/input/tail
- Fluentd parse section: https://docs.fluentd.org/configuration/parse-section
- Fluentd JSON parser: https://docs.fluentd.org/parser/json
- Fluentd `record_transformer` filter: https://docs.fluentd.org/filter/record_transformer
- Fluentd file output plugin: https://docs.fluentd.org/output/file
- Fluentd buffer section: https://docs.fluentd.org/configuration/buffer-section
- Fluentd Elasticsearch output plugin: https://docs.fluentd.org/output/elasticsearch
- Fluentd S3 output plugin: https://docs.fluentd.org/output/s3
- Fluentd Prometheus monitoring guide: https://docs.fluentd.org/monitoring-fluentd/monitoring-prometheus
- Fluentd command-line tools (`fluent-cat`): https://docs.fluentd.org/deployment/command-line-option
- Fluentd Docker Compose deployment guide: https://docs.fluentd.org/container-deployment/docker-compose
- Fluentd Docker image repository: https://github.com/fluent/fluentd-docker-image
- Fluentd Elasticsearch plugin README: https://github.com/uken/fluent-plugin-elasticsearch

## Issues Found
- The introduction said logs disappear when a container stops. Podman retains logs for stopped containers; local logs are primarily lost when the container is removed. I corrected that wording.
- The post said `k8s-file` is Podman's default log driver. The official Podman reference documents `journald` as the default unless it is changed in configuration, so I corrected that statement.
- The `podman logs | fluent-cat` example piped raw text into `fluent-cat` with its default JSON input mode. I changed the command to use `fluent-cat --none --message-key log` so plain log lines are forwarded correctly.
- The first `in_tail` JSON parser used `time_format` without `time_type string`. Fluentd's JSON parser defaults `time_type` to `float`, so I added `time_type string`.
- The wildcard `in_tail` examples omitted `follow_inodes true`. Fluentd documents this as the correct setting when `path` contains `*` to avoid duplicate reads after rotation, so I added it to both wildcard tail inputs.
- The Elasticsearch buffer example used `queue_limit_length`, which Fluentd documents as a v0.12 compatibility parameter. I replaced it with `total_limit_size 2g`, which is the current v1-style limit setting for this buffer block.
- The custom image section and the compose section used inconsistent build filenames. I aligned them by naming the file `Containerfile.fluentd` and updating the `podman build` command to use `-f Containerfile.fluentd`.
- The Prometheus scrape target used `fluentd:24231` even though the example runs Fluentd with a host-published port and does not define a shared Prometheus container network. I changed the example target to `localhost:24231`.

## Review Notes
- `podman` is not installed in the review workspace, so the Podman commands were validated against official Podman and Fluentd documentation rather than executed locally.
- The compose example is valid for `podman compose`, but Podman documents that this command is a thin wrapper around an external compose provider such as `docker-compose` or `podman-compose`, so that provider still needs to be installed.
- The Elasticsearch and Kibana images are pinned to `8.12.0`. Those versions are older than the current Fluentd documentation examples, but the configuration pattern used in the post remains technically valid.
