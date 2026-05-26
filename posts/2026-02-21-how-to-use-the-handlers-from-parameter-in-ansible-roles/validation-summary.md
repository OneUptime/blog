# Validation Summary: How to Use the handlers_from Parameter in Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible handlers
- `ansible.builtin.include_role`
- `ansible.builtin.systemd_service`
- `ansible.builtin.service`
- `community.docker.docker_container`
- `community.general.supervisorctl`
- Nginx service management

## Sources Consulted
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible handlers guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible roles guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible `systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `meta` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/meta_module.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Community Docker `docker_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Community General `supervisorctl` module documentation: https://docs.ansible.com/projects/ansible/12/collections/community/general/supervisorctl_module.html

## Issues Found
- Replaced `ansible.builtin.systemd` with `ansible.builtin.systemd_service` in the systemd examples. The Ansible documentation says `systemd` is retained as a backward-compatible alias, while `systemd_service` is the current fully qualified module name.
- Corrected the handler behavior note. The original text said handlers from `include_role` are scoped to the include. Ansible documents one global play-level handler scope; handlers from dynamically included roles are available at runtime only after the `include_role` task executes.
- Adjusted the handler timing wording from "run once at the end of the play" to "run once at each handler flush point." This matches Ansible's documented behavior: handlers are automatically flushed after sections such as `pre_tasks`, `roles`/`tasks`, and `post_tasks`, and can also be flushed with `meta: flush_handlers`.

## Review Notes
The remaining examples are technically consistent with the current official module documentation. The environment did not have the `ansible` CLI installed, so validation was performed against official documentation and by reviewing the YAML snippets for syntax and module parameter correctness.
