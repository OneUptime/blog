# Validation Summary: How to Configure Filebeat for Log Collection on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- Filebeat
- Elasticsearch 8.x
- Logstash
- Kibana
- Filebeat modules
- Docker log collection
- Elastic Stack TLS and RBAC

## Sources Consulted
- Elastic Filebeat APT/YUM repository documentation: https://www.elastic.co/docs/reference/beats/filebeat/setup-repositories
- Elastic Filebeat input configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuration-filebeat-options
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat migration guide for deprecated log/container inputs: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat command reference: https://www.elastic.co/docs/reference/beats/filebeat/command-line-options
- Elastic Filebeat Elasticsearch output documentation: https://www.elastic.co/docs/reference/beats/filebeat/elasticsearch-output
- Elastic Filebeat security roles documentation: https://www.elastic.co/docs/reference/beats/filebeat/feature-roles
- Elastic Filebeat publishing privileges documentation: https://www.elastic.co/docs/reference/beats/filebeat/privileges-to-publish-events
- Elastic Filebeat setup privileges documentation: https://www.elastic.co/docs/reference/beats/filebeat/privileges-to-setup-beats
- Elastic Filebeat secure communication with Elasticsearch documentation: https://www.elastic.co/docs/reference/beats/filebeat/securing-communication-elasticsearch
- Elastic Elasticsearch enrollment token documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/create-enrollment-token.html
- Elastic Filebeat directory layout documentation: https://www.elastic.co/docs/reference/beats/filebeat/directory-layout
- Elastic Filebeat add Docker metadata documentation: https://www.elastic.co/guide/en/beats/filebeat/current/add-docker-metadata.html

## Issues Found
- The manual log inputs used `type: log`, which is deprecated and disabled by default in Filebeat 9.0. Changed the examples to `type: filestream`, the current recommended input.
- The JSON parsing example used `parsers` under a `log` input, which is not valid for that input type. Converted it to `filestream` syntax and used `ndjson` with `target: ""`.
- The multiline comments used old top-level `multiline.*` keys. Updated them to the `filestream` parser list format.
- The Elasticsearch user example assigned a `filebeat_writer` role without creating the role. Added a role creation command with the required publishing privileges.
- The enrollment token section used `elasticsearch-create-enrollment-token -s beats` and `filebeat enroll`, but Elasticsearch enrollment tokens are for nodes and Kibana, not Filebeat. Replaced it with the supported CA fingerprint TLS configuration.
- The registry inspection command assumed a specific registry JSON file. Replaced it with a directory listing under Filebeat's data path to avoid depending on internal registry file names.
- The Docker example used the deprecated `container` input. Converted it to `filestream` with the `container` parser.
- The Docker socket permission command assumed a `filebeat` system user. Clarified that DEB/RPM Filebeat runs as root by default and kept the group command only for non-root service users.
- The high-volume tuning example used `log` input settings (`scan_frequency`, `close_inactive`). Updated it to `filestream` settings (`prospector.scanner.check_interval`, `close.on_state_change.inactive`).

## Review Notes
- The guide remains focused on Filebeat 8.x. Current Elastic documentation increasingly points users toward Elastic Agent and integrations for managed ingestion, but Filebeat remains documented and usable.
- The `sudo filebeat setup --dashboards` command is correct for Elasticsearch output configurations. When using Logstash output, users may need to temporarily enable Elasticsearch output or provide setup-time overrides so Filebeat can load templates and dashboards.
