# Validation Summary: How to Set Up RHEL for Remote Monitoring of Distributed IoT Networks

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Eclipse Mosquitto MQTT broker and clients
- Telegraf MQTT consumer input
- Telegraf Prometheus client output
- Prometheus
- Grafana
- firewalld
- systemd

## Sources Consulted
- Eclipse Mosquitto mosquitto.conf manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto mosquitto_pub manual: https://mosquitto.org/man/mosquitto_pub-1.html
- Telegraf MQTT consumer input documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Telegraf Prometheus client output documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/prometheus_client/
- Telegraf Prometheus output data format documentation: https://docs.influxdata.com/telegraf/v1/data_formats/output/prometheus/
- InfluxData Telegraf installation documentation and downloads page: https://docs.influxdata.com/telegraf/v1/install/ and https://www.influxdata.com/downloads/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus getting started and release pages: https://prometheus.io/docs/prometheus/latest/getting_started/ and https://github.com/prometheus/prometheus/releases
- Grafana RHEL/Fedora installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Fedora/EPEL package information for Mosquitto: https://packages.fedoraproject.org/pkgs/mosquitto/mosquitto/epel-9.html

## Issues Found
- The architecture diagram misspelled Telegraf as "Telegraph" and showed Alertmanager even though the tutorial does not install or configure Alertmanager. I corrected the spelling and removed the misleading Alertmanager node from the active architecture.
- The InfluxData repository snippet used an older RHEL-specific repository URL and compatibility signing key. I updated it to the current stable repository URL and current archive key shown by InfluxData.
- The Telegraf example did not map MQTT topic segments into metric names, but the post later queried `mqtt_consumer_temperature`. Telegraf's Prometheus output creates names from the measurement and field key, so the sample JSON would not produce that metric. I added `topic_parsing` and changed the query and high-temperature alert to use `temperature_value`.
- The Prometheus download example used `v2.50.0`, which is outdated relative to current Prometheus releases and predates security fixes in later versions. I updated the example to `v3.11.3`.
- The Prometheus `rule_files` entry used a relative path even though the systemd service does not set a matching working directory. I changed it to the absolute path of the alert rule file created by the tutorial.
- The offline alert claimed to detect a sensor outage but used `up{job="iot_telegraf"}`, which only checks whether Prometheus can scrape Telegraf. I renamed and reworded the alert to accurately describe collector scrape failure.
- The Grafana repository snippet was missing the SSL verification fields shown in Grafana's current RHEL/Fedora documentation. I updated the repository block accordingly.

## Review Notes
The post remains a basic stack setup. A future improvement would be to add Grafana data source provisioning and device-specific offline alerts based on known expected gateways or retained heartbeat metrics.
