# Validation Summary: How to Deploy the EFK Stack (Elasticsearch, Fluentd, Kibana) via Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Elasticsearch
- Fluentd
- Kibana
- Docker logging drivers

## Sources Consulted
- Portainer documentation, "Add a new stack": https://docs.portainer.io/2.33-lts/user/docker/stacks/add
- Portainer documentation, "How Relative Path Support works in Portainer": https://docs.portainer.io/sts/advanced/relative-paths
- Docker documentation, "Fluentd logging driver": https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker documentation, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Elastic documentation, "Configure Elasticsearch with Docker": https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure
- Elastic documentation, "Using the Docker images in production": https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- Elastic documentation, "Increase virtual memory": https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- Elastic documentation, "Data views": https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views
- Elastic documentation, "Kibana Query Language": https://www.elastic.co/guide/en/kibana/8.19/kuery-query.html
- Fluentd documentation, "tail": https://docs.fluentd.org/input/tail
- Fluentd documentation, "record_transformer": https://docs.fluentd.org/filter/record_transformer
- Fluentd documentation, "Docker Logging Driver": https://docs.fluentd.org/container-deployment/docker-logging-driver
- fluent-plugin-elasticsearch README: https://github.com/uken/fluent-plugin-elasticsearch

## Issues Found
- The stack used `./fluent.conf` as a bind mount even though Portainer relative-path mounts only work for Git-based deployments with Relative path volumes enabled in Portainer Business Edition. I changed the example to a host path placeholder and clarified that `fluent.conf` must exist on the Docker host.
- The Fluentd tail input used outdated/incorrect parsing settings. I removed `format json`, added `time_type string`, and kept the JSON parser inside `<parse>` so the Docker JSON log timestamps are parsed correctly with current Fluentd behavior.
- The original Fluentd tag pattern and `container_id ${tag_parts[2]}` logic did not extract the Docker container ID from tailed log files. I switched to `path_key`, added `follow_inodes true`, and derived `container_id` from the Docker log path while preserving the `container_id` field already sent by Docker's Fluentd logging driver.
- The Elasticsearch output block included `index_name` even though `logstash_format true` ignores it, and included `type_name`, which has no effect with Elasticsearch 8. I removed both settings.
- Kibana 8.x uses Data Views rather than the older Index Patterns terminology. I updated the Kibana setup section and heading accordingly.
- The sample Kibana queries referenced fields and syntax that were not produced by the provided pipeline (`log_level`, `response_time`, and the invalid range form `[>1000 TO *]`). I replaced them with valid KQL examples using fields the configuration actually emits.
- The production section implied that enabling Elasticsearch security was complete with only partial Elasticsearch settings. I revised that section so it no longer presents incomplete security changes as sufficient, and I added `bootstrap.memory_lock` to align with the existing `memlock` ulimit guidance.

## Review Notes
- The post pins Elasticsearch and Kibana to `8.12.0` and Fluentd to a `v1.16` daemonset image. These tags are older than the latest releases as of 2026-04-24, but the corrected examples are still valid for the versions shown.
