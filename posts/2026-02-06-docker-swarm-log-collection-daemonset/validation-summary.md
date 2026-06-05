# Validation Summary: How to Configure Docker Swarm Mode Service Log Collection with the

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm mode
- Docker stack files and services
- Docker configs
- Docker `json-file` logging driver
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector filelog, OTLP, resource, memory_limiter, batch, and docker_stats components

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: Store configuration data using Docker configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: docker stack deploy CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: docker service create CLI reference, including service templates - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- OpenTelemetry Collector Contrib: filelog receiver README - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib: docker_stats receiver README - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md
- OpenTelemetry Collector Contrib: resource processor README - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry configuration data model: environment variable substitution - https://opentelemetry.io/docs/specs/otel/configuration/data-model/

## Issues Found
- The filelog receiver parsed `attributes["log.file.path"]` without enabling file path attributes. Added `include_file_path: true` so the container ID regex has input.
- The Docker timestamp layout only matched millisecond precision. Updated it to a Go-time layout that handles Docker `json-file` timestamps with nanosecond precision.
- The Collector service mounted Docker log files and the Docker socket while using the default non-root Collector image user. Added `user: "0:0"` so the example can read host Docker logs and the socket in the common Linux permission model.
- The `swarm.node` resource attribute copied from `host.name`, but the config did not populate `host.name`. Added a Swarm template environment variable and used Collector environment substitution to set `swarm.node`.
- The post claimed Docker Stats receiver labels enriched logs. The Docker Stats receiver emits metrics, so the section now describes metric labels and log correlation by container ID.
- The app trace endpoint used the `otel-collector` service name and claimed this reaches the local Collector. Swarm service discovery can route to any service task. Updated the example to use the host-published Collector port with a node hostname template and added the caveat.
- The config update flow removed and recreated an immutable config while it would still be in use, and it used the unscoped config name for a stack-created config. Updated the flow to create a new config name and update the service to remove `observability_collector-config` and add the new config.
- The text implied the filelog example collects all Docker container logs. Clarified that the example is for containers using Docker's `json-file` logging driver.

## Review Notes
- Verified the corrected Collector configuration with `otelcol-contrib validate` using the current `otel/opentelemetry-collector-contrib:latest` image.
- Verified the stack snippets parse with `docker stack config`.
- The post still uses `otel/opentelemetry-collector-contrib:latest`; pinning an explicit Collector version would be safer for production examples, but this is not a correctness error.
