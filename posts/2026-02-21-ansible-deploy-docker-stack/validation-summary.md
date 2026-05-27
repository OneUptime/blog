# Validation Summary: How to Use Ansible to Deploy Docker Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker Swarm
- Docker Stack
- Docker Compose file version 3
- Docker secrets
- YAML and Jinja2 templates

## Sources Consulted
- Ansible community.docker.docker_stack module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_stack_module.html
- Ansible community.docker.docker_secret module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_secret_module.html
- Docker CLI documentation for docker stack deploy: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker documentation for deploying a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm secrets documentation: https://docs.docker.com/engine/swarm/secrets/

## Issues Found
- The prerequisites listed only the Swarm cluster and `community.docker` collection. The `community.docker.docker_stack` module also requires the Docker CLI, `jsondiff`, and `PyYAML` on the host executing the module, and the `community.docker.docker_secret` module requires the Docker SDK for Python. Updated the prerequisites and install command to include those dependencies.
- The stack health check asserted only that a service did not have `0/` running replicas, which would pass partially converged services such as `1/3`. Updated the assertion to require running replicas to equal desired replicas.
- The health check labeled `desired-state=shutdown` task output as failed tasks. Docker's shutdown task state can include old tasks from normal rolling updates, not only failures. Updated the task names, variable names, formatted output, and message to report shutdown tasks accurately.

## Review Notes
Docker's current stack documentation notes that `docker stack deploy` uses the legacy Compose file version 3 format, even though the broader Compose Specification has evolved. The post's Compose file is appropriate for Docker Stack usage.
