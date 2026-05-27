# Validation Summary: How to Write Ansible Roles Following Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy CLI
- Ansible built-in modules
- Jinja2 templates
- nginx configuration
- Molecule role testing
- Docker-based test instances

## Sources Consulted
- Ansible Galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- ansible.builtin.include_tasks documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- ansible.builtin.template documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.apt_key documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- ansible.builtin.deb822_repository documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- ansible.builtin.systemd_service documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible handler documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Molecule documentation: https://ansible.readthedocs.io/projects/molecule/
- Molecule command line reference: https://ansible.readthedocs.io/projects/molecule/usage/
- Molecule systemd container guide: https://ansible.readthedocs.io/projects/molecule/guides/systemd-container/
- nginx Linux packages documentation: https://nginx.org/en/linux_packages.html

## Issues Found
- The role skeleton command used the older `ansible-galaxy init roles/nginx` form. Updated it to the current documented `ansible-galaxy role init nginx --init-path roles` syntax.
- The nginx repository example used `ansible.builtin.apt_key`, which relies on deprecated apt-key behavior. Replaced it with `ansible.builtin.deb822_repository` and a `signed_by` key URL, and added the required `python3-debian` prerequisite.
- The metadata example listed `min_ansible_version: "2.14"` while the corrected repository module requires ansible-core 2.15 or newer. Updated the minimum version to 2.15.
- The handler section said handlers should be idempotent and included a false comment that `state: reloaded` only reloads if nginx is already running. Ansible documents `reloaded` as an action that always reloads and starts the unit if it is not running, so the wording and example were corrected.
- The handler examples used the older `ansible.builtin.systemd` module name. Updated them to the current `ansible.builtin.systemd_service` FQCN.
- The variable precedence diagram omitted several high-precedence variable sources and could mislead readers. Updated the diagram to include role/include params, registered variables, `set_facts`, and `include_vars` in the documented order.
- The Molecule Docker example starts systemd-based containers but did not include the documented `/run`, `/tmp`, and cgroup settings. Added the minimal `tmpfs` and `volumes` entries shown in Molecule's systemd container guidance.

## Review Notes
The Molecule example still assumes the selected Docker images can run systemd as `/sbin/init` in the target environment. That is a common pattern, but teams may prefer purpose-built Ansible test images for faster and more predictable role tests.
