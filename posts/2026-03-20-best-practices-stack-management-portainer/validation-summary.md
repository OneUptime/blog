# Validation Summary: Best Practices for Stack Management in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Git / GitOps
- Docker volumes
- Container health checks
- Container restart policies

## Sources Consulted
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation, "Environment Variable Management in Docker: .env vs. stack.env": https://docs.portainer.io/faqs/troubleshooting/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker Docs, "Compose file reference": https://docs.docker.com/reference/compose-file/
- Docker Docs, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Compose Deploy Specification": https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, "Define and manage volumes in Docker Compose": https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, "docker image pull": https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Hub, "ubuntu Docker Official Image overview": https://hub.docker.com/_/ubuntu?tab=tags

## Issues Found
- The Portainer navigation text used `Repository` and `Branch name`, but the current Portainer UI and docs use `Git Repository`, `Repository reference`, and `Compose path`. I updated the wording to match the official documentation.
- The configuration example implied using a Portainer stack variable to substitute the image tag. Portainer documents different variable-substitution behavior between standalone Compose and Swarm `stack.env`, so I removed that implication and kept the example focused on environment-specific application settings.
- Several YAML comparison snippets were not syntactically valid as written because they repeated top-level keys in a single document. I converted those examples into separate YAML documents within the same code fences using `---`.
- The digest example used a fake and incomplete SHA-256 digest. I replaced it with a real digest example from Docker's official `docker image pull` documentation.
- The named-volume example was invalid Compose syntax because it placed a mount path under the top-level `volumes` section instead of under a service. I corrected it to show a service-level volume mount plus a top-level named volume declaration.
- The statement that named volumes are "portable across environments" overstated the behavior. I narrowed it to the accurate benefit documented by Docker: named volumes are managed by Docker and avoid hard-coded host-specific paths in the Compose file.

## Review Notes
- Portainer manages both Docker Standalone and Docker Swarm environments. For Swarm stacks, `docker stack deploy` uses the legacy Compose file version 3 format, so some Compose features and environment-variable workflows differ from standalone Compose.
- The health check example is syntactically correct, but the image used in practice must include the probe command (`curl`) or an equivalent health-check binary.
- A live Portainer deployment test was not run in this environment.
