# Validation Summary: How to Use Ansible to Migrate Applications to Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules
- community.docker Ansible collection
- community.general Ansible collection
- Docker and Dockerfiles
- Node.js container builds
- Python container builds
- Linux service and network inspection commands

## Sources Consulted
- Ansible command module documentation: https://ansible.readthedocs.io/projects/ansible-core/devel/collections/ansible/builtin/command_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible synchronize module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible playbook tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- community.docker docker_image module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker docker_container module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- community.general timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Dockerfile reference: https://docs.docker.com/reference/builder
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The analysis tasks used `command` with shell pipelines. Ansible's command module does not process shell metacharacters such as `|`, so those tasks would not work as written. Changed those tasks to use `shell`.
- The build tasks used `synchronize` to copy `/opt/...` application sources into a build directory on the managed host. The synchronize module originates on the controller by default, which is not correct for copying an existing remote application directory into a remote Docker build context. Changed the task to `copy` with `remote_src: true` and `mode: preserve`.
- The generated Dockerfile used `curl` in `HEALTHCHECK` without installing `curl`. Added package installation for Alpine and Debian-based images before the health check is defined.
- The Node.js Dockerfile template used `npm ci --production`. Updated it to the current `npm ci --omit=dev` form documented by npm.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current Ansible documentation provides this as `community.general.timezone`. Updated the module name.

## Review Notes
The Docker image build and container deployment module options are current according to the community.docker documentation. The Dockerfile template is intentionally generic and may still need application-specific changes, such as the correct Node.js entrypoint or Python WSGI module, for a real migration.
