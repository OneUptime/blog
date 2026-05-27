# Validation Summary: How to Use Ansible to Connect to Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible community.docker collection
- Docker containers
- Docker CLI and remote Docker daemons
- Ansible dynamic inventory
- YAML and INI inventory configuration

## Sources Consulted
- Ansible community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- Ansible community.docker.docker_api connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_api_connection.html
- Ansible community.docker.docker_containers inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_containers_inventory.html
- Ansible Docker Guide: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docsite/scenario_guide.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible installation and managed node requirements: https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html
- Docker CLI exec reference: https://docs.docker.com/engine/reference/commandline/exec/

## Issues Found
- The post said `community.docker.docker` uses the Docker API. It actually uses the Docker CLI; `community.docker.docker_api` is the plugin that talks directly to the Docker daemon API. Updated the explanation and Mermaid diagram.
- The remote-host explanation described an Ansible SSH hop followed by Docker API access. Updated it to describe passing Docker CLI remote-daemon arguments such as `-H ssh://...` through `ansible_docker_extra_args`.
- The local-container example installed only `curl` when Python was missing, then used the `copy` module, which requires Python. Updated the check and install task so Python and curl are installed when needed.
- The remote-container playbook omitted `gather_facts: false`, which could trigger fact gathering before Python availability is established. Added it to match the command-only example.
- The dynamic inventory example used `docker_inventory.yml`, but the official plugin requires filenames ending in `docker.yml` or `docker.yaml`. Renamed the example to `inventory.docker.yml` and updated the test command.
- The dynamic inventory `filters` example used unsupported `status: running` syntax. Replaced it with documented include/exclude filter expressions using `docker_state.Running`.
- The dynamic inventory `compose` value for `ansible_connection` needed to be a literal Jinja expression. Quoted it as `"'community.docker.docker'"`.
- The debugging example used `ansible.builtin.command` with shell redirection and a pipe. Replaced that task with `ansible.builtin.shell`, as the command module does not process shell metacharacters.
- The limitations section claimed both `raw` and `command` work without Python. Corrected it: `raw` does not require Python, while most Ansible modules, including `command`, require Python on the managed node/container.

## Review Notes
Some examples still assume Debian/Ubuntu-style containers with `apt-get` and paths such as `/etc/nginx`, which is acceptable for illustrative examples but should be called out if the article is later expanded for non-Debian images.
