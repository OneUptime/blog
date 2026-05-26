# Validation Summary: How to Fix Ansible Package manager not found Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible package management modules: `ansible.builtin.package`, `ansible.builtin.apt`, `ansible.builtin.dnf`, `ansible.builtin.dnf5`
- Ansible facts and conditionals
- Ansible core modules: `setup`, `debug`, `timezone`, `hostname`, `lineinfile`, `service`, `template`, `uri`, `command`, `fail`, `file`, `copy`, `cron`
- `community.general.ufw`
- Linux package managers: APT, DNF, DNF5

## Sources Consulted
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.dnf5` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf5_module.html
- Ansible `ansible.builtin.yum` redirect documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- Ansible facts and conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html

## Issues Found
- The post recommended `yum` for Red Hat/CentOS conditionals. Current Ansible documentation says `ansible.builtin.yum` is a compatibility redirect to `ansible.builtin.dnf`, and the YUM backend was removed in ansible-core 2.17. Changed the example to use `dnf`.
- The error examples used outdated or misleading package-manager wording. Updated them to reflect current APT dependency and DNF detection failures.
- The `ansible_pkg_mgr` example only handled `apt`, `yum`, and `dnf`. Removed `yum` and added `dnf5` for current Ansible package-manager detection.
- The package-name mapping snippet was not valid standalone YAML because it mixed a top-level `vars` mapping with a task list. Wrapped it in a minimal play with `hosts`, `vars`, and `tasks`.
- The summary implied facts must always be gathered before any `package` task. The `package` module can use existing facts or auto-detect, so the wording now specifically applies to using OS facts in package tasks.
- The infrastructure example used UFW on all hosts, which is not cross-platform. Added Debian-family guards to the UFW tasks.
- The SSH restart handler used `sshd` for every OS. Changed it to use `ssh` on Debian-family systems and `sshd` elsewhere.
- The fallback command in the error-handling example would stop the play before the final status and explicit failure task if the fallback failed. Added `failed_when: false` to match the intended control flow.
- The scheduled scan example copied a script into `/opt/scripts` without ensuring the directory existed. Added a directory creation task using `ansible.builtin.file`.

## Review Notes
All YAML code fences were parsed with PyYAML after edits. `ansible-playbook --syntax-check` was not available in the local environment because Ansible is not installed.
