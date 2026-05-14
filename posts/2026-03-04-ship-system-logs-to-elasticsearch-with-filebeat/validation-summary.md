# Validation Summary: How to Ship System Logs to Elasticsearch with Filebeat on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Filebeat
- Elasticsearch
- Elastic Stack / ELK Stack
- systemd
- journald
- DNF/YUM RPM repositories

## Sources Consulted
- Elastic Filebeat quick start: installation and configuration: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Elastic Filebeat repositories for APT and YUM: https://www.elastic.co/docs/reference/beats/filebeat/setup-repositories
- Elastic Filebeat system module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-system
- Elastic Filebeat configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-howto-filebeat
- Elastic Filebeat reference configuration: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-reference-yml
- Elastic Filebeat and systemd documentation: https://www.elastic.co/docs/reference/beats/filebeat/running-with-systemd

## Issues Found
- The original installation commands used placeholders such as `<package-name>`, which would not install Filebeat. Replaced them with the official Elastic 9.x YUM repository setup and `dnf install -y filebeat`.
- The original dependency commands installed EPEL and Development Tools, neither of which is required for the documented Filebeat RPM installation. Replaced them with minimal useful dependencies.
- The original configuration path `/etc/<service>/config.conf` was incorrect. Replaced it with `/etc/filebeat/filebeat.yml`.
- The original service commands used `<service>` placeholders. Replaced them with the actual `filebeat` service and Filebeat CLI commands.
- The original verification command `sudo <service> --test` was invalid for Filebeat. Replaced it with `filebeat test config -e` and `filebeat test output -e`.
- The original firewall guidance used `firewall-cmd --add-service=<service>`, which is not appropriate for Filebeat because Filebeat sends data outbound and does not normally expose an inbound service. Replaced it with outbound connectivity guidance.
- The original troubleshooting section referenced placeholder service names and port conflicts. Updated it to use `filebeat.service` and Filebeat output testing.
- The original security guidance recommended a dedicated non-root user without noting that Filebeat commonly needs elevated permissions to read system logs. Updated it to emphasize root-owned configuration, TLS, and the Filebeat keystore.

## Review Notes
The revised guide uses Elastic 9.x documentation because the current official Filebeat documentation references the 9.x package repository. Environments pinned to Elastic 8.x should use the matching 8.x repository instead.
