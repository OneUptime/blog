# Validation Summary: How to Run Datadog Agent in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Datadog Agent 7
- Datadog APM
- Datadog Logs
- Datadog Autodiscovery
- DogStatsD
- NGINX
- Redis
- PostgreSQL
- MongoDB
- Python Datadog client

## Sources Consulted
- Datadog Docker Agent documentation: https://docs.datadoghq.com/containers/docker/
- Datadog Docker log collection documentation: https://docs.datadoghq.com/containers/docker/log/
- Datadog Docker APM documentation: https://docs.datadoghq.com/containers/docker/apm/
- Datadog Docker integrations and Autodiscovery documentation: https://docs.datadoghq.com/containers/docker/integrations/
- Datadog Autodiscovery troubleshooting documentation: https://docs.datadoghq.com/agent/troubleshooting/autodiscovery/
- Datadog DogStatsD documentation: https://docs.datadoghq.com/developers/dogstatsd/
- Datadog Postgres integration documentation: https://docs.datadoghq.com/integrations/postgres/
- Datadog Redis integration documentation: https://docs.datadoghq.com/integrations/redisdb/
- Datadog NGINX integration documentation: https://docs.datadoghq.com/integrations/nginx/
- Datadog MongoDB integration documentation: https://docs.datadoghq.com/integrations/mongodb/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The quick-start Docker command enabled APM but did not set `DD_APM_NON_LOCAL_TRAFFIC=true`, which Datadog requires when traces are sent from other containers. Added the environment variable.
- The Docker Compose example quoted `DD_CONTAINER_EXCLUDE`, but Datadog's Docker log collection documentation notes that this value must not be quoted in Compose environment entries. Removed the embedded quotes.
- The Redis, NGINX, PostgreSQL, and MongoDB examples used older Autodiscovery label keys while the tutorial uses Agent 7. Updated them to Datadog's current `com.datadoghq.ad.checks` Docker-label format for Agent v7.36+.
- The NGINX status example used `stub_status on;` and claimed access was limited to the Datadog Agent while configuring `allow all`. Updated the directive to the current `stub_status;` form and corrected the comment to match the configuration.

## Review Notes
- The `version: "3.8"` field in the Compose example is still accepted for backward compatibility, but Docker Compose now treats the top-level `version` element as obsolete and may show a warning.
- The Datadog Agent image path `gcr.io/datadoghq/agent:7` is still a documented registry path, although Datadog's current examples default to `registry.datadoghq.com/agent:7`.
