# Validation Summary: How to Use Ansible when with ansible_os_family

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible facts and conditionals
- ansible_os_family / ansible_facts['os_family']
- ansible.builtin package, apt, dnf, deb822_repository, yum_repository, include_vars, include_tasks, template, fail, debug, and systemd_service modules
- community.general apk and ufw modules
- ansible.posix firewalld module
- Debian/Ubuntu, RedHat-family, Alpine, Suse, FreeBSD, Darwin, and Windows platform distinctions

## Sources Consulted
- Ansible setup facts documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- Ansible conditionals and common facts documentation: https://docs.ansible.com/ansible/4/user_guide/playbooks_conditionals.html
- Ansible package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/apt_repository_module.html
- Ansible yum_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/include_tasks_module.html
- community.general apk module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/apk_module.html
- community.general ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.posix firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The generic Apache package example used `httpd` for every non-Debian OS family. Changed it to a Debian/RedHat package-name mapping with a `when` guard so unsupported families are not given an incorrect package name.
- The Apache configuration example built `/etc/apache2/conf/httpd.conf` for Debian-family hosts, which is not the standard Debian Apache main configuration file path. Changed the variable to explicit per-family configuration files: `/etc/apache2/apache2.conf` for Debian and `/etc/httpd/conf/httpd.conf` for RedHat-family hosts.
- The service examples used `ansible.builtin.systemd`, which is now an alias for the renamed `ansible.builtin.systemd_service` module. Updated examples to use the current FQCN.
- The Debian custom repository example used `ansible.builtin.apt_key`, but current Ansible documentation notes that the underlying `apt-key` utility is deprecated and removed in modern Debian versions. Replaced the separate `apt_key` and `apt_repository` tasks with `ansible.builtin.deb822_repository` and `signed_by`.
- The firewalld example set `permanent: true` but did not set `immediate: true`, so the opened ports would not necessarily be active in the runtime configuration until reload. Added `immediate: true` to apply the rules immediately as well as persistently.

## Review Notes
- Static YAML parsing of all 13 YAML code blocks succeeded.
- `ansible-playbook --syntax-check` could not be run because Ansible is not installed in this environment.
- The post uses top-level injected facts such as `ansible_os_family`, which are common in Ansible examples. The canonical nested form is `ansible_facts['os_family']`; future revisions could mention that fact injection can be disabled by configuration.
