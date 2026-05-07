# Validation Summary: How to Use Init Containers in a Podman Pod

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Init containers
- Container volumes
- Alpine Linux containers

## Sources Consulted
- Podman create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman pod start documentation: https://docs.podman.io/en/latest/markdown/podman-pod-start.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman volume create documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html

## Issues Found
- The examples used `podman run --init-ctr` as though init containers execute immediately and gate later `podman run` commands. Podman documentation states that init containers run on `podman pod start`, and they must be created while the pod is stopped. I changed the examples to use `podman create` for init and regular containers, then `podman pod start`.
- The first configuration example wrote to `/tmp/shared/config.ini` without creating the directory or mounting shared storage. I added a pod-level named volume and created the directory before writing the file.
- The database migration example started a database container inside the same pod before creating the init container. That conflicts with Podman's init-container lifecycle because regular containers start after init containers complete. I changed the example to describe an external database dependency and removed the same-pod database container.
- The configuration download example mounted the same named volume at the pod level and again on each container. I kept the pod-level mount, which Podman documents as shared with pod containers.
- The failure example used `podman run` directly for a failing init container. I changed it to create a stopped pod, create the failing init container and a regular container, then start the pod so the failure occurs during pod startup.

## Review Notes
Podman's `always` init-container type runs on `podman pod start`; Podman documentation separately notes that `podman pod restart` does not execute init containers.
