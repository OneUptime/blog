# Validation Summary: How to Set Up Metricbeat for System Metrics on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Metricbeat 8.x
- Elasticsearch
- Kibana
- Logstash
- Ubuntu (20.04 / 22.04)
- Docker (module example)
- systemd

## Sources Consulted
- Elastic Metricbeat reference (https://www.elastic.co/guide/en/beats/metricbeat/current/index.html)
- Metricbeat APT repository install docs (https://www.elastic.co/guide/en/beats/metricbeat/current/setup-repositories.html)
- Metricbeat command reference, especially the global `-e` flag (https://www.elastic.co/guide/en/beats/metricbeat/current/command-line-options.html)
- System module reference and metricsets (https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-system.html)
- Docker module reference (https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-docker.html)
- Processors reference: `add_host_metadata`, `drop_event`, `rename` (https://www.elastic.co/guide/en/beats/metricbeat/current/defining-processors.html)
- Beats internal monitoring config (https://www.elastic.co/guide/en/beats/metricbeat/current/monitoring.html)
- systemd capabilities (CAP_SYS_PTRACE) — Linux capabilities(7)

## Issues Found
- **`-e` flag description**: The post claimed `metricbeat setup -e` "logs to stdout". The official Beats documentation states `-e` logs to **stderr** and disables syslog/file output. Updated the sentence to: "The `-e` flag logs to stderr and disables syslog/file output, which is useful for debugging setup issues."

## Review Notes
- The APT repository (`https://artifacts.elastic.co/packages/8.x/apt stable main`) and GPG key URL are correct for the 8.x channel.
- System module metricsets listed (`cpu`, `load`, `memory`, `network`, `process`, `process_summary`, `uptime`, `socket_summary`, `diskio`, `filesystem`, `fsstat`) are all valid for Metricbeat 8.x.
- `cpu.metrics` values (`percentages`, `normalized_percentages`) are valid; the third option (`ticks`) is omitted but that's a fine choice.
- `process.include_top_n`, `filesystem.ignore_types`, and the Docker metricsets are all real, current configuration keys.
- The `add_host_metadata` processor's `when.not.contains.tags: forwarded` condition uses valid dot-notation YAML.
- The `rename` processor `from`/`to` schema is correct.
- Note for readers: by default, Metricbeat installed via the DEB package runs as root, so the `usermod -aG docker metricbeat` step only applies if the service is reconfigured to run as a non-root `metricbeat` user. Not corrected since the advice is valid in that scenario and the post does not assert the user is created automatically.
- The recommendation at the end to consider Elastic Agent for new production deployments is accurate guidance from Elastic.
