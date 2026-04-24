# Validation Summary: How to Deploy Grafana via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose stack deployment
- Grafana
- Grafana provisioning
- Prometheus
- Loki
- InfluxDB
- Grafana Alerting

## Sources Consulted
- Grafana Docker configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana plugin installation docs: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana InfluxDB data source configuration docs: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Grafana contact points docs: https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/
- Grafana dashboard JSON model docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana dashboard import docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana plugin catalog page for deprecated Worldmap and Pie Chart plugins: https://grafana.com/orgs/grafana?pg=plugins&plcmt=pluginlist
- Grafana Geomap announcement and Worldmap migration context: https://grafana.com/blog/2021/08/18/whats-new-in-grafana-8.1-geomap-panel/
- Portainer relative path support docs: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer bind mount configuration docs: https://docs.portainer.io/user/docker/services/configure
- Grafana dashboard catalog entry checked for ID 1860: https://grafana.com/grafana/dashboards/1860
- Grafana dashboard catalog entry checked for ID 893: https://grafana.com/grafana/dashboards/893
- Grafana dashboard catalog entry checked for ID 3662: https://grafana.com/grafana/dashboards/3662
- Grafana dashboard catalog entry checked for ID 13659: https://grafana.com/grafana/dashboards/13659
- Grafana dashboard catalog entry checked for ID 10315: https://grafana.com/grafana/dashboards/10315

## Issues Found
- The post used `GF_INSTALL_PLUGINS` as a runtime environment variable and included deprecated `grafana-piechart-panel` and `grafana-worldmap-panel` plugins. I replaced this with the current runtime variable `GF_PLUGINS_PREINSTALL` and kept only `grafana-clock-panel`, which is still published.
- The stack used relative bind mounts such as `./provisioning/...`. Portainer documents relative path support as a Business Edition feature for Git-based deployments, so the original example was not generally valid for a normal Portainer stack deployment. I changed the mounts and corresponding file paths to explicit host paths under `/opt/grafana`.
- The dashboard provider had `allowUiUpdates: true`, which allows saving changes into Grafana's database without writing them back to the provisioning source. That conflicts with the post's configuration-as-code/version-controlled positioning. I changed it to `false`.
- The healthcheck depended on matching a response body string. I simplified it to an HTTP success check with `curl -fsS`, which is less brittle and matches the current official Grafana image capabilities.
- The dashboard JSON section presented an abbreviated snippet as a file to create. I clarified that the file should use Grafana's exported dashboard JSON and that the snippet is abbreviated.
- Several community dashboard rows had incorrect or mismatched IDs and names. I corrected the entries to match the current Grafana dashboard catalog.
- The alerting section used the older term "notification channel". Current Grafana alerting uses "contact points", so I updated that terminology.

## Review Notes
- The post still uses `grafana/grafana:latest`. This is valid, but pinning a specific Grafana version would make the deployment more repeatable over time.
