# Validation Summary: How to Create a Pod with Port Mappings in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Container networking
- Port publishing
- TCP and UDP port mappings

## Sources Consulted
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman pod ps documentation: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman pod inspect documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html

## Issues Found
- The statement "port publishing is configured at the pod level, not on individual containers" was too broad because containers outside pods can publish ports individually. Changed it to specify "for containers in a pod."
- The command `podman pod ls --format "{{.Name}} {{.Ports}}"` used `.Ports`, which is not listed as a valid `podman pod ps`/`podman pod ls` Go template placeholder in current official documentation. Replaced it with `podman ps --pod --format "{{.PodName}} {{.Names}} {{.Ports}}"`, which uses documented container-list placeholders for pod name, container name, and ports.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed directly. Validation was performed against official Podman documentation. The UDP example publishes UDP and TCP ports correctly, but the container shown only runs `sleep 3600`, so it demonstrates the mapping syntax rather than a working DNS service.
