# Validation Summary: How to Configure SELinux Policies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- SELinux modes, contexts, labels, booleans, and policies
- RHEL, CentOS, and Fedora SELinux administration
- Apache/httpd SELinux types and port labels
- Docker/container SELinux volume labeling
- SELinux troubleshooting tools including ausearch, sealert, audit2allow, semodule, checkmodule, and semodule_package

## Sources Consulted
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- Red Hat Enterprise Linux 10: Changing SELinux states and modes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/changing-selinux-states-and-modes
- Red Hat Enterprise Linux 7: SELinux file context labeling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- semanage-port(8) manual: https://manpages.opensuse.org/Tumbleweed/policycoreutils-python-utils/semanage-port.8.en.html
- semanage-fcontext(8) manual: https://manpages.opensuse.org/Tumbleweed/policycoreutils-python-utils/semanage-fcontext.8.en.html
- semanage-boolean(8) manual: https://manpages.opensuse.org/Tumbleweed/policycoreutils-python-utils/semanage-boolean.8.en.html
- checkmodule(8) manual: https://man7.org/linux/man-pages/man8/checkmodule.8.html
- semodule(8) manual: https://man7.org/linux/man-pages/man8/semodule.8.html
- semodule_package(8) manual: https://man7.org/linux/man-pages/man8/semodule_package.8.html
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- container_selinux(8) manual: https://manpages.opensuse.org/Tumbleweed/container-selinux/container_selinux.8.en.html

## Issues Found
- The `semanage port -m` example used port `8081`, which had not been added in the preceding example and would fail unless that port already existed in policy. Changed it to modify the existing `8080` example.
- The `semanage port -d` example included `-t http_port_t`. The current `semanage-port(8)` syntax deletes by protocol and port, so the command was changed to `sudo semanage port -d -p tcp 8080`.
- The custom policy snippet required `myapp_data_t` as if it already existed. Changed it to define `myapp_data_t` in the module and assign it the `file_type` attribute so the standalone example is coherent.
- The Docker/container troubleshooting section recommended `virt_use_nfs` and `virt_use_samba` for NFS/Samba mounts. Those booleans are for virtual guest policy, while current container policy documents container-managed NFS and CIFS types. Replaced that advice with a container-policy check.

## Review Notes
The SELinux commands and explanations are generally accurate for modern RHEL/Fedora-family systems. Some package names and available booleans can vary by distribution version and installed SELinux policy packages, so future edits could mention using `semanage boolean -l`, `semanage fcontext -l`, and the local `*_selinux(8)` man pages as the final authority on a specific host.
