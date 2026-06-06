# Validation Summary: How to Recombine Partial CRI-O Container Log Lines in the Collector Pipeline

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza container, regex_parser, router, json_parser, move, remove, and recombine operators
- Kubernetes CRI container log format
- CRI-O / containerd-style partial log records
- kubectl

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Stanza recombine operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/recombine.md
- OpenTelemetry Stanza regex_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Stanza router operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md
- OpenTelemetry Stanza json_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes CRI API package documentation for LogStreamType and LogTag: https://pkg.go.dev/k8s.io/cri-api/pkg/apis/runtime/v1
- Kubernetes Container Runtime Interface documentation: https://kubernetes.io/docs/concepts/containers/cri/

## Issues Found
- The main filelog example used `/var/log/containers/*.log` with `add_metadata_from_filepath: true` but did not enable `include_file_path`. The container operator requires `log.file.path` for path metadata extraction, and the documented metadata path format is `/var/log/pods/*/*/*.log`. Updated the examples to use `include_file_path: true` and `/var/log/pods/*/*/*.log`.
- The comment for `add_metadata_from_filepath` said it adds the container ID. It actually extracts Kubernetes metadata such as namespace, pod name, pod UID, container name, and restart count. Updated the comment.
- The container parser comment described `max_log_size` as a timeout. In the official container operator, `max_log_size` is the maximum byte size of the recombined log. Updated the comment.
- The manual recombine example configured both `is_first_entry` and `is_last_entry`, but the recombine operator requires exactly one. Removed `is_first_entry` and kept `is_last_entry` for CRI `F` tags.
- The manual recombine and performance examples used `force_flush_timeout`, which is not the documented recombine field. Updated it to `force_flush_period`.
- The post treated `max_batch_size` as a byte-size limit. In the recombine operator, `max_batch_size` is an entry count, while `max_log_size` is the byte-size limit. Updated the examples to use `max_log_size`.
- The CRI timestamp parser used a millisecond-only strptime layout against nanosecond timestamps. Updated the manual and mixed-format snippets to use the documented `gotime` layout for RFC3339Nano-style CRI timestamps.
- The mixed-format router example routed Docker JSON logs to a move operator that expected `attributes.message`, but Docker JSON parsing produces fields such as `attributes.log`, `attributes.stream`, and `attributes.time`. Updated the routed Docker path to move `attributes.log` to `body` and preserve the stream under `attributes["log.iostream"]`.
- The router expression used `startsWith`, which was not shown in the official Stanza expression examples. Replaced it with a documented-style `matches` expression.
- The test command used the `alpine` image while invoking `python3`, which is not available in the base Alpine image. Updated it to `python:3.12-alpine` and used `python`.

## Review Notes
The OpenTelemetry container operator is the preferred simple configuration for mixed Docker, CRI-O, and containerd logs because it can auto-detect those formats and recombine CRI partial logs internally. The manual examples are now technically aligned, but users should still test them against the exact Collector Contrib version they deploy because filelog receiver and Stanza operator behavior can change across releases.
