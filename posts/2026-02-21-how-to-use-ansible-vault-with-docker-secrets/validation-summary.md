# Validation Summary: How to Use Ansible Vault with Docker Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Vault
- Docker Secrets
- Docker Swarm
- Docker Stack
- Docker Compose file syntax
- Python
- PostgreSQL Docker Official Image
- Redis Docker Official Image

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets: https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: docker secret CLI reference: https://docs.docker.com/reference/cli/docker/secret/
- Docker Docs: Compose file secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker Docs: Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Ansible Documentation: community.docker.docker_secret module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_secret_module.html
- Ansible Documentation: community.docker.docker_stack module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_stack_module.html
- Ansible Documentation: community.docker.docker_swarm module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_swarm_module.html
- Ansible Documentation: ansible-vault CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Documentation: loops and loop_control label: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Docker Blog: How to Use the Postgres Docker Official Image: https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/

## Issues Found
- The Docker secret rotation example updated only `myapp_app`, but the sample stack also mounted `db_password` into `myapp_db`. Because Docker cannot remove a secret while any running service still uses it, the old secret removal step would fail. I added a `services_using_secret` list and looped over both services before removing the old secret.
- The Swarm bootstrap role referenced `hostvars[groups['swarm_managers'][0]]['swarm_worker_token']`, but no earlier task created that variable. I registered the `community.docker.docker_swarm` initialization result and changed the worker join task to read the worker token from `swarm_result.swarm_facts.JoinTokens.Worker`, matching the module return values.

## Review Notes
- The Compose snippet uses `version: "3.8"`. Docker Compose now treats the top-level `version` field as obsolete, but Docker's `docker stack deploy` documentation still notes that Swarm stack deploy uses the legacy Compose v3 format. Since this post is specifically about Docker Swarm stacks, the example remains acceptable.
- The post correctly uses `external: true` for secrets in the stack file because the secrets are created by Ansible before stack deployment.
