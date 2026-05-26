# Validation Summary: How to Use Ansible to Deploy Applications with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Docker Engine
- Docker Compose
- Docker Compose Specification
- Docker Registry authentication
- PostgreSQL
- Redis
- Nginx
- Node.js
- Ansible Vault

## Sources Consulted
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Ansible `community.docker.docker_compose_v2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible `community.docker` Docker guide: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docsite/scenario_guide.html
- Ansible `ansible.builtin.apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html

## Issues Found
- The introduction claimed the playbook handled rolling updates, but the shown playbook performs repeatable Compose updates rather than a rolling deployment strategy. Changed "rolling updates" to "repeatable updates."
- The diagram and Compose file exposed port 443 even though the Nginx configuration only listened on port 80 and had no TLS certificate configuration. Removed the 443 reference and mapping.
- The Docker installation role used `ansible.builtin.apt_key`, which relies on deprecated `apt-key` behavior. Replaced it with a keyring file under `/etc/apt/keyrings` and a `signed-by` APT repository entry, matching Docker's current Ubuntu installation guidance.
- The role installed the legacy `docker-compose` Python package. Removed it and used the Docker Compose plugin plus the Compose v2 Ansible module instead.
- The role installed Docker SDK dependencies with system `pip`, which can fail on modern externally managed Python installations. Replaced `python3-pip` with the Ubuntu `python3-docker` package for the remote Ansible Docker modules used in the post.
- The Compose template used the obsolete top-level `version: "3.8"` field. Removed it so the example follows the current Compose Specification behavior.
- The app healthcheck depended on `curl` being present in the application image. Replaced it with a Node.js-based HTTP check, which better matches the stated Node.js application stack.
- The deployment task used a raw `docker compose up` command with fragile change detection. Replaced it with `community.docker.docker_compose_v2`, which is the current Ansible module for Docker Compose v2 projects.

## Review Notes
The tutorial is technically relevant and salvageable. It still uses a simplified single-host Compose pattern; future improvements could add true rolling deployment behavior with Ansible `serial`, load balancer draining, or a scheduler/orchestrator if the article wants to cover zero-downtime multi-host updates.
