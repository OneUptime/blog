# Validation Summary: How to Use Ansible to Manage Podman Compose Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Podman
- Podman Compose
- Podman pods
- Podman Quadlet and systemd user services
- Rootless containers
- Container registry authentication

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman Compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman systemd / Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Ansible containers.podman collection index: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/index.html
- Ansible podman_pod module: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Ansible podman_container module: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible podman_quadlet module: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_quadlet_module.html
- Ansible systemd_service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The introduction said Podman runs containers without root privileges by default. Podman supports rootless containers when run by a non-root user, but it can also run rootful containers when invoked as root. Updated the wording to avoid implying every Podman invocation is rootless by default.
- The introduction described Podman as fully compatible with Docker images and Dockerfiles. Updated the wording to say Podman is compatible with Docker and OCI images and supports Dockerfiles, which is more precise.
- The systemd section used `podman generate systemd`, which current Podman documentation marks as deprecated and recommends replacing with Quadlet files. Replaced the example with Ansible-managed Quadlet `.pod` and `.container` files, `containers.podman.podman_quadlet`, and `ansible.builtin.systemd_service`.
- The systemd service name in the old example used `pod-{{ pod_name }}`. Quadlet pod units generate a service named `{{ pod_name }}-pod.service` by default, while container units generate service names from their `.container` filenames, so the service task was updated accordingly.

## Review Notes
- The `podman-compose` examples use command tasks and mark them changed unconditionally. They are technically valid, but native Ansible modules or more precise change detection would improve idempotency in a future revision.
- Package availability for `podman-compose` varies by distribution and enabled repositories. The package names are plausible, but production roles should account for distribution version differences.
