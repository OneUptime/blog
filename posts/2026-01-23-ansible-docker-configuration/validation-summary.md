# Validation Summary: How to Configure Ansible for Docker

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker Engine
- Docker containers, images, networks, and volumes
- Docker Compose V2
- Dockerfile / Node.js container builds
- Ubuntu APT package management

## Sources Consulted
- Ansible community.docker collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker.docker_compose_v2 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- community.docker.docker_compose_v2_pull module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_pull_module.html
- community.docker.docker_host_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_host_info_module.html
- community.docker.docker_network module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Docker Engine installation documentation for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- npm CLI documentation for `npm ci`: https://docs.npmjs.com/cli/commands/npm-ci

## Issues Found
- The installation section said the Docker SDK for Python was required by the modules and used `pip install docker`. Current community.docker modules documented here require `requests` for Docker API modules, while Compose V2 modules call the Docker CLI directly. Changed the dependency command to `pip install requests` and kept the Compose V2 CLI note.
- The Ubuntu Docker repository setup used `apt_key`, which relies on the deprecated apt-key workflow. Updated the playbook to create `/etc/apt/keyrings`, download Docker's GPG key there, and reference it with `signed-by` in the APT repository definition.
- The `daemon.json.j2` snippet included a `//` comment inside a JSON file. Removed the invalid JSON comment and marked the block as a Jinja template.
- The container example attached the application container to `app_network` without creating the network first, and Redis was not on that network. Added a network creation task and attached Redis to the same network so `redis://redis:6379` can resolve on a user-defined Docker network.
- The build version expression did not fall back to `latest` when `BUILD_VERSION` was set to an empty string. Updated the Ansible `default` filter to use `default('latest', true)`.
- The "Tag image as latest" task did not actually create a `latest` tag. Updated it to tag `{{ version }}` as `:latest` with `source: local` and `force_tag: yes`, matching the module's documented tagging pattern.
- The Dockerfile used `npm ci --only=production`, which is superseded by `npm ci --omit=dev`. Updated the command to the current npm form.
- The volume display task assumed a mountpoint field from `docker_host_info` output. Adjusted the debug message to use the volume name and driver, which align with the volume list data shape.
- The Compose "Pull images" task used `docker_compose_v2` with `state: present`, which maps to `docker compose up` rather than a pull-only operation. Replaced it with `community.docker.docker_compose_v2_pull` and `policy: always`.
- The unhealthy-container restart task passed container names with a leading slash from Docker inspection output. Added the same leading-slash normalization used by the earlier info task.

## Review Notes
The examples are broadly accurate after these fixes. The Docker install playbook remains Ubuntu-specific and uses `arch=amd64`; it would need additional logic for multi-architecture hosts. The Docker Compose V2 Ansible modules depend on Docker Compose CLI plugin behavior, and the upstream module documentation notes that Compose output behavior can vary between plugin versions.
