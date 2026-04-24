# Validation Summary: How to Build an Automated Container Scaling System with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Swarm
- Docker Engine API
- Docker Compose stack files
- Prometheus HTTP API
- Python 3
- `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API examples: https://docs.portainer.io/api/examples
- Portainer OpenAPI spec (CE 2.39.1): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Engine API v1.52 reference: https://docs.docker.com/reference/api/engine/version/v1.52.yaml
- Docker Engine API v1.44 reference: https://docs.docker.com/reference/api/engine/version/v1.44.yaml
- Docker stack deploy reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker service create reference (placement constraints): https://docs.docker.com/reference/cli/docker/service/create/
- Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Swarm configs documentation: https://docs.docker.com/engine/swarm/configs/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The Python example hardcoded `PORTAINER_URL`, API key, and endpoint ID even though the deployment snippet passed them as environment variables. I changed the code to read `PORTAINER_URL`, `PORTAINER_API_KEY`, `PORTAINER_ENDPOINT_ID`, and `PROMETHEUS_URL` from the environment, with safe defaults for the example values, so the stack snippet and the Python code now match.
- The Docker task lookup filtered `/docker/tasks` by service ID, but the Docker Engine API documents the `service` task filter as a service name filter. I changed the code to JSON-encode the filter and use `service_name`, which aligns with the documented API behavior.
- Several HTTP calls parsed JSON without checking for HTTP errors first. I added `raise_for_status()` to the relevant requests so the example fails predictably instead of silently processing invalid responses.
- The original Swarm stack example used a relative bind mount for `./autoscaler.py`. Docker’s Compose/services documentation notes that relative host paths are only supported for local runtime deployments and are not portable for non-local platforms. I replaced the bind mount with a Swarm `config`, which is the documented fit for shipping a small read-only file into a Swarm service.
- The deployment snippet omitted `PORTAINER_ENDPOINT_ID`, even though the Python example needs it. I added it to the stack file.
- The post listed Prometheus as a prerequisite even though the scaler loop actually uses Docker stats via the Portainer Docker API path. I clarified that Prometheus is optional for the Docker-stats implementation shown here.
- The Prometheus helper function was written as if its selector were universal. I kept the helper but clarified in the code comment that the selector is an example and must be adjusted to match the labels exposed by the user’s container metrics exporter.

## Review Notes
- The main scaling path in the post now relies on Docker stats proxied through Portainer, which is consistent with the implementation shown in `auto_scale()`.
- The Prometheus helper remains intentionally example-level. The Prometheus HTTP API usage is correct, but the exact metric labels depend on the exporter in use, such as cAdvisor or another container metrics source.
- The Portainer API docs reviewed during validation were current at review time and pointed to Portainer CE/BE 2.39.1 as the latest published API documentation.
