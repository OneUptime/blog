# Validation Summary: How to Use Ansible for Compliance as Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: lineinfile, file, include_vars, include_tasks, set_fact, debug, slurp, command, copy
- ansible.posix sysctl module
- OpenSSH server configuration
- Linux sysctl, modprobe.d, PAM limits.conf, systemd, and UFW commands
- CIS benchmark-style compliance automation

## Sources Consulted
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible playbook keywords documentation: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- ansible.posix sysctl module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible b64decode filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/b64decode_filter.html
- Ansible facts and conditionals documentation: https://docs.ansible.com/ansible/3/user_guide/playbooks_conditionals.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config
- Linux modprobe.d manual: https://www.man7.org/linux/man-pages/man5/modprobe.d.5.html
- Linux limits.conf manual: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The role tree listed `vars/rhel9.yml`, but the include expression builds filenames from `ansible_distribution | lower` and `ansible_distribution_major_version`. Ansible's documented example distribution value for Red Hat is `RedHat`, so the expression would look for `redhat9.yml`. Changed the tree to `redhat9.yml`.
- The post introduced `cis_skip_rules` and `cis_ssh_max_auth_tries`, but the shown task examples did not use those variables. Added `when` conditions for the shown skippable controls and changed the SSH MaxAuthTries task to use `cis_ssh_max_auth_tries`.

## Review Notes
- The Ansible module names, playbook syntax, check mode usage, sysctl options, OpenSSH directives, modprobe.d install lines, limits.conf entry, and systemctl command are valid against the consulted documentation.
- The `ansible.posix.sysctl` module requires the `ansible.posix` collection. This is commonly available with the full Ansible package but must be installed separately in ansible-core-only environments.
- The evidence playbook uses `ufw status verbose`, which is correct for UFW-based hosts but is distribution- and firewall-stack-specific. RHEL hosts commonly use firewalld instead.
