# Validation Summary: How to Set Up cAdvisor for Container Metrics with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- cAdvisor
- Docker Compose / Compose Specification
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- cAdvisor README: https://github.com/google/cadvisor/blob/master/README.md
- cAdvisor runtime options: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor API docs: https://github.com/google/cadvisor/blob/master/docs/api.md
- cAdvisor releases: https://github.com/google/cadvisor/releases
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks docs: https://docs.docker.com/reference/compose-file/networks/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Grafana dashboard 14282: https://grafana.com/grafana/dashboards/14282-cadvisor-exporter/

## Issues Found
- The stack used the old `gcr.io/cadvisor/cadvisor:latest` image reference. I changed it to `ghcr.io/google/cadvisor:v0.56.2`, which matches current upstream registry guidance and a released version.
- The Compose snippet included the obsolete top-level `version: "3.8"` field. I removed it because current Compose treats the `version` field as obsolete.
- The initial `--disable_metrics` example disabled `disk` and `diskIO`, which contradicted the post's claim that it would collect disk/filesystem metrics and broke the later `container_fs_reads_bytes_total` example. I removed those disabled collectors.
- The metrics list said cAdvisor collects container start/stop events. Upstream Prometheus metrics expose `container_start_time_seconds` and `container_oom_events_total`; I corrected the wording to "start time and OOM events."
- The Prometheus `metric_relabel_configs` example filtered on the `container` label. Upstream cAdvisor standalone Prometheus metrics use labels such as `id`, `image`, and `name`, so that example could drop the whole scrape. I changed it to filter on `id` instead, dropping both the root cgroup (`/`) and id-less non-container series with `id: '^/?$'`.
- The sample CPU query was labeled as a percentage even though `rate(container_cpu_usage_seconds_total[5m])` is CPU-seconds per second, not a normalized percent, and cAdvisor can emit multiple CPU/interface series per container. I changed the CPU query to sum by `name` and label it as CPU cores, and I aggregated the network receive query by `name` as well.
- The performance-tuning section said "Lower housekeeping interval" while setting `30s`, which actually increases the interval relative to the documented default `1s`. I corrected the wording and changed `--storage_duration` from `2m` to `1m` because `2m` matches the documented default and did not reduce retention.
- The networking prerequisites were implicit. I clarified that the external `monitoring` network must already exist and that Prometheus must be attached to it for `cadvisor:8080` to resolve.

## Review Notes
- cAdvisor's upstream README and detailed running docs are not perfectly synchronized on every example, so I prioritized the current README quick-start, runtime options, Prometheus metrics reference, and release page together.
- The image is pinned to `v0.56.2`, which was the latest cAdvisor release visible on the upstream releases page on 2026-05-06.
