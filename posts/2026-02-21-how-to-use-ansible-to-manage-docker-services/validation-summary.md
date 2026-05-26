# Validation Summary: How to Use Ansible to Manage Docker Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker collection
- Docker Engine
- Docker containers
- Docker networks
- Docker images
- Docker Swarm services
- Docker Compose v2
- Redis
- PostgreSQL

## Sources Consulted
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible `community.docker.docker_network` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible `community.docker.docker_swarm` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_module.html
- Ansible `community.docker.docker_swarm_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_service_module.html
- Ansible `community.docker.docker_compose_v2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible `community.docker.docker_prune` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible `ansible.builtin.deb822_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Swarm mode documentation: https://docs.docker.com/engine/swarm/
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker Compose documentation: https://docs.docker.com/compose/
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The prerequisites incorrectly said the Docker SDK for Python is required. Current `community.docker` module documentation says most modules use Docker API code included in the collection, while `docker_compose_v2` calls the Docker CLI directly. Updated the prerequisite text and replaced the `pip: docker` install with distribution Python dependencies.
- The Docker installation snippet used the old `apt_key`/classic `apt_repository` approach and did not install the Compose v2 plugin required later in the article. Replaced it with `ansible.builtin.deb822_repository`, added `python3-debian`, and installed `docker-buildx-plugin` and `docker-compose-plugin` in line with Docker's current Ubuntu instructions.
- The Redis container example set `REDIS_PASSWORD`, which the Redis Docker Official Image does not use to configure authentication. Changed the command to pass `--requirepass`.
- The Swarm service example nested CPU and memory settings under `resources`, but `community.docker.docker_swarm_service` expects `limits` and `reservations` as top-level module options. Updated the snippet accordingly.
- The rolling update description claimed `start-first` gives zero-downtime deployments. Changed the wording to say it can help achieve zero downtime when the application can safely run overlapping instances.
- The Compose section called the deployment a stack, which is Swarm terminology, while `docker_compose_v2` manages Compose projects. Updated the wording to "Compose project."
- The Compose debug task referenced `compose_output.services`, but the module returns `containers` and `actions`, not `services`. Changed it to `compose_output.containers`.

## Review Notes
All YAML code blocks parse successfully after the edits. The article remains a broad tutorial, not a hardened production guide; future improvements could cover Docker secrets for sensitive values and replacing legacy container links with explicit user-defined networks throughout.
