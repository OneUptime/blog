# Validation Summary: How to Configure Logstash Pipelines on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- Logstash 8.x
- Elastic Stack / Elasticsearch
- Logstash pipeline configuration
- Logstash input, filter, codec, and output plugins
- Nginx access logs
- JSON application logs
- Syslog
- systemd

## Sources Consulted
- Elastic Logstash 8.19 Getting Started / Java version: https://www.elastic.co/guide/en/logstash/8.19/getting-started-with-logstash.html
- Elastic Logstash 8.19 Installing Logstash / APT repository: https://www.elastic.co/guide/en/logstash/8.19/installing-logstash.html
- Elastic Logstash 8.19 Configuration Files: https://www.elastic.co/guide/en/logstash/8.19/config-setting-files.html
- Elastic Logstash 8.19 logstash.yml settings: https://www.elastic.co/guide/en/logstash/8.19/logstash-settings-file.html
- Elastic Logstash file input plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-file
- Elastic Logstash beats input plugin: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-beats.html
- Elastic Logstash syslog input plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-syslog
- Elastic Logstash mutate filter plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-mutate
- Elastic Logstash truncate filter plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-truncate
- Elastic Logstash json_lines codec plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-codecs-json_lines
- Elastic Logstash Elasticsearch output plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch

## Issues Found
- The Beats input in the Nginx example did not add the `nginx` tag, but the filter and output blocks only processed events with that tag. Added `tags => ["nginx"]` to the Beats input so Filebeat-shipped Nginx events follow the documented route.
- The Nginx grok pattern required the referrer field to match `%{URI:referrer}`. Standard combined logs commonly use `"-"` when no referrer is present, which would fail the pattern. Changed it to `%{DATA:referrer}`.
- The Nginx error-response conditional compared `[response_code]` to an integer without checking that the field exists. Added a field-presence guard to avoid conditional evaluation errors on unparsed events.
- The application log example used `truncate` inside a `mutate` filter, but `truncate` is a separate Logstash filter plugin with `fields` and `length_bytes` options. Replaced the invalid mutate operation with a valid `truncate` filter block.
- The syslog sudo detection only checked `[syslog_message]`, which is populated by the local-file grok branch but not necessarily by events parsed by the `syslog` input plugin. Added a `[message]` check so the alert can work for both sources.

## Review Notes
- The APT repository setup, Logstash directory layout, `logstash.yml` settings, persistent queue settings, dead letter queue settings, file input options, syslog input port behavior, JSON codecs, and Elasticsearch output TLS/authentication options match Elastic documentation for Logstash 8.x.
- The post uses Elastic 8.x package URLs. Elastic's current documentation now also covers later major versions, but the 8.x repository and examples remain valid for an Elastic Stack 8 deployment.
- The Elasticsearch password is shown inline for tutorial simplicity. In production, Logstash keystore-backed secure settings would be preferable.
