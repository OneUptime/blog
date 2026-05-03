# Validation Summary: How to Deploy Uptime Kuma via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Uptime Kuma
- Portainer
- Docker
- Docker Compose
- Public status pages
- Monitoring and notifications
- OneUptime

## Sources Consulted
- Uptime Kuma README: https://github.com/louislam/uptime-kuma
- Uptime Kuma Docker Compose example: https://raw.githubusercontent.com/louislam/uptime-kuma/master/compose.yaml
- Uptime Kuma wiki, How to Monitor Docker Containers: https://github.com/louislam/uptime-kuma/wiki/How-to-Monitor-Docker-Containers
- Uptime Kuma wiki, Status Page: https://github.com/louislam/uptime-kuma/wiki/Status-Page
- Uptime Kuma wiki, Notification Methods: https://github.com/louislam/uptime-kuma/wiki/Notification-Methods
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Compose Specification, Version and name top-level elements: https://compose-spec.github.io/compose-spec/04-version-and-name.html

## Issues Found
- The prerequisite list included a hard `256MB RAM` minimum. I could not verify a current upstream-documented minimum requirement, so I replaced it with a deployment prerequisite that matches Portainer stack usage.
- The Compose example used the obsolete top-level `version: "3.8"` key. Current Compose documentation marks `version` as obsolete, so I removed it.
- The Compose example used `louislam/uptime-kuma:latest`. Uptime Kuma's current official Docker examples use the `:2` tag, so I updated the post to match upstream guidance.
- The Compose example included a custom `dns` override and described it as required on some systems. The current official Uptime Kuma Docker examples do not require that override, so I removed it to avoid implying it is part of a standard deployment.
- The Portainer deployment steps omitted selecting the web editor and pasting the Compose stack. Portainer's current stack documentation requires defining the stack in the web editor (or uploading a file), so I corrected the steps.
- The monitor table said the Docker Container monitor lets you simply select local containers from a list. Uptime Kuma's Docker Container monitoring requires access to the Docker socket or Docker TCP endpoint, so I updated the row to note the required `docker.sock` mount.

## Review Notes
- Uptime Kuma's upstream install documentation warns that NFS is not supported for its data storage. The post uses a local Docker volume, which is valid.
- Docker Container monitoring grants Uptime Kuma broad access to the Docker daemon when `docker.sock` is mounted. The post now notes the mount requirement, but readers should still treat that monitor type as more privileged than HTTP, TCP, DNS, or ping checks.
- Docker was not installed in this workspace, so I validated the updated Compose snippet as YAML locally rather than executing `docker compose config`.
