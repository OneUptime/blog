# Validation Summary: How to Use Docker tmpfs Mounts for Faster I/O

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker tmpfs mounts
- Docker Compose service configuration
- Linux tmpfs mount options
- PostgreSQL temporary files
- Redis container storage
- Nginx, PHP-FPM, Node.js, Java, and Elasticsearch containers
- Kubernetes memory-backed emptyDir volumes

## Sources Consulted
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Compose services reference, tmpfs and volumes attributes - https://docs.docker.com/reference/compose-file/services/
- Kubernetes Docs: Volumes, emptyDir and memory-backed emptyDir - https://kubernetes.io/docs/concepts/storage/volumes/
- PostgreSQL Docs: Database file layout and temporary file locations - https://www.postgresql.org/docs/current/storage-file-layout.html
- PostgreSQL Docs: Cumulative statistics system changes in current PostgreSQL - https://www.postgresql.org/docs/current/monitoring-stats.html
- Docker Hub: OpenJDK image deprecation notice - https://hub.docker.com/_/openjdk
- Adoptium Docs: Eclipse Temurin container images - https://adoptium.net/installation/containers
- Elastic Docs: Install Elasticsearch with Docker - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker

## Issues Found
- The PostgreSQL example mounted `/var/lib/postgresql/data/pg_stat_tmp` and described it as the location for temporary sort and hash files. PostgreSQL temporary files for sort/hash spill are created under `PGDATA/base/pgsql_tmp`, so the example was changed to `/var/lib/postgresql/data/base/pgsql_tmp:size=100M`.
- The Java example used `openjdk:21`, but the Docker Hub OpenJDK image is deprecated. The example now uses `eclipse-temurin:21`.
- The Elasticsearch example used `elasticsearch:8.11.0`. Elastic's official Docker installation documentation uses images from `docker.elastic.co/elasticsearch/elasticsearch`, so the example was changed to `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`.
- The sensitive-data wording implied secrets simply disappear from memory when the container stops. Docker documents that tmpfs data can be written to swap, so the comment was narrowed to say the data is not persisted in the container filesystem, and the summary now notes the swap caveat.

## Review Notes
The Docker CLI and Docker Compose tmpfs examples use valid syntax. Kubernetes `emptyDir` with `medium: Memory` and `sizeLimit` matches current Kubernetes documentation. Performance numbers are presented as examples, so they should be treated as environment-dependent rather than guaranteed results.
