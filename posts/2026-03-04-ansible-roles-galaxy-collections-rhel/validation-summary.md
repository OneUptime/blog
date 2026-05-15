# Validation Summary: How to Use Ansible Roles and Galaxy Collections for RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy
- Ansible collections
- RHEL automation
- Ansible playbooks and YAML configuration
- `ansible.builtin`, `ansible.posix`, `community.general`, `containers.podman`, and `redhat.rhel_system_roles` collections/modules

## Sources Consulted
- Ansible `ansible-galaxy` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible collections installation guide: https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html
- Ansible collection structure documentation: https://docs.ansible.com/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible collection Galaxy metadata documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- `ansible.builtin.systemd` / `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- `ansible.posix.selinux` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/selinux_module.html
- `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `containers.podman.podman_container` module documentation: https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_container_module.html

## Issues Found
- The role creation example used `ansible-galaxy role init roles/rhel_base`. Current `ansible-galaxy role init` expects a role name and provides `--init-path` for the destination directory, so this was changed to `ansible-galaxy role init rhel_base --init-path roles`.
- The collection section described `ansible-galaxy collection list` as a search command. The official CLI documentation defines it as listing installed collections, so the comment was changed to "List installed collections."

## Review Notes
- The `ansible.builtin.systemd` examples are still valid because the name redirects to `ansible.builtin.systemd_service` for backward compatibility, though new examples could use `ansible.builtin.systemd_service` directly.
- The mixed `requirements.yml` example is valid with `ansible-galaxy install -r requirements.yml`; official documentation notes that `ansible-galaxy collection install -r` and `ansible-galaxy role install -r` install only their respective content types.
