# Validation Summary: How to Use docker config for Swarm Configurations

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker CLI
- Docker Swarm
- Docker configs
- Docker services
- Docker stack deploy
- Compose file configs
- Bash scripting
- YAML

## Sources Consulted
- Docker Docs: Store configuration data using Docker Configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: docker config CLI reference - https://docs.docker.com/reference/cli/docker/config/
- Docker Docs: docker config create - https://docs.docker.com/reference/cli/docker/config/create/
- Docker Docs: docker config inspect - https://docs.docker.com/reference/cli/docker/config/inspect/
- Docker Docs: docker service create --config - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Compose configs top-level element - https://docs.docker.com/reference/compose-file/configs/
- Docker Docs: Compose services configs attribute - https://docs.docker.com/reference/compose-file/services/#configs
- Local Docker CLI help output for `docker config create`, `docker service create`, and `docker stack deploy`.

## Issues Found
- Corrected the `docker config inspect` description. The post said inspection shows metadata but not content by default; Docker's official inspect example includes `Spec.Data`, which is the base64-encoded config content. Updated the wording to say metadata and base64-encoded content are shown, and that the provided command decodes the content.
- Clarified config security wording. Docker configs are non-sensitive data, are sent to the swarm manager over mutual TLS, and are stored in the Raft log, but their content is inspectable and they are mounted directly into the container filesystem. Updated the introductory explanation and comparison table so readers do not treat configs like secrets.
- Corrected the versioning comment in the stack-file example. A new config name is created when `CONFIG_VERSION` changes; the deploy does not automatically create a new named config merely because the file content changed.

## Review Notes
The examples are Swarm-oriented and use `docker stack deploy`, which is appropriate for Docker configs in Swarm. The Compose `version` field is tolerated for stack files, though modern Compose treats it as informational/legacy in non-Swarm Compose workflows.
