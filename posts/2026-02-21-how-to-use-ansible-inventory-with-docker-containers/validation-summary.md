# Validation Summary: How to Use Ansible Inventory with Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible dynamic inventory scripts
- Ansible connection plugins
- Docker containers and Docker CLI
- Docker Compose
- community.docker collection
- community.postgresql collection

## Sources Consulted
- Ansible community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- Ansible community.docker.docker_containers inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_containers_inventory.html
- Ansible dynamic inventory development documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible YAML inventory plugin documentation: https://ansible.readthedocs.io/projects/ansible-core/2.17/collections/ansible/builtin/yaml_inventory.html
- Ansible raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible community.postgresql.postgresql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Docker container run CLI documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker container ls / ps CLI documentation: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker object labels documentation: https://docs.docker.com/engine/manage-resources/labels/

## Issues Found
- The post referred to the Docker connection plugin as `docker` and said it used the Docker API. Updated examples and explanation to use the current `community.docker.docker` plugin and to state that it uses the Docker CLI through `docker exec`.
- Several examples used `ansible_docker_extra_args` with `--user` / `-u` to select a user inside the container. Updated these to `ansible_user`, which maps to the connection plugin's remote user setting.
- The `community.docker.docker_containers` inventory plugin example used a non-documented `status` option. Replaced it with documented `filters` using `docker_state.Status == "running"` and added `connection_type: docker-cli`.
- The dynamic inventory script hand-built JSON in the Docker Go template. Replaced it with Docker's documented `docker ps --format json` output.
- The Docker Compose example included the obsolete top-level `version` field. Removed it.
- The dynamic inventory run example did not make the script executable. Added `chmod +x docker_inventory.py` before using it as an inventory source.
- The PostgreSQL task omitted its runtime requirement. Added a note that `community.postgresql.postgresql_db` requires the `community.postgresql` collection and a supported `psycopg` adapter in the database container.

## Review Notes
The `ansible.group` and `ansible.user` Docker label keys are technically usable, but Docker recommends reverse-DNS namespaced labels for third-party automation to avoid collisions. The examples keep the shorter labels for readability.
