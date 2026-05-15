# Validation Summary: How to Manage Podman Containers with Ansible on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Ansible
- containers.podman Ansible collection
- systemd
- Rootless containers
- Podman pods and networks

## Sources Consulted
- Ansible Community Documentation: containers.podman collection index, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/index.html
- Ansible Community Documentation: containers.podman.podman_container module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible Community Documentation: containers.podman.podman_generate_systemd module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_generate_systemd_module.html
- Ansible Community Documentation: containers.podman.podman_image module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html
- Ansible Community Documentation: containers.podman.podman_network module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_network_module.html
- Ansible Community Documentation: containers.podman.podman_pod module, https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/
- Podman documentation: podman-generate-systemd, https://docs.podman.io/en/v4.4/markdown/podman-generate-systemd.1.html
- Podman documentation: podman-pod-create, https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html

## Issues Found
- The introduction implied that the same Ansible modules work for both Docker and Podman because the CLIs are similar. Podman support is provided by the dedicated `containers.podman` collection, so the wording now says Docker CLI concepts translate to Podman while Ansible uses the Podman collection.
- The systemd examples used `new: true` with containers already in `state: started`. The `podman_generate_systemd` module documentation says `new: true` generates units that create containers, and its example uses a created container with `rm: true` for idempotence. Updated the rootless and systemd examples to create the containers with `state: created` and `rm: true` before generating the unit.
- The systemd example used unsupported `podman_generate_systemd` parameters `time` and `names`. The current module parameters are `stop_timeout` and `use_names`. Updated the snippet accordingly.

## Review Notes
- `podman generate systemd` remains documented and supported by the Ansible module, but current Red Hat guidance increasingly highlights Quadlet workflows for persistent systemd-managed containers. The post is still technically useful because it explicitly demonstrates the `containers.podman.podman_generate_systemd` module.
- The rootless systemd handler may require a valid user systemd session and, for boot-time startup without login, user lingering. The snippet is valid as a minimal example, but production automation should account for those host-level prerequisites.
