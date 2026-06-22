# Validation Summary: How to Stream Docker Logs to ELK Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker logging drivers
- GELF
- Elasticsearch
- Logstash
- Kibana
- Filebeat

## Sources Consulted
- Elastic Filebeat migration guide for `container` input to `filestream`: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat `filestream` input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat Logstash output documentation: https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Elastic Filebeat Docker documentation: https://www.elastic.co/docs/reference/beats/filebeat/running-on-docker
- Elastic Elasticsearch Docker documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Elastic Logstash Docker documentation: https://www.elastic.co/docs/reference/logstash/docker
- Elastic Logstash Docker pipeline configuration documentation: https://www.elastic.co/docs/reference/logstash/docker-config
- Elastic Logstash Beats input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Elastic Logstash GELF input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-gelf
- Elastic Kibana Docker documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Docker logging driver configuration documentation: https://docs.docker.com/engine/logging/configure/
- Docker GELF logging driver documentation: https://docs.docker.com/engine/logging/drivers/gelf/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Filebeat configuration used the deprecated `container` input. Changed it to the supported `filestream` input with the `container` parser and a stable input ID, matching Elastic's migration guidance.
- The Filebeat configuration sent events directly to Elasticsearch while the article also defined a Logstash Beats pipeline and showed Filebeat flowing through Logstash in the architecture diagram. Changed Filebeat to use `output.logstash` with `logstash:5044`, and updated Compose dependencies so Filebeat waits for Logstash.
- The Compose examples used short image names such as `elasticsearch:8.11.0`, `logstash:8.11.0`, and `kibana:8.11.0`. Changed them to Elastic's documented registry images under `docker.elastic.co`.
- The "Complete Production Setup" omitted Logstash even though the post describes an ELK pipeline using Logstash. Added the Logstash service and connected Filebeat to it.
- The GELF logging driver example used `udp://logstash:12201`, which is unreliable because Docker logging drivers connect from the Docker daemon context rather than from inside the application container's service DNS context. Changed it to `udp://127.0.0.1:12201` to match the published UDP port in the example.
- The Compose snippets included the obsolete top-level `version` field. Removed it to match the current Compose Specification guidance.

## Review Notes
- Security is disabled in the examples with `xpack.security.enabled=false`, which is acceptable for a simplified tutorial but should not be used unchanged for a real production deployment.
- The "Complete Production Setup" is still a compact single-node example, not a full high-availability Elastic production architecture.
