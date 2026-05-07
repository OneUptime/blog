# Validation Summary: How to Monitor Podman Container Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman CLI and REST API
- Podman container events, stats, health checks, logging, and inspect output
- Prometheus scraping configuration and text exposition format
- Grafana
- cAdvisor
- Bash, jq, and Python exporter examples

## Sources Consulted
- Podman `stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `run` documentation for health checks and logging options: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `healthcheck run` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman `inspect` / container inspect documentation for `.State.OOMKilled`: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `ps` formatting documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- cAdvisor official repository and run instructions: https://github.com/google/cadvisor
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/

## Issues Found
- Podman does not document an `oom` event status, and the JSON event object exposes `.Name` rather than Docker-style `.Actor.Attributes.name`. Changed the example to watch `died` events and confirm OOM kills via `podman container inspect --format '{{.State.OOMKilled}}'`.
- The text said the Podman REST API can be scraped by Prometheus. Prometheus needs a metrics endpoint, while Podman's REST API is queried by tools or exporters. Updated the wording to avoid implying that Prometheus can directly scrape Podman's JSON API as metrics.
- The Python exporter's `parse_bytes()` checked `B` before `MB`, `GB`, and `TB`, so values like `3.092MB` would match `B` first and fail numeric conversion. Reordered units from longest suffix to shortest.
- The Python exporter emitted invalid numeric values when Podman returned `--` for CPU or PID stats, which is documented in `podman stats` examples. Added fallback conversion to `0`.
- The cAdvisor example used the older `gcr.io/cadvisor/cadvisor:latest` image path. Updated it to the current `ghcr.io/google/cadvisor:latest` registry path and added `/dev/kmsg`, matching current cAdvisor run guidance.
- The Podman logging example used `--log-opt max-file=3`, but current Podman documentation lists `path`, `max-size`, and `tag` as supported logging options. Removed the unsupported `max-file` option.
- The alerting script used `jq -r` to emit multi-line JSON objects, but `while read` then processed one line at a time. Changed it to `jq -c` and added handling for Podman's documented `--` stat values.

## Review Notes
The local environment does not have `podman` installed, so command validation was performed against official Podman, cAdvisor, and Prometheus documentation rather than live CLI execution. Rootless Podman stats may not report network usage in some configurations, and cAdvisor with rootless Podman can require additional socket and storage-path adjustments; those caveats could be expanded in a future revision.
