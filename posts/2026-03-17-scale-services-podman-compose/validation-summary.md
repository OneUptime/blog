# Validation Summary: How to Scale Services with podman-compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- YAML
- Python container images
- Nginx and Redis container images

## Sources Consulted
- Podman documentation: podman-compose wrapper documentation, https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: podman ps options and formatting, https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Compose Specification: services, ports, expose, scale, deploy, and version fields, https://compose-spec.github.io/compose-spec/spec.html
- Compose Deploy Specification: mode and replicas, https://docs.docker.com/reference/compose-file/deploy/
- podman-compose upstream source and README, https://github.com/containers/podman-compose

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as obsolete and informational.
- The port scaling example used `expose` while claiming each instance gets a random host port. Changed it to `ports: - "5000"` because `expose` only exposes ports to linked services on the Compose network, while omitting the host side of a `ports` mapping lets the runtime allocate an available host port.
- The `deploy.replicas` podman-compose example omitted `deploy.mode: replicated`. Added it because the upstream podman-compose implementation applies `deploy.replicas` only when `deploy.mode` is explicitly set to `replicated`.
- The sample scaled container names omitted the project prefix. Updated the example output to show `project_worker_1`, `project_worker_2`, and `project_worker_3`, with a note that the project name can vary.

## Review Notes
The local environment did not have `podman` or `podman-compose` installed, so command behavior was verified against current official documentation and the upstream podman-compose source rather than by executing the commands locally.
