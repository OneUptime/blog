# Validation Summary: How to Use Ansible docker_container Module with Port Mapping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker.docker_container
- community.docker.docker_container_info
- community.docker.docker_network
- Docker port publishing
- Docker bridge networking
- YAML

## Sources Consulted
- Ansible Community Documentation: community.docker.docker_container module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible Community Documentation: community.docker.docker_container_info module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_info_module.html
- Ansible Community Documentation: community.docker.docker_network module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible Community Documentation: ansible.builtin.wait_for module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible Community Documentation: ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Docker Docs: Publishing and exposing ports: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker Docs: Port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker CLI Reference: docker container run: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The post said that, without port mapping, container ports are only accessible from other containers on the same Docker network. Docker's bridge-network documentation says unpublished container ports can also be accessible from the Docker host and containers on the same network, but are not published on the host interfaces. The explanation was updated to reflect that distinction.
- The "Using the Published Ports Parameter" section used `published_ports: [all]`. Current `community.docker.docker_container` documentation says the `all` value was removed in community.docker 3.0.0 and instructs users to use `publish_all_ports` instead. The example and surrounding sentence were updated to use `publish_all_ports: true`.

## Review Notes
The remaining port mapping examples use valid Docker CLI-style syntax accepted by `community.docker.docker_container`, including host-to-container mappings, interface binding, dynamic host-port assignment, UDP mappings, and port ranges. The post uses `ports`, which is documented as an alias of `published_ports` and remains valid.
