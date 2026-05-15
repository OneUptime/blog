# Validation Summary: How to Configure Filebeat Modules for Apache, Nginx, and System Logs on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Filebeat
- Elastic YUM/RPM packages
- Filebeat modules
- Apache HTTP Server logs
- Nginx logs
- Linux system logs
- Elasticsearch, Elastic Cloud, and Logstash outputs
- systemd

## Sources Consulted
- Elastic Filebeat quick start: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Elastic Filebeat APT/YUM repositories: https://www.elastic.co/docs/reference/beats/filebeat/setup-repositories
- Elastic Filebeat directory layout: https://www.elastic.co/docs/reference/beats/filebeat/directory-layout
- Elastic Filebeat modules overview: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-modules-overview
- Elastic Filebeat configure modules: https://www.elastic.co/docs/reference/beats/filebeat/configuration-filebeat-modules
- Elastic Filebeat command reference: https://www.elastic.co/docs/reference/beats/filebeat/command-line-options
- Elastic Filebeat load ingest pipelines: https://www.elastic.co/docs/reference/beats/filebeat/load-ingest-pipelines
- Elastic Apache module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-apache
- Elastic Nginx module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-nginx
- Elastic System module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-system

## Issues Found
- The original installation commands used `<package-name>` placeholders and unrelated dependencies such as EPEL and Development Tools. Replaced them with Elastic's RPM signing key, YUM repository, and `dnf install -y filebeat`.
- The original configuration path `/etc/<service>/config.conf` was not a Filebeat path. Replaced it with `/etc/filebeat/filebeat.yml` and the RPM module config directory `/etc/filebeat/modules.d/`.
- The original guide did not enable Filebeat modules or filesets. Added `filebeat modules enable apache nginx system` and YAML examples for Apache, Nginx, and system filesets.
- The original service commands used `<service>`. Replaced them with the real `filebeat` systemd unit.
- The original verification command `sudo <service> --test` was not valid for Filebeat. Replaced it with `filebeat test config` and `filebeat test output`.
- The original firewall instructions suggested adding a generic inbound service rule. Replaced this with guidance that Filebeat normally makes outbound connections and should be checked against the configured Elasticsearch, Elastic Cloud, or Logstash endpoint.
- The original troubleshooting and conclusion still used placeholders or incorrect wording. Updated them to reference Filebeat-specific diagnostics and module path checks.

## Review Notes
Filebeat modules remain supported, but Elastic currently recommends Elastic Agent integrations for many new deployments. The post is now technically accurate for a Filebeat modules workflow on RHEL, but future revisions could mention Elastic Agent as the preferred newer approach.
