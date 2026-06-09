# Validation Summary: How to Use Grafana Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (10.3.1) — plugins, plugin types, provisioning
- grafana-cli (plugins install / ls / remove / update / update-all / list-remote)
- Docker / Docker Compose — GF_INSTALL_PLUGINS environment variable, custom Dockerfile
- Kubernetes — Grafana Helm chart, init containers
- Data source plugins — InfluxDB (Flux), Elasticsearch, JSON API (marcusolsson-json-datasource)
- Panel plugins — Worldmap, Polystat, Pie Chart, Clock
- App plugins — Kubernetes app, OnCall, Synthetic Monitoring
- Provisioning files (datasources, dashboards, apps)
- Plugin signatures and `allow_loading_unsigned_plugins`
- Ansible (`ansible.builtin.command`, `ansible.builtin.systemd`)
- Terraform (grafana/grafana provider)
- PromQL

## Sources Consulted
- Grafana Docker installation docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana CLI reference: https://grafana.com/docs/grafana/latest/cli/
- Grafana Docker `run.sh` (v10.3.1): https://raw.githubusercontent.com/grafana/grafana/v10.3.1/packaging/docker/run.sh
- Grafana configure-grafana reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana data source management / query caching docs: https://grafana.com/docs/grafana/latest/administration/data-source-management/

## Issues Found

1. **Custom API data source had a duplicate `jsonData` key** (in the `marcusolsson-json-datasource` example). YAML mappings must have unique keys; the second `jsonData:` block silently overwrites the first, so `queryParams` would have been dropped. Merged `httpHeaderName1` into the single `jsonData` block and left `httpHeaderValue1` in `secureJsonData` where it belongs.

2. **Incorrect `GF_INSTALL_PLUGINS` version-pinning syntax.** The post claimed `GF_INSTALL_PLUGINS=grafana-clock-panel;2.1.3,...` pins versions. Per the Grafana Docker image `run.sh` (verified against the v10.3.1 source), the semicolon splits the entry into `URL;install-folder`, not `plugin-id;version`. With the original example, the script would try to install from URL `grafana-clock-panel` into folder `2.1.3`, which would fail. Replaced the example with the documented URL-based pinning (`https://grafana.com/api/plugins/<id>/versions/<version>/download;<plugin-id>`) and added a pointer to the custom-Dockerfile approach for more readable version pinning.

## Review Notes
- The `grafana-piechart-panel` (used as the running example throughout) was promoted to a core panel in Grafana 8.0; the standalone plugin still installs and works, but new dashboards should prefer the built-in Pie chart panel.
- `grafana-worldmap-panel` is deprecated in favor of the built-in Geomap panel (deprecated since Grafana 8.1). The example is still valid for users on older dashboards, but Geomap is the recommended path forward.
- The Helm `values.yaml` snippet nests config under a top-level `grafana:` key. That shape matches `kube-prometheus-stack` (where Grafana is a subchart). For the standalone `grafana/grafana` Helm chart, the `plugins`, `grafana.ini`, and `persistence` keys live at the top level. Both are common — left as-is, but worth noting.
- The `[caching]` / `[caching.encryption]` `grafana.ini` snippet is a Grafana Enterprise / Cloud feature. OSS users will not get query result caching from it. Not changed because the snippet is otherwise valid for Enterprise users; readers on OSS should know it is a no-op.
- The Terraform provider example pins to `~> 2.0`. The current `grafana/grafana` Terraform provider is on the 3.x line. The example still works under 2.x but is one major version behind.
- `grafana-kubernetes-app` is shown in the app provisioning example; Grafana Cloud's current Kubernetes Monitoring app uses the `grafana-k8s-app` ID. The older `grafana-kubernetes-app` still exists, so the example is not strictly wrong, just dated.
- The PromQL "inefficient vs better" framing is a useful teaching point, though in practice both queries hit the TSDB index similarly — the bigger win is reducing the result set returned to the panel, which the rewritten query does.
