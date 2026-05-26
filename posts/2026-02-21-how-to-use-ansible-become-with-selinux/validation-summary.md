# Validation Summary: How to Use Ansible become with SELinux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible privilege escalation with `become`
- SELinux modes, contexts, booleans, ports, and policy modules
- Red Hat Enterprise Linux and CentOS package management
- Nginx/HTTPD SELinux labeling

## Sources Consulted
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.posix.seboolean` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible `ansible.posix.selinux` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible `community.general.seport` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/seport_module.html
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Red Hat Enterprise Linux 8 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 8 Considerations in adopting RHEL 8, SELinux package migration notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/selinux_security
- Linux `restorecon(8)` manual page: https://man7.org/linux/man-pages/man8/restorecon.8.html

## Issues Found
- The SELinux dependency playbook omitted `python3-libsemanage` for RHEL/CentOS 8+ and `libsemanage-python` for RHEL/CentOS 7. These bindings are required by Ansible SELinux boolean management, so they were added to the package lists.
- The custom HTTP port example used TCP 8443 as a port that must be added to `http_port_t`, but Red Hat's SELinux policy documentation lists 8443 as already labeled for HTTP. The example was changed to TCP 3131, which Red Hat uses as a non-standard HTTP port example requiring an SELinux port label.
- The post used `community.general.seport` but did not mention that `community.general` is outside `ansible-core`. A short install note was added so the playbook resolves correctly in ansible-core environments.

## Review Notes
The examples are otherwise syntactically valid Ansible playbooks and use current fully qualified collection names. The custom policy example assumes the target hosts already have SELinux policy build tools such as `checkmodule` and `semodule_package` installed; that is a reasonable operational prerequisite but could be called out in a future expansion.
