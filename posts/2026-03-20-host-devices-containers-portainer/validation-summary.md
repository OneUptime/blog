# Validation Summary: How to Map Host Devices (USB, Serial) to Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose / Compose Specification
- Portainer API
- Linux device nodes such as `/dev/ttyUSB0` and `/dev/ttyACM0`

## Sources Consulted
- Portainer Documentation: Advanced container settings. https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation: View a container's details. https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: Inspect a container. https://docs.portainer.io/user/docker/containers/inspect
- Portainer Documentation: Edit or duplicate a container. https://docs.portainer.io/2.21/user/docker/containers/edit
- Portainer Documentation: API usage examples. https://docs.portainer.io/sts/api/examples
- Docker Docs: `docker container run`. https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Compose services reference (`devices`). https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element. https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Engine API v1.24 (`HostConfig.Devices`). https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The original post title and description were about mapping host devices, but most of the body covered unrelated container inspection, logs, resource limits, and file-copy commands. I replaced those sections with device-mapping instructions that match Portainer's documented workflow and Docker's `--device` / Compose `devices` support.
- The prerequisite claiming a Docker or Kubernetes environment was inaccurate for the documented Portainer container workflow used here. I corrected it to Docker and added the requirement that the host device must already exist on the Docker host.
- The original Compose example was not relevant to device mapping and used the obsolete top-level `version` field. I replaced it with a current Compose example that uses `devices:` for `/dev/ttyUSB0`.
- The command-line examples did not demonstrate device mapping. I replaced them with relevant `docker run`, `docker inspect`, and verification commands.
- The Portainer UI instructions did not explain where device mappings are configured. I corrected them to use `Containers`, `Add container`, `Duplicate/Edit`, and `Runtime & Resources > Devices`.
- The troubleshooting section focused on unrelated issues like missing containers and resource limits. I replaced it with device-specific troubleshooting for missing device paths, permissions, and Portainer's replace-on-edit behavior.
- The API example originally listed containers instead of showing how to map a device. I replaced it with a container-creation example using Portainer's Docker API gateway and `HostConfig.Devices`.

## Review Notes
- Portainer edits an existing container by creating a replacement container; the post now reflects that behavior based on Portainer's documentation.
- Device access can still fail even with a correct mapping if the container process user lacks permission to the host device node. The post now points readers to verify device ownership and the container user.
- The Compose snippet uses a serial-device example (`/dev/ttyUSB0`); readers should substitute the correct host device path for their hardware, such as `/dev/ttyACM0`.
