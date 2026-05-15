# Validation Summary: How to Set Up Filebeat for Shipping Logs to Elasticsearch on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Filebeat
- Elasticsearch
- Elastic YUM repositories
- systemd
- firewalld

## Sources Consulted
- Elastic Filebeat quick start: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Elastic Filebeat repositories for APT and YUM: https://www.elastic.co/docs/reference/beats/filebeat/setup-repositories
- Elastic Filebeat directory layout: https://www.elastic.co/docs/reference/beats/filebeat/directory-layout
- Elastic Filebeat input configuration: https://www.elastic.co/docs/reference/beats/filebeat/configuration-filebeat-options
- Elastic Filebeat Elasticsearch output configuration: https://www.elastic.co/docs/reference/beats/filebeat/elasticsearch-output
- Elastic Filebeat command reference: https://www.elastic.co/docs/reference/beats/filebeat/command-line-options
- Elastic Filebeat and systemd: https://www.elastic.co/docs/reference/beats/filebeat/running-with-systemd

## Issues Found
- The original post used generic placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which would not install or configure Filebeat. Replaced them with Filebeat-specific package, service, and configuration paths.
- The system preparation step installed `epel-release` and "Development Tools", which are not required for installing Filebeat from Elastic's RPM/YUM repository. Replaced this with Elastic's package signing key import and YUM repository definition.
- The configuration step did not show valid Filebeat YAML. Added a minimal `filestream` input and `output.elasticsearch` example aligned with current Filebeat documentation.
- The verification command `sudo <service> --test` was not valid for Filebeat. Replaced it with `filebeat test config -e` and `filebeat test output -e`.
- The firewall step suggested adding a service to firewalld, but Filebeat normally makes outbound connections and does not expose an inbound service. Updated the section to state that inbound firewall rules are usually unnecessary and to check firewall configuration when egress is restricted.
- Troubleshooting referenced port conflicts as a common Filebeat issue. Replaced this with output connectivity testing, which is more relevant for Filebeat shipping logs to Elasticsearch.

## Review Notes
The corrected post targets Elastic's current 9.x package repository. Environments standardized on Elastic 8.x should use the matching 8.x repository URL instead.
