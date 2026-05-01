# Validation Summary: How to Deploy the EFK Stack (Elasticsearch, Fluentd, Kibana) via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Fluentd logging driver
- Fluentd
- Elasticsearch
- Kibana
- Kibana Query Language (KQL)

## Sources Consulted
- Docker Docs: Fluentd logging driver - https://docs.docker.com/engine/logging/drivers/fluentd/
- Fluentd Docs: Docker Compose - https://docs.fluentd.org/container-deployment/docker-compose
- Fluentd Docs: parser filter - https://docs.fluentd.org/filter/parser
- Fluentd Docs: file buffer plugin - https://docs.fluentd.org/buffer/file
- Elastic Docs: Add and Remove Elasticsearch nodes - https://www.elastic.co/docs/deploy-manage/maintenance/add-and-remove-elasticsearch-nodes
- Elastic Docs: Create a data view API - https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createdataviewdefaultw
- Elastic Docs: Set the default data view API - https://www.elastic.co/docs/api/doc/kibana/operation/operation-setdefaultdatailviewdefault
- Elastic Docs: Alerting and action settings in Kibana - https://www.elastic.co/docs/reference/kibana/configuration-reference/alerting-settings
- Elastic Docs: Ruby client installation and version compatibility - https://www.elastic.co/guide/en/elasticsearch/client/ruby-api/current/ruby-install.html

## Issues Found
- The Elasticsearch health check waited for `green`, which is incorrect for a single-node cluster because unassigned replica shards keep cluster health at `yellow`. Updated the health check to wait for a successful `yellow` status response instead.
- The Fluentd image installed `fluent-plugin-elasticsearch` without explicitly installing the Elasticsearch 8.x Ruby client. The official Fluentd EFK compose example requires an Elasticsearch 8.x client when sending to Elasticsearch 8.x, so the Dockerfile now installs the 8.11.0 client explicitly and pins the Fluentd Elasticsearch plugin version.
- The Fluentd parser used `@type multi_format` without installing the `multi-format-parser` plugin. Replaced it with the built-in JSON parser and set `emit_invalid_record_to_error false` so non-JSON log lines do not fail the pipeline.
- The file buffer path pointed to `/var/log/fluentd-buffers/...` without guaranteeing a writable location in the container. Updated it to a writable temporary path.
- The Docker Fluentd logging driver was configured to send logs to `fluentd:24224`, but the logging driver connects from the Docker daemon on the host, not from inside the container network. Updated the examples to use `localhost:24224`, matching Docker’s official documentation.
- The example added container labels but did not pass them through the logging driver. Added the `labels` logging option so `service` and `environment` fields are included in log records, and updated the KQL example to query `service: "api"`.
- The Kibana example used the older saved-objects `index-pattern` endpoints. Replaced those commands with the current data views APIs and default data view API.
- The alerting example was incompatible with the guide’s own development configuration because Kibana alerting requires Elastic security, TLS between Kibana and Elasticsearch, and a persistent encrypted saved objects key. Replaced the broken API example with an accurate prerequisite note.

## Review Notes
- The guide pins Elasticsearch and Kibana to `8.11.0`. Those versions are older than current Elastic releases as of 2026-05-01, but the post now uses configuration and API calls that are technically correct for the pinned 8.x stack.
