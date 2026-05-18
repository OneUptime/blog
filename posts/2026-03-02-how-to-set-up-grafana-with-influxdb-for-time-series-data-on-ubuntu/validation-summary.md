# Validation Summary: How to Set Up Grafana with InfluxDB for Time-Series Data on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step setup guide

## Technologies Covered
- InfluxDB 2.x
- Grafana (10/11)
- Telegraf
- Flux query language
- Ubuntu 22.04 / 24.04
- systemd
- APT repository / GPG key management

## Sources Consulted
- InfluxDB v2 install docs: https://docs.influxdata.com/influxdb/v2/install/
- Grafana Debian/Ubuntu install docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana Data Source Management: https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Grafana Create Dashboard: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/
- Grafana Import Dashboards: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/
- `influx bucket list` CLI reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/bucket/list/
- Grafana dashboard 928: https://grafana.com/grafana/dashboards/928
- Telegraf CPU input plugin: https://github.com/influxdata/telegraf/blob/master/plugins/inputs/cpu/README.md

## Issues Found

1. **Outdated InfluxData GPG key filename and hash.** The post used `influxdata-archive_compat.key` with an old SHA256 (`393e8779...`). Current InfluxData docs use `influxdata-archive.key` with SHA256 `943666881a1b8d9b849b74caebf02d3465d6beb716510d86a39f6c8e8dac7515`. Updated the wget, sha256sum check, dearmor, and signed-by paths to use the current key file.

2. **Missing `/etc/apt/keyrings` directory creation in Grafana install.** On a fresh Ubuntu 22.04/24.04 machine the directory does not exist, so writing `grafana.gpg` into it would fail. Added `sudo mkdir -p /etc/apt/keyrings` and `gnupg` to the prerequisite install line per official Grafana docs.

3. **Outdated Grafana UI navigation for Data Sources.** The "Configuration (gear icon) > Data Sources" path was removed in Grafana 10+. Replaced with the current "Connections > Data sources" path.

4. **Outdated Grafana UI navigation for creating a dashboard/panel.** The top-bar "+" menu is gone. Replaced "Click + > New Dashboard > Add new panel" with "Dashboards > New > New dashboard, then click Add visualization".

5. **Outdated Grafana UI navigation for importing a dashboard.** Replaced "Go to + > Import" with "Dashboards > New > Import".

6. **Dashboard 928 title correction.** Official title is "Telegraf: system dashboard"; updated from "Telegraf system dashboard".

## Review Notes
- The Telegraf TOML config (including `core_tags = false` on `[[inputs.cpu]]`) is valid as of recent Telegraf versions.
- `influx bucket list --json` is a valid flag.
- All Flux queries (CPU, memory, diskio, net) use correct measurement and field names that Telegraf produces with the configured inputs.
- The SMTP block in `grafana.ini` uses correct key names and section.
- The `influx setup --retention 30d --force` command and `influx auth create --read-bucket` flags are correct.
- The post still uses `/etc/apt/trusted.gpg.d/` for the InfluxData key (rather than `/etc/apt/keyrings/`). Both paths work and the `/etc/apt/trusted.gpg.d/` directory exists by default on Ubuntu, so this was left as-is to minimize churn, even though current InfluxData docs prefer `/etc/apt/keyrings/`.
