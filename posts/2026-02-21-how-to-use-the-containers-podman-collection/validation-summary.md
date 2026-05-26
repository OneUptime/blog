# Validation Summary: How to Use the containers.podman Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- containers.podman Ansible collection
- Podman containers, images, pods, networks, volumes, and registry login
- systemd user and system services
- Rootless Podman
- SELinux volume labeling

## Sources Consulted
- Ansible Community Documentation: containers.podman collection index, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/index.html
- Ansible Community Documentation: containers.podman.podman_container module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible Community Documentation: containers.podman.podman_image module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html
- Ansible Community Documentation: containers.podman.podman_network module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_network_module.html
- Ansible Community Documentation: containers.podman.podman_pod module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Ansible Community Documentation: containers.podman.podman_volume module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_volume_module.html
- Ansible Community Documentation: containers.podman.podman_generate_systemd module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_generate_systemd_module.html
- Ansible Community Documentation: containers.podman.podman_login module, https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_login_module.html
- Podman documentation: podman-generate-systemd, https://docs.podman.io/en/v4.4/markdown/podman-generate-systemd.1.html
- Podman documentation: podman-network-create, https://docs.podman.io/en/stable/markdown/podman-network-create.1.html

## Issues Found
- The rootless systemd example generated a new user unit and then started it without reloading the user systemd manager. Added `daemon_reload: true` to the `ansible.builtin.systemd` task so systemd notices the newly generated unit before enabling and starting it.
- The practical tip for `new: true` claimed it ensures the latest image is always used. Podman-generated units with `new: true` recreate containers from the generated command, but they do not by themselves guarantee that a newer remote image has been pulled. Updated the wording to say images must be pulled or rebuilt explicitly for image updates.

## Review Notes
The collection examples use current module names and supported parameters in the official containers.podman documentation. The local environment did not include `ansible-doc` or `ansible-galaxy`, so validation used official online documentation rather than local command help.
