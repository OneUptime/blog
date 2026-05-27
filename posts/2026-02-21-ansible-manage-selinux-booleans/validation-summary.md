# Validation Summary: How to Use Ansible to Manage SELinux Booleans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.posix.selinux
- ansible.posix.seboolean
- SELinux booleans
- RHEL/CentOS Linux
- SELinux troubleshooting tools such as getsebool, setsebool, ausearch, audit2why, sealert, and semodule

## Sources Consulted
- Ansible Community Documentation: ansible.posix.seboolean module - https://docs.ansible.com/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible Community Documentation: ansible.posix.selinux module - https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide: Working with SELinux Booleans - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide: Apache HTTP Server Booleans - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide: NFS Booleans - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-security-enhanced_linux-confining_users-xguest_kiosk_mode#sect-Managing_Confined_Services-NFS-Booleans
- MySQL Reference Manual: MySQL Server SELinux Policies - https://dev.mysql.com/doc/refman/8.4/en/selinux-policies.html

## Issues Found
- The database server example described `selinuxuser_mysql_connect_enabled` as allowing databases to use NFS for storage. That boolean allows confined SELinux users to connect to the local MySQL/MariaDB server, so the comment was corrected.
- The compliance audit example attempted to index registered loop results with `loop.index0` inside task variables. That is not a reliable Ansible loop variable in this context. The task now loops directly over `boolean_check.results` and reads each original boolean name and expected value from `item.item`.

## Review Notes
- The Ansible module names and parameters used for SELinux state and boolean management are current in the ansible.posix collection.
- SELinux boolean names in the web and Samba examples match documented RHEL-family policy booleans. Exact boolean availability can vary by distribution release and installed SELinux policy packages, so production roles should still verify booleans on the target platform.
- The troubleshooting package list is appropriate for modern RHEL-family systems, but older RHEL/CentOS releases may use different package names for some SELinux Python utilities.
