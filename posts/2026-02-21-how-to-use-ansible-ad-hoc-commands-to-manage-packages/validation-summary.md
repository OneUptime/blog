# Validation Summary: How to Use Ansible Ad Hoc Commands to Manage Packages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible package management modules
- Debian/Ubuntu APT package management
- RHEL/CentOS/Fedora YUM and DNF package management
- Python package management with pip
- APT and YUM repository configuration
- Snap package management

## Sources Consulted
- Ansible ansible CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible.html
- Ansible ad hoc command documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible pip module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible yum_repository module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible community.general.snap module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/snap_module.html
- Grafana Debian/Ubuntu installation documentation: https://grafana.com/docs/grafana/latest/installation/debian/
- PostgreSQL Red Hat family download documentation: https://www.postgresql.org/download/linux/redhat/

## Issues Found
- The post listed `snap` as though it were a built-in module. Changed it to `community.general.snap`, because the snap module is in the `community.general` collection, not `ansible-core`.
- The post said the generic `package` module only supports basic install/remove operations. Adjusted this to say it is best for portable basic install/remove operations, because the module proxies to the underlying package module and may support additional states such as `latest` when the backend supports them.
- The `upgrade=yes` and `upgrade=full` comments described exact `apt` command equivalents too strongly. Updated the comments to match Ansible's documented safe-upgrade and full-upgrade behavior.
- The repository example used the deprecated `apt_key` module and an outdated Grafana APT repository URL. Replaced it with `deb822_repository` using Grafana's current `https://apt.grafana.com` repository and signing key URL.
- The emergency patch example said `upgrade=yes` installs security updates only. Corrected the comment to say it upgrades available packages, because the `apt` module does not restrict that command to security updates.
- The error handling example used `--ignore-errors` with an ad hoc `ansible` command. Replaced it with a note to use a playbook for `ignore_errors`, because `ignore_errors` is a playbook task directive and is not an `ansible` ad hoc CLI option.

## Review Notes
The commands were reviewed against current official Ansible documentation. Ansible is not installed in this workspace, so CLI behavior was checked against the official `ansible` CLI reference rather than local `--help` output.
