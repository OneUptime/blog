# Validation Summary: How to Run Elasticsearch in Non-Prod Mode in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Docker
- Docker Compose
- Elasticsearch index templates
- Elasticsearch cluster and security settings

## Sources Consulted
- Elastic Docs: Install Elasticsearch with Docker - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Elastic Docs: Configure Elasticsearch with Docker - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure
- Elastic Docs: Start a single-node cluster in Docker - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic
- Elastic Docs: Using the Docker images in production - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- Elastic Docs: Minimal security setup - https://www.elastic.co/docs/deploy-manage/security/set-up-minimal-security
- Elastic Docs: Index management settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-management-settings
- Elastic Docs: Index fundamentals - https://www.elastic.co/docs/manage-data/data-store/index-basics
- Elastic Docs: General index settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elastic Docs: Update Elasticsearch logging levels - https://www.elastic.co/docs/deploy-manage/monitor/logging-configuration/update-elasticsearch-logging-levels
- Docker Docs: History and development of Docker Compose - https://docs.docker.com/compose/intro/history/

## Issues Found
- The Docker Compose examples used a top-level `version: '3.8'`. Docker Compose v2 ignores the top-level `version` field and relies on the Compose Specification, so the examples were updated to omit it.
- The Elasticsearch Docker image tag was `8.11.0`, which is no longer the current version shown in Elastic's official Docker examples. It was updated to `9.4.2` throughout the post.
- The advanced Compose example set `index.number_of_shards` and `index.number_of_replicas` as node environment settings. Elastic documents these as index settings configured at index creation or through index templates, and the post already provides an index template for those values. The incorrect environment entries were removed.
- The advanced Compose example also included `indices.id_field_data.enabled=true` and `logger.level=INFO`, which are unnecessary for the general development setup shown in the post and were not needed for the documented behavior. They were removed to keep the example limited to documented configuration relevant to the guide.
- The production discovery comparison used `zen/seed-hosts`, which refers to older Zen discovery terminology. It was updated to modern `discovery.seed_hosts / cluster.initial_master_nodes` terminology.
- The cleanup script used the legacy `docker-compose` command and attempted to remove a volume named `esdata`, but Compose normally prefixes project-managed volume names. It now uses `docker compose down -v` followed by `docker compose up -d elasticsearch`.

## Review Notes
- The post intentionally disables Elasticsearch security for local development. This is technically valid when `xpack.security.enabled=false` is set, but it remains inappropriate for production.
- The index template example is the correct place in this post to apply development defaults such as one primary shard, zero replicas, and a short refresh interval for newly created indices.
