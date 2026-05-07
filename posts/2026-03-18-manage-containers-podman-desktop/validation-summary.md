# Validation Summary: How to Manage Containers with Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman Desktop
- Podman CLI
- Containers
- Container images
- Port publishing
- Volumes and bind mounts
- Environment variables

## Sources Consulted
- Podman Desktop documentation: Working with containers - https://podman-desktop.io/docs/containers
- Podman Desktop documentation: Starting a container - https://podman-desktop.io/docs/containers/starting-a-container
- Podman Desktop tutorial: Managing your application resources - https://podman-desktop.io/tutorial/managing-your-application-resources
- Podman Desktop tutorial: Running a pod using a container or docker file - https://podman-desktop.io/tutorial/running-a-pod-using-a-container-docker-file
- Podman CLI documentation: podman ps - https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman CLI documentation: podman inspect - https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman CLI documentation: podman container inspect - https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman CLI documentation: podman stats - https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman CLI documentation: podman rm - https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman CLI documentation: podman container - https://docs.podman.io/en/latest/markdown/podman-container.1.html
- Podman CLI documentation: podman volume create - https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman CLI documentation: podman volume - https://docs.podman.io/en/v5.2.3/markdown/podman-volume.1.html
- Podman Getting Started documentation - https://podman.io/docs

## Issues Found
- The post said each Podman Desktop container row has action buttons for Start, Stop, Restart, and Delete. The current Podman Desktop documentation lists Start, Stop, and Delete as common row icons, and Restart as a container-specific action in the overflow menu. Updated the sentence to reflect the documented UI behavior.

## Review Notes
- The Podman CLI commands and flags shown in the post are current and match official documentation.
- The `podman inspect --format '{{.NetworkSettings.IPAddress}}'` example is syntactically valid, but rootless Podman containers can report an empty IP address depending on networking mode. Published ports should generally be accessed through the host port, as the post already demonstrates with `curl http://localhost:8080`.
