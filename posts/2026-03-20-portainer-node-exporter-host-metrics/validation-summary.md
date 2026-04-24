# Validation Summary: How to Set Up Node Exporter for Host Metrics with Portainer - Host Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Prometheus Node Exporter
- Prometheus
- PromQL
- Grafana
- Docker Compose / Portainer stacks

## Sources Consulted
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus management API: https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer networks documentation: https://docs.portainer.io/user/docker/networks/add
- Grafana dashboard 1860 (Node Exporter Full): https://grafana.com/grafana/dashboards/1860-node-exporter-full/

## Issues Found
- The stack used `--collector.netclass.ignored-devices` while the post's goal was to exclude virtual interfaces from `node_network_*` traffic metrics. I changed this to `--collector.netdev.device-exclude`, which is the collector flag documented for net device statistics.
- The Prometheus scrape example used `job_name: "node-exporter"`, but the conclusion recommended Grafana dashboard ID 1860, which expects the default Prometheus job name `node`. I changed the scrape examples and verification command to use `job_name: "node"` so the dashboard guidance is consistent with the configuration shown.
- The relabeling comment said it was adding the instance label from the hostname, but the config actually set a constant friendly value via `replacement`. I corrected the comment to describe the behavior accurately.
- The Prometheus reload command omitted that `POST /-/reload` is disabled by default unless Prometheus is started with `--web.enable-lifecycle`, with `SIGHUP` as the documented alternative. I added that requirement to the command example.
- The CPU metric example used `mode="user|system|idle|iowait|irq|softirq"`, which is an exact-match label selector, not a regex matcher. I corrected it to `mode=~"user|system|idle|iowait|irq|softirq"`.
- The multi-host section implied remote scraping would work with the earlier localhost-only port binding. I added the missing caveat that port 9100 must be published on an address the Prometheus server can reach.
- The conclusion implied Grafana dashboard 1860 would work immediately as shown. I corrected this to note that it works best with the default `job_name: node` and that some panels also expect the optional `--collector.systemd` and `--collector.processes` collectors, as documented on the dashboard page.

## Review Notes
- The example network throughput queries use `device="eth0"`, which is environment-specific. Many modern Linux hosts use interface names such as `ens18`, `enp0s3`, or similar.
- The stack uses the `latest` image tag. It is valid, but pinning a specific Node Exporter version would make the tutorial more reproducible over time.
