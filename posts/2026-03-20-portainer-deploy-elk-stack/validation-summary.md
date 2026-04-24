# Validation Summary: How to Deploy the ELK Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Elasticsearch
- Logstash
- Kibana
- Filebeat
- Linux sysctl configuration

## Sources Consulted
- Elastic Docker registry: Elasticsearch tags, https://www.docker.elastic.co/r/elasticsearch/elasticsearch
- Elastic Docker registry: Logstash tags, https://www.docker.elastic.co/r/logstash/logstash
- Elastic Docker registry: Kibana tags, https://www.docker.elastic.co/r/kibana/kibana
- Install Elasticsearch with Docker, https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Configure Elasticsearch with Docker, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure
- Elasticsearch security settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Built-in users in self-managed clusters, https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/built-in-users
- Set passwords for native and built-in users in self-managed clusters, https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/built-in-sm
- Configuring Logstash for Docker, https://www.elastic.co/docs/reference/logstash/docker-config
- Elasticsearch output plugin for Logstash, https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Filebeat Logstash output, https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Filebeat input configuration, https://www.elastic.co/docs/reference/beats/filebeat/configuration-filebeat-options
- Migrate `log` inputs to `filestream`, https://www.elastic.co/guide/en/beats/filebeat/8.19/migrate-to-filestream.html
- Install Kibana with Docker, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Kibana status API, https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-status
- Portainer relative path support, https://docs.portainer.io/sts/advanced/relative-paths

## Issues Found
- The post pinned Elastic images to `8.13.0`, which was outdated as of April 24, 2026. Updated Elasticsearch, Logstash, and Kibana to `9.3.3` using current official Elastic Docker registry tags.
- The `vm.max_map_count` prerequisite and commands were outdated for current Elasticsearch Docker guidance. Updated the post from `262144` to `1048576` to match current Elastic Docker production documentation.
- The original Logstash mount used relative paths and referenced `./logstash/logstash.yml`, but that file was never created in the guide. Replaced the Logstash bind mount with an explicit host path for the pipeline directory and removed the undefined `logstash.yml` mount because the Logstash Docker image already provides the relevant Docker defaults.
- The Elasticsearch healthcheck only checked whether `curl` could connect, which can mark the service healthy without validating a successful authenticated Elasticsearch response. Updated the healthcheck to verify that the authenticated root response contains `cluster_name`.
- The Logstash output indexed every event using Beats-only metadata fields. Syslog events sent over UDP do not include `[@metadata][beat]` and `[@metadata][version]`, so the guide would generate incorrect index names for those events. Added conditional target index selection for Beats, syslog, and fallback events.
- The Kibana status verification command queried `/api/status` without authentication even though the rest of the stack is configured with security enabled. Added basic authentication to that command.
- The Filebeat example used the deprecated `log` input. Replaced it with `filestream` and added the required input `id` per current Filebeat guidance.

## Review Notes
- The post now matches current Elastic image versions as of April 24, 2026, so the `vm.max_map_count` guidance was updated accordingly. If the post is later pinned back to an older 8.x release train, that prerequisite should be rechecked against the matching versioned docs.
- Elastic’s Docker docs warn that secrets passed through environment variables are visible via process listings. This post is technically correct, but a future revision could move credentials to Docker secrets or keystores.
- When Filebeat sends data to Logstash instead of directly to Elasticsearch, Elastic recommends loading the index template manually if you rely on Beats templates or dashboards. The post’s example is valid for shipping logs, but that setup caveat is still relevant.
