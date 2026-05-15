# Validation Summary: How to Monitor RHEL System Metrics with Metricbeat and Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF/YUM package management
- Metricbeat
- Elasticsearch
- systemd
- firewalld

## Sources Consulted
- Elastic Metricbeat quick start: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-installation-configuration
- Elastic Metricbeat repositories for APT and YUM: https://www.elastic.co/guide/en/beats/metricbeat/current/setup-repositories.html
- Elastic Metricbeat command reference: https://www.elastic.co/docs/reference/beats/metricbeat/command-line-options
- Elastic Metricbeat module configuration: https://www.elastic.co/docs/reference/beats/metricbeat/configuration-metricbeat
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool

## Issues Found
- The dependency installation used `epel-release` and `"Development Tools"`, which are not required to install Metricbeat from Elastic's RPM repository. Replaced them with `curl`.
- The package installation used `<package-name>` placeholders. Replaced them with the Elastic GPG key import, Elastic 9.x YUM repository definition, and `dnf install -y metricbeat`.
- The configuration path used `/etc/<service>/config.conf`, which is not the Metricbeat configuration path. Replaced it with `/etc/metricbeat/metricbeat.yml`.
- The post did not show a valid Elasticsearch output configuration. Added a minimal `output.elasticsearch` example using an HTTPS endpoint and API key.
- The service commands used `<service>` placeholders. Replaced them with `metricbeat`, and added `metricbeat setup -e` before starting the service.
- The verification command used `--test`, which is not the Metricbeat syntax. Replaced it with `metricbeat test config -e` and `metricbeat test output -e`.
- The firewall example used `--add-service=<service>`, but firewalld does not provide a standard `metricbeat` service and Metricbeat normally sends outbound traffic. Replaced it with an Elasticsearch port example for local firewall scenarios.
- The performance tuning command used `top -p $(pidof <service>)`, which was generic and can break with multiple PIDs. Replaced it with `top -p $(pgrep -d, metricbeat)`.
- Troubleshooting commands used `<service>` placeholders. Replaced them with `metricbeat`.
- Security guidance suggested a dedicated non-root service user. Metricbeat packages commonly run with the service permissions needed to read host metrics, so this was replaced with least-privilege Elasticsearch credentials and keystore guidance.

## Review Notes
The corrected article assumes Elastic Stack 9.x because the current Elastic documentation uses the 9.x package repository. For Elastic Stack 8.x deployments, the repository base URL and package version should match 8.x instead.
