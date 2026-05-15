# Validation Summary: How to Manage Containers Using the Podman RHEL System Role on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Podman
- Podman Quadlet
- Ansible playbooks and inventory
- Ansible Vault
- containers.podman Ansible collection
- systemd-managed containers

## Sources Consulted
- Red Hat RHEL 9 documentation: Managing containers by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/managing-containers-by-using-the-podman-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Linux System Roles podman role README: https://github.com/linux-system-roles/podman
- Podman Quadlet unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Ansible containers.podman.podman_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html

## Issues Found
- The playbook examples used `rhel-system-roles.podman` as the role name. Current Red Hat documentation uses the fully qualified collection role name `redhat.rhel_system_roles.podman`, so the examples were updated to use that role name.
- The rootless container example used `become_user: appuser`. The podman role expects rootless ownership to be expressed with `podman_run_as_user`, and the user must already exist with subordinate UID/GID mappings. The example was corrected to use `podman_run_as_user: appuser`.
- The registry authentication example used a non-documented `podman_registry_logins` variable. The role documents `podman_registry_username`/`podman_registry_password` for a single registry and `podman_credential_files` for auth file management. The example was changed to create a containers `auth.json` credential file through `podman_credential_files`.
- The inline Quadlet examples were changed to documented `file_content` Quadlet units with `[Container]`, `[Network]`, `[Volume]`, `[Kube]`, `[Service]`, and `[Install]` sections, matching Podman Quadlet syntax and the role's documented inline-file workflow.
- The multi-container dependency example referenced `database.service`. Podman Quadlet documents dependencies between Quadlet units using the source Quadlet unit name, so this was corrected to `database.container`.
- The verification playbook used `--format "{{.Status}}"`, which Ansible would parse as a Jinja expression and fail on. The Go-template string was escaped as `{{ '{{.Status}}' }}` so Ansible passes it through to Podman.

## Review Notes
All embedded YAML playbook bodies were parsed successfully with PyYAML after the edits. `ansible-playbook` is not installed in this workspace, so an Ansible syntax check could not be run locally.
