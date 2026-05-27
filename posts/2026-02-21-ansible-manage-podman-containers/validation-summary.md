# Validation Summary: How to Use Ansible to Manage Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- containers.podman Ansible collection
- Podman
- Linux containers
- systemd user services
- Podman networking

## Sources Consulted
- Ansible `containers.podman` collection index: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/index.html
- Ansible `containers.podman.podman_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible `containers.podman.podman_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html
- Ansible `containers.podman.podman_network` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_network_module.html
- Ansible `containers.podman.podman_generate_systemd` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_generate_systemd_module.html
- Ansible `containers.podman.podman_container_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_info_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Podman documentation, "What is Podman?": https://docs.podman.io/
- Podman `podman-generate-systemd` documentation: https://docs.podman.io/en/stable/markdown/podman-generate-systemd.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The post described Podman as "rootless by default." Podman can run rootful or rootless depending on the invoking user, so this was changed to "rootless operation" and "rootless operation as a regular user."
- The systemd section presented generated systemd units as the primary current workflow. Podman's official documentation marks `podman generate systemd` as deprecated and recommends Quadlet files for new workflows, so the text now notes that generated units are still usable but Quadlet is recommended for new systemd-managed container workflows.
- The `podman_generate_systemd` example used `time: 30`, which is not a current module parameter. It was changed to `stop_timeout: 30`, matching the documented module parameter.
- The `podman_generate_systemd` example used `new: true` without `rm: true` on the created container. The Ansible module documentation states that containers need `rm: true` for idempotence when generating units with `new: true`, so `rm: true` was added.
- The user-scoped systemd tasks used the older `ansible.builtin.systemd` alias and omitted `XDG_RUNTIME_DIR`. The examples now use `ansible.builtin.systemd_service` and set `XDG_RUNTIME_DIR` for `scope: user`, matching the current Ansible documentation.

## Review Notes
The remaining examples use valid `containers.podman` module names and parameters according to the current Ansible documentation. The generated-systemd workflow is still documented and has no announced removal plan, but future updates should consider adding a Quadlet-based example because that is Podman's recommended systemd integration path for new work.
