# Validation Summary: How to Set Up Ceph Metrics in Icinga

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Icinga 2 (monitoring DSL, CheckCommand, Service templates, Notifications)
- Ceph (cluster health, OSD, disk usage monitoring)
- Rook (Kubernetes-based Ceph operator)
- Prometheus (metric querying via check_prometheus_metric plugin)
- Icinga Web 2 (visualization with PNP4Nagios/Graphite)
- Nagios plugin ecosystem (check_ceph_health, check_ceph_osd, check_ceph_df)

## Sources Consulted
- Icinga 2 Object Types documentation (https://icinga.com/docs/icinga-2/latest/doc/09-object-types/)
- Icinga 2 Monitoring Basics documentation (https://icinga.com/docs/icinga-2/latest/doc/03-monitoring-basics/)
- Icinga 2 Language Reference (https://icinga.com/docs/icinga-2/latest/doc/17-language-reference/)
- Icinga Web 2 Monitoring Module Configuration (https://icinga.com/docs/icinga-web/latest/doc/20-Advanced-Topics/)
- magenta-aps/check_prometheus_metric GitHub repository (https://github.com/magenta-aps/check_prometheus_metric)
- prometheus/nagios_plugins (archived) (https://github.com/prometheus/nagios_plugins)
- Prometheus blackbox_exporter documentation (https://github.com/prometheus/blackbox_exporter)

## Issues Found

### Issue 1: Wrong download URL for Prometheus check plugin (Step 4)
- **What was wrong:** The `wget` command downloaded the Prometheus blackbox_exporter (`blackbox_exporter-linux-amd64.tar.gz`), which is an active endpoint prober, NOT a Nagios/Icinga check plugin for querying Prometheus metrics.
- **What was changed:** Replaced with a `wget` that downloads `check_prometheus_metric.sh` from the magenta-aps/check_prometheus_metric GitHub repository and makes it executable.
- **Why:** The blackbox_exporter serves a completely different purpose. The correct tool for querying Prometheus from Icinga is `check_prometheus_metric.sh`.

### Issue 2: Non-existent pip package (Step 4)
- **What was wrong:** `pip install check-prometheus-metric` references a package that does not exist on PyPI. The `check_prometheus_metric` tool is a Bash shell script, not a Python package.
- **What was changed:** Removed the `pip install` line entirely. The correct installation via `wget` from GitHub is now the only method shown.
- **Why:** Running `pip install check-prometheus-metric` would fail with a "package not found" error.

### Issue 3: Wrong Prometheus endpoint in CheckCommand (Step 4)
- **What was wrong:** The `-H` argument was set to `rook-ceph-mgr.rook-ceph.svc.cluster.local`, which is the Ceph Manager service. The `check_prometheus_metric.sh` tool queries the Prometheus HTTP API (`/api/v1/query`), not a raw metrics endpoint.
- **What was changed:** Changed `-H` to `http://prometheus.monitoring.svc.cluster.local:9090` to point to a Prometheus server.
- **Why:** The plugin needs to query a Prometheus server, not the Ceph mgr metrics endpoint directly.

### Issue 4: Wrong Icinga Web 2 config file path and format (Step 5)
- **What was wrong:** The IDO database backend configuration was placed in `/etc/icingaweb2/modules/monitoring/config.ini` as a single block. In Icinga Web 2, `config.ini` is for general module settings, not backend/database configuration.
- **What was changed:** Split the configuration into two correct files: `/etc/icingaweb2/resources.ini` (database connection with `type = db`) and `/etc/icingaweb2/modules/monitoring/backends.ini` (monitoring backend referencing the resource by name with `type = ido`).
- **Why:** Icinga Web 2 separates resource definitions (database connections) from backend configuration. Using the wrong file path would result in the monitoring module not finding its IDO backend.

## Review Notes
- The Icinga 2 DSL syntax throughout the post (CheckCommand arguments, Service templates, apply rules, Notification objects) is correct and follows standard conventions.
- The `check_ceph_health`, `check_ceph_osd`, and `check_ceph_df` plugin names are standard community Nagios plugins for Ceph monitoring, typically available via the `nagios-plugins-contrib` package.
- The Ceph auth command for creating a read-only monitoring user (`client.icinga`) is correct.
- The Prometheus server URL used in the fix (`prometheus.monitoring.svc.cluster.local:9090`) is a common convention but will vary by cluster setup. Readers should adjust to match their environment.
- PNP4Nagios is considered legacy; Icinga Web 2 users may prefer Graphite or InfluxDB for performance data storage in newer deployments.
