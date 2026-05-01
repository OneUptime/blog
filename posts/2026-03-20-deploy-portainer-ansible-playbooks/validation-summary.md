# Validation Summary: How to Deploy Portainer Using Ansible Playbooks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Ansible
- Ansible Vault
- Docker Engine
- Docker Compose

## Sources Consulted
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Docs, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docs, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Docs, Add an environment via the Portainer API: https://docs.portainer.io/2.27/admin/environments/add/api
- Portainer Docs, Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Docs, Specify the license at the command line: https://docs.portainer.io/faqs/licensing/is-there-a-way-to-specify-the-license-at-the-command-line
- Portainer source, system handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/system/handler.go
- Portainer source, system status handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/system/status.go
- Portainer source, admin init handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/admin_init.go
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Docs, Install Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Ansible Docs, `community.docker.docker_compose_v2` module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible Docs, `community.docker.docker_container` module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible Docs, `community.docker.docker_image` module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible Docs, `ansible.builtin.apt_key` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible Docs, `ansible-playbook` CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Docs, check mode and diff mode: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html

## Issues Found
- The prerequisite list claimed CentOS 9 support, but the Docker installation role only handled Debian-family package management and Ubuntu repository URLs. I corrected the supported target OS list to Ubuntu 22.04 and Debian 12.
- The Docker role used the deprecated `apt_key` pattern. Current Ansible documentation recommends keyring-based repository setup instead, so I replaced it with `/etc/apt/keyrings/docker.asc` plus `signed-by=...` repository configuration.
- The post omitted the required `community.docker` Ansible collection even though the playbooks use `community.docker` modules. I added the collection prerequisite and install command.
- The Docker-related Ansible modules require Python HTTP dependencies on the target host. I added `python3-requests` to the Docker role so the example can actually run with the shown interpreter path.
- The post pinned `portainer_version` to `2.19.4`, which is stale relative to current Portainer installation guidance. I updated the example to use the upstream-supported `lts` tag instead.
- The Portainer role referenced `Restart Docker` and `Deploy Portainer` handlers that were never defined in the post. I removed the undefined notifications and replaced the Docker restart with inline conditional logic.
- The Compose template used the obsolete top-level `version` field. Current Compose documentation marks that field as obsolete, so I removed it.
- The Compose template had an Edge-related block that introduced a second `ports:` key and an inaccurate server command example. I removed that incorrect optional block.
- The post said it covered Business Edition, but the snippets only showed Community Edition. I made the claim accurate by clarifying the text and adding the documented `PORTAINER_LICENSE_KEY` option plus the `portainer-ee` image switch.
- The Portainer Agent example used `portainer/agent:latest`, which can drift away from the server version. I changed it to track `portainer_version` so the agent and server stay aligned.
- The Portainer Agent example set `AGENT_CLUSTER_ADDR=tasks.portainer_agent`, which is a Swarm-specific setting and incorrect for the standalone `docker_container` deployment shown. I removed that environment variable.
- The command examples mixed an Ansible Vault project layout with a HashiCorp Vault CLI example and omitted the vault flag needed for `group_vars/vault.yml`. I updated the commands to use `--ask-vault-pass`, which matches the post's Ansible Vault structure.
- The dry-run command would have been unreliable because the readiness and admin-init `uri` tasks would still execute in check mode. I skipped those tasks when `ansible_check_mode` is active.

## Review Notes
- Portainer's current documentation describes the traditional Portainer Agent on Docker Standalone as a legacy option and recommends the Edge Agent for most modern remote deployments. The post remains technically valid for directly reachable agent hosts over port `9001`.
- The updated post still publishes port `9000` because it uses that legacy HTTP endpoint for local health and admin initialization calls. This is technically valid, but a future revision could move the example to HTTPS on `9443` only.
- I did not execute the Ansible playbooks in this workspace because the repository contains the article source, not a runnable playbook project. Validation was done against official documentation and Portainer's official source code.
