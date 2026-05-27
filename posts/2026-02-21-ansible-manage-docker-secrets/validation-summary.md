# Validation Summary: How to Use Ansible to Manage Docker Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker Swarm
- Docker secrets
- Docker CLI
- Python
- YAML

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets: https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: docker secret inspect: https://docs.docker.com/reference/cli/docker/secret/inspect/
- Docker Docs: docker secret ls: https://docs.docker.com/reference/cli/docker/secret/ls/
- Docker Docs: docker service ls: https://docs.docker.com/reference/cli/docker/service/ls/
- Docker Docs: docker service inspect: https://docs.docker.com/reference/cli/docker/service/inspect/
- Ansible Community Documentation: community.docker.docker_secret module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_secret_module.html
- Ansible Community Documentation: community.docker.docker_swarm_service module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_swarm_service_module.html
- Ansible Community Documentation: ansible.builtin.slurp module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible Community Documentation: ansible.builtin.command module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The cleanup playbook referenced `service_list.stdout_lines` without first registering `service_list`. Added a `docker service ls --format "{{.Name}}"` task before the service inspection loop so the example can run as written.

## Review Notes
- Docker secrets are a Swarm service feature and are encrypted in transit and at rest in the Swarm Raft log; on Linux, granted secrets are mounted into containers on an in-memory filesystem under `/run/secrets/` by default.
- The `community.docker.docker_secret` examples use current parameters such as `name`, `data`, `state`, and `force`. The module can also read a target-side file via `data_src`, but the post's `slurp` approach is valid when reading local controller files and passing their decoded content.
- Docker secrets are immutable at the Docker API level. The post's rotation pattern of creating a versioned secret and updating the service to use it is consistent with Docker's documented approach.
- The `community.docker.docker_swarm_service` secret fields shown (`secret_name`, `filename`, `uid`, `gid`, and `mode`) match the current module documentation.
