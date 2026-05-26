# Validation Summary: How to Install AWX on Docker Compose

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- AWX 24.2.0
- Ansible
- Docker Engine
- Docker Compose V2
- PostgreSQL
- Redis
- Nginx reverse proxy
- Bash backup and restore commands

## Sources Consulted
- AWX 24.2.0 Docker Compose development README: https://github.com/ansible/awx/blob/24.2.0/tools/docker-compose/README.md
- AWX 24.2.0 Docker Compose inventory: https://github.com/ansible/awx/blob/24.2.0/tools/docker-compose/inventory
- AWX 24.2.0 Docker Compose template: https://github.com/ansible/awx/blob/24.2.0/tools/docker-compose/ansible/roles/sources/templates/docker-compose.yml.j2
- AWX 24.2.0 Makefile Docker Compose targets: https://github.com/ansible/awx/blob/24.2.0/Makefile
- AWX 24.2.0 development bootstrap script: https://github.com/ansible/awx/blob/24.2.0/tools/docker-compose/bootstrap_development.sh
- Docker Compose plugin installation documentation: https://docs.docker.com/compose/install/linux/

## Issues Found
- The post described Docker Compose as viable for small-scale production. AWX 24.2.0 documents this Docker Compose path as a development environment, so the wording was changed to development and testing.
- The prerequisites omitted Ansible and OpenSSL, both listed by the AWX Docker Compose documentation. These were added.
- The inventory example used unsupported or ignored variables such as `compose_project_name`, `host_port`, `host_port_ssl`, and `project_data_dir`. The example was replaced with AWX 24.2.0 inventory variables used by the official tooling.
- The Makefile instructions started AWX in the foreground. The command was updated to include `COMPOSE_UP_OPTS=-d` when starting in detached mode.
- The direct Docker Compose workflow referenced a non-existent `provision.yml`, changed directories unnecessarily, and ran `docker compose up` against the wrong file. It now renders `tools/docker-compose/_sources/docker-compose.yml` with the documented Ansible playbook and starts that generated file.
- The standalone manual `docker-compose.yml` used unsupported assumptions for AWX 24.2.0, including separate `awx-web` and `awx-task` services and direct use of `quay.io/ansible/awx:24.2.0`. It was replaced with guidance to use the AWX repository tooling.
- The architecture diagram showed AWX web/task containers and port 8080. It now reflects the AWX development container and the default 8013/8043 ports.
- The migration and admin commands used incorrect container names and implied migrations must be run manually. The section now explains that startup runs migrations, adds the documented UI build command, and uses `tools_awx_1`.
- The access URL was incorrect. AWX Docker Compose development exposes the UI at `https://localhost:8043/#/home`.
- The Nginx reverse proxy example pointed to the removed `awx-web:8052` service and did not join the AWX network. It now uses the AWX network and proxies to `tools_awx_1` on port 8013.
- Backup, restore, monitoring, troubleshooting, and upgrade commands referenced incorrect service and container names. These were corrected to use `tools_awx_1`, `tools_postgres_1`, `tools_redis_1`, and `tools/docker-compose/_sources/docker-compose.yml`.

## Review Notes
The AWX Docker Compose workflow is version-specific and intended for development. Future updates should re-check the tagged AWX repository before changing image tags, container names, ports, or inventory variables.
