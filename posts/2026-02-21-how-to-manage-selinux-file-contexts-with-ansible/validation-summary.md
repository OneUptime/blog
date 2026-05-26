# Validation Summary: How to Manage SELinux File Contexts with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general.sefcontext
- ansible.posix.seboolean
- SELinux file contexts
- restorecon
- ausearch and audit2why
- GNU find SELinux context matching

## Sources Consulted
- Ansible community.general.sefcontext module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/sefcontext_module.html
- Ansible ansible.posix.seboolean module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- restorecon(8) manual page: https://www.man7.org/linux/man-pages/man8/restorecon.8.html
- GNU findutils documentation for SELinux context matching: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Red Hat SELinux documentation for Apache HTTP Server types: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-types
- Red Hat RHEL 8 adoption notes for SELinux Python package name changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/selinux_security

## Issues Found
- The troubleshooting example used `ansible.builtin.command` with a shell pipe (`ausearch -m AVC -ts recent | audit2why`). The Ansible command module does not process shell metacharacters such as `|`, so the task would not run as intended. Changed it to `ansible.builtin.shell`.
- The package example installed `libselinux-python3`, which is not the current RHEL/Fedora package name for the Python 3 SELinux bindings. Updated the example to use `python3-libselinux` and added `python3-libsemanage`, which is required by the boolean module, while keeping `policycoreutils-python-utils`.
- The complete playbook created directories owned by `webapp` but did not ensure that the user exists. Added an `ansible.builtin.user` task before directory creation.
- The cleanup example used `when: false`, which means the restore task would never run. Replaced it with a `stat` check and a conditional based on whether `/opt/oldapp` exists.
- The article said new files created after a policy update automatically get the correct context. The `sefcontext` module only updates file context mappings; existing directories still need to be relabeled. Adjusted the explanation to say new files typically inherit the correct type after the directory itself has the correct label.

## Review Notes
- The examples are primarily suited to RHEL/Fedora-family systems because of the package names and Apache SELinux type names. Debian-family SELinux package names and policy details can differ.
- The `find -context` verification example depends on GNU find built with SELinux support and an SELinux-enabled system.
