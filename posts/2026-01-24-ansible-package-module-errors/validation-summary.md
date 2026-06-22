# Validation Summary: How to Fix 'Package Module' Installation Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible package management modules
- ansible.builtin.apt
- ansible.builtin.yum and ansible.builtin.dnf
- ansible.builtin.package
- ansible.builtin.deb822_repository
- ansible.builtin.yum_repository
- Debian/Ubuntu APT repositories and GPG keys
- RHEL/CentOS DNF/YUM repositories and GPG keys

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible yum module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible rpm_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rpm_key_module.html
- Ansible yum_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible playbook keyword documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- NGINX Linux package repository documentation: https://nginx.org/en/linux_packages.html

## Issues Found
- The Debian repository example used `ansible.builtin.apt_key` and `ansible.builtin.apt_repository`. `apt_repository` is deprecated in current Ansible in favor of `ansible.builtin.deb822_repository`, and `apt_key` depends on legacy apt-key workflows. Replaced the Debian nginx repository setup with `ansible.builtin.deb822_repository` and its `signed_by` option.
- The nginx Debian repository URL used plain HTTP and a generic distribution-derived path. Updated it to the current HTTPS nginx package repository pattern for Debian and Ubuntu.
- The RHEL/CentOS nginx repository example used `http://nginx.org/packages/rhel/...`, which does not match nginx's current documented repository example for RHEL derivatives. Updated it to the HTTPS `centos` repository path and added `module_hotfixes: yes`, matching current nginx guidance and Ansible's supported `yum_repository` parameter.
- The APT lock handling example relied only on manual shell waiting before installation. Added `lock_timeout: 300` to the final `ansible.builtin.apt` install task, matching the module's built-in lock wait behavior.
- The GPG key example used `apt-key adv`, which is legacy apt-key usage. Replaced it with `ansible.builtin.get_url` for refreshing the nginx signing key and added a modern `ansible.builtin.deb822_repository` example that binds the repository to the signing key.

## Review Notes
All YAML snippets parse successfully with Python's YAML parser. `ansible-playbook --syntax-check` could not be run because Ansible is not installed in this workspace. Some examples remain intentionally generic, such as placeholder package names and proxy hosts, because they are illustrative troubleshooting templates rather than complete production playbooks.
