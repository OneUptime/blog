# Validation Summary: How to Set Up cAdvisor for Container Metrics with Portainer - Container Metrics

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- cAdvisor
- Docker Compose
- Docker networking
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add?fallback=true
- cAdvisor GitHub README / quick start: https://github.com/google/cadvisor
- cAdvisor runtime options: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus guide, "Monitoring Docker container metrics using cAdvisor": https://prometheus.io/docs/guides/cadvisor/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana docs, "Import dashboards": https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana dashboard library, "cAdvisor exporter - Docker containers Overview": https://grafana.com/grafana/dashboards/21743-cadvisor-exporter-docker-containers-overview/

## Issues Found
- The post used `gcr.io/cadvisor/cadvisor:latest`. I updated this to `ghcr.io/google/cadvisor:v0.56.2` to match current upstream cAdvisor image guidance for modern releases.
- The cAdvisor flag `--disable_metrics=percpu,sched,tcp,udp,disk,diskIO,accelerator` included `accelerator`, which is not a valid documented metric option, and also disabled `disk`/`diskIO` while later sections relied on filesystem and disk I/O metrics. I changed the example to `--disable_metrics=percpu,sched,tcp,udp`.
- The Prometheus scrape config used `metric_relabeling`, which is not a valid Prometheus field. I corrected it to `metric_relabel_configs`.
- The comment on the relabel rule said it kept "containers with a name", but the actual rule filters on `container_label_com_docker_compose_service`. I corrected the explanation to reflect that it keeps Docker Compose-managed containers.
- The post referenced `container_memory_limit_bytes`, which is not the documented cAdvisor metric name. I corrected it to `container_spec_memory_limit_bytes` in the metric list, PromQL queries, and alert rule.
- The description of `container_memory_working_set_bytes` overstated its meaning as unreclaimable or "real" memory. I revised the wording to the safer, documented "working set memory".
- The CPU query was labeled as a percentage even though `rate(container_cpu_usage_seconds_total[5m])` returns CPU-seconds per second, effectively CPU cores used unless divided by another limit or capacity metric. I corrected the description and removed the misleading `* 100`.
- The Grafana example used `POST /api/dashboards/import` with a Grafana.com dashboard ID, which is not the documented import flow shown in Grafana docs. I replaced it with the supported UI import workflow and a valid dashboard ID.
- The restart alert used `rate(container_start_time_seconds[1h]) > 3`. Because `container_start_time_seconds` is a gauge, using `rate()` is not appropriate. I corrected the expression to `changes(container_start_time_seconds{image!=""}[1h]) > 3`.
- The post implied the Compose stack was generally for Portainer, but the stack file uses Docker Standalone-style Compose features. I clarified the prerequisite so the deployment model matches the example.
- The Prometheus reload command omitted the requirement for `--web.enable-lifecycle`. I added that note.

## Review Notes
- The post is technically correct after the fixes above.
- The pinned cAdvisor image version should be refreshed periodically as newer releases are published.
- Memory-limit percentage queries and alerts are most meaningful when containers have explicit memory limits configured.
- The referenced Grafana dashboard is community-maintained, so its panels and revisions may change over time even though the import workflow is valid.
