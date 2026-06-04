# Validation Summary: How to Run TheHive in Docker for Incident Response

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- TheHive 5
- Apache Cassandra
- Elasticsearch
- MinIO / S3-compatible object storage
- Cortex
- TheHive REST API
- Python requests

## Sources Consulted
- TheHive 5 Docker Compose deployment documentation: https://docs.strangebee.com/thehive/installation/docker/
- TheHive 5 software requirements: https://docs.strangebee.com/thehive/installation/software-requirements/
- TheHive database and index connection settings: https://docs.strangebee.com/thehive/configuration/cassandra-elasticsearch-connection-settings/
- TheHive Docker entrypoint settings: https://docs.strangebee.com/thehive/configuration/thehive-docker-entrypoint-settings/
- TheHive architecture and storage overview: https://docs.strangebee.com/thehive/overview/
- TheHive S3-compatible storage configuration in cluster deployment docs: https://docs.strangebee.com/thehive/installation/deploying-a-cluster/
- TheHive first-start/default credential documentation: https://docs.strangebee.com/thehive/administration/first-start/
- TheHive 5 API documentation: https://docs.strangebee.com/thehive/api-docs/
- Cortex Docker Compose profile from StrangeBeeCorp/docker: https://github.com/StrangeBeeCorp/docker
- Cortex database configuration documentation: https://docs.strangebee.com/cortex/installation-and-configuration/database/
- Docker Compose file reference for obsolete top-level version: https://docs.docker.com/reference/compose-file/version-and-name/
- MinIO container and client documentation: https://min.io/docs/minio/container/index.html and https://min.io/docs/minio/linux/reference/minio-mc/mc-mb.html

## Issues Found
- The post described Elasticsearch as TheHive's data store and Cassandra as an alternative database. Updated the architecture and prose because TheHive 5 uses Cassandra for data storage and Elasticsearch for indexing.
- The Docker prerequisites were outdated. Updated the requirements to Docker Engine 23.0.15+ and Docker Compose plugin v2.20.2+ based on current TheHive 5 Docker Compose requirements.
- The Docker Compose example omitted Cassandra, so TheHive would not have had a valid CQL backend. Added a Cassandra 4.1 service, health check, volume, and dependency.
- The compose example pinned `strangebee/thehive:5.2`; updated it to `strangebee/thehive:5.2.16` to use an explicit patch release in the documented 5.0-5.2 compatibility range.
- The top-level Compose `version` key is obsolete in current Docker Compose. Removed it after `docker compose config` warned about the field.
- The TheHive configuration pointed the CQL storage backend at Elasticsearch. Updated it to point at Cassandra and added the Cassandra keyspace configuration.
- The TheHive configuration omitted the Play Framework secret key. Added a placeholder `play.http.secret.key` and added it to the hardening guidance.
- The S3/MinIO configuration used outdated or incorrect TheHive 5 property names. Replaced them with `endpoint-url`, static AWS credential provider fields, path-style access, and static region settings.
- The MinIO setup did not create the required bucket. Added a `minio-init` service using `mc mb`.
- The Cortex module example used `play.modules.enabled`; updated it to `scalligraph.modules += ...`, matching TheHive 5 configuration.
- The Cortex compose snippet mounted a named volume at `/var/run/docker.sock`, which would not expose the Docker socket. Changed it to bind-mount `/var/run/docker.sock` and added a job directory volume.
- The Cortex snippet had no Elasticsearch backend. Added a dedicated `cortex-elasticsearch` service, since sharing Elasticsearch between TheHive and Cortex is not recommended and Cortex requires Elasticsearch.
- The backup section only covered Elasticsearch and MinIO. Added Cassandra backup guidance because Cassandra is the primary TheHive data store.
- The alert API Python example used `artifacts`; TheHive 5's create-alert API expects `observables`. Updated the payload field name.

## Review Notes
- The main Docker Compose YAML was validated with `docker compose config`.
- The Python example was checked with `python3 -m py_compile`.
- Docker image manifest checks could not be completed because Docker Hub returned an unauthenticated pull-rate-limit error, so image/version validation was based on official StrangeBee documentation and repository examples.
