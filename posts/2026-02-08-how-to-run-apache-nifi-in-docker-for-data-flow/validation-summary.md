# Validation Summary: How to Run Apache NiFi in Docker for Data Flow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache NiFi
- Apache NiFi Docker image
- Apache NiFi REST API
- Apache NiFi Registry
- Docker
- Docker Compose
- PostgreSQL
- Apache Kafka
- Bash, curl, jq
- YAML

## Sources Consulted
- Apache NiFi Docker image README: https://raw.githubusercontent.com/apache/nifi/main/nifi-docker/dockerhub/README.md
- Apache NiFi Docker startup script: https://raw.githubusercontent.com/apache/nifi/main/nifi-docker/dockerhub/sh/start.sh
- Apache NiFi REST API documentation: https://nifi.apache.org/nifi-docs/rest-api.html
- Apache NiFi GetFile processor documentation: https://nifi.apache.org/components/org.apache.nifi.processors.standard.GetFile/
- Apache NiFi QueryDatabaseTable processor documentation: https://nifi.apache.org/components/org.apache.nifi.processors.standard.QueryDatabaseTable/
- Apache NiFi PublishKafka processor documentation: https://nifi.apache.org/components/org.apache.nifi.kafka.processors.PublishKafka/
- Apache NiFi Registry project page: https://nifi.apache.org/registry.html
- Apache NiFi Registry Getting Started guide: https://nifi.apache.org/docs/nifi-registry-docs/html/getting-started.html
- Apache NiFi Administration Guide: https://nifi.apache.org/docs/nifi-docs/html/administration-guide

## Issues Found
- The Docker examples exposed NiFi on `localhost:8443` but did not set `NIFI_WEB_PROXY_HOST`. The official Docker startup script warns that secure NiFi may be inaccessible when using port mapping without this property, so `NIFI_WEB_PROXY_HOST=localhost:8443` was added to the Docker and Compose examples.
- The first Docker Compose snippet was labeled as including ZooKeeper, but it did not define a ZooKeeper service or configure NiFi clustering. The comment was corrected to describe persistent storage only.
- The custom NAR volume was mounted to `/opt/nifi/nifi-current/extensions`, but the official Docker startup script configures the NAR autoload directory as `/opt/nifi/nifi-current/nar_extensions`. The mount path was corrected.
- The NiFi Registry section recommended NiFi Registry without noting its current status. The official Apache NiFi Registry page says Registry is deprecated and planned for removal in NiFi 3.0, so the section now notes the deprecation and points new NiFi 2 deployments toward Git-based Flow Registry Clients.
- The performance tuning snippet used `NIFI_WEB_THREADS`, which is not configured by the official NiFi Docker startup script. The unsupported environment variable was removed, and the equivalent `nifi.web.jetty.threads` property was placed in the `nifi.properties` tuning block.

## Review Notes
The REST API endpoints, GetFile property names, common processor names, Docker Compose syntax, and monitoring API examples were consistent with the official documentation reviewed. The examples still use `apache/nifi:latest`, which is convenient for tutorials but can change behavior over time; pinning a tested NiFi version would improve reproducibility in the future.
