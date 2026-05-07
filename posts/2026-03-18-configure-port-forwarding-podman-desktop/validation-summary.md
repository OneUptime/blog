# Validation Summary: How to Configure Port Forwarding in Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Container networking
- Port publishing / forwarding
- Podman pods
- Kubernetes `kubectl port-forward`
- NGINX, Node.js, PostgreSQL, Alpine Linux

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman Desktop container start documentation: https://podman-desktop.io/docs/containers/starting-a-container
- Podman Desktop Kubernetes port forwarding documentation: https://podman-desktop.io/docs/kubernetes/port-forwarding
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Podman Desktop running a pod using a container or docker file tutorial: https://podman-desktop.io/tutorial/running-a-pod-using-a-container-docker-file

## Issues Found
- `podman ps --filter "publish=8080"` used an unsupported `podman ps` filter. Replaced it with `podman ps --format "{{.Names}}\t{{.Ports}}" | grep 8080`, which uses the documented `.Ports` format placeholder to inspect published ports.
- `podman exec web ss -tlnp` assumes `ss` is available in the `nginx:alpine` container. Updated the command to install `iproute2` before running `ss`.
- `podman exec web curl -s localhost:80` assumes `curl` is available in the `nginx:alpine` container. Replaced it with BusyBox `wget`, which is available in Alpine-based images.

## Review Notes
The Podman `-p/--publish` syntax, default TCP behavior, UDP syntax, random host port behavior, pod-level publishing model, and `kubectl port-forward --address` examples match current official documentation. Podman Desktop UI wording can vary by release, but the documented workflow supports configuring port mappings when creating containers from images and opening exposed ports from container details.
