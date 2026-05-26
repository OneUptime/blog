# Validation Summary: How to Use Ansible become_method with pfexec

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation
- `community.general.pfexec` become plugin
- Oracle Solaris RBAC
- Solaris rights profiles, roles, `pfexec`, `profiles`, and `usermod`
- Solaris Service Management Facility (SMF)
- illumos and SmartOS package-management context

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `community.general.pfexec` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pfexec_become.html
- Oracle Solaris 11.4 rights verification documentation: https://docs.oracle.com/cd/E37838_01/html/E61023/prbac-checkrights-1.html
- Oracle Solaris 11.4 rights administration commands: https://docs.oracle.com/cd/E37838_01/html/E61023/rbacref-22.html
- Oracle Solaris `profiles(1)` man page: https://docs.oracle.com/cd/E88353_01/html/E37839/profiles-1.html
- Oracle Solaris `exec_attr(4)` man page: https://docs.oracle.com/cd/E86824_01/html/E54775/exec-attr-4.html
- Oracle Solaris `pfexec(1)` man page: https://docs.oracle.com/cd/E19455-01/806-0624/6j9vek5co/index.html
- Oracle Solaris SMF administration documentation: https://docs.oracle.com/cd/E53394_01/html/E54799/faauf.html
- SmartOS package management documentation: https://docs.smartos.org/working-with-packages/

## Issues Found
- The post described sudo as all-or-nothing root access. This was inaccurate because sudo can also be configured with command-specific policies. Changed the comparison to focus on pfexec's fine-grained RBAC integration without mischaracterizing sudo.
- The post implied the pfexec become method is always built into Ansible. Current Ansible documentation lists the pfexec become plugin in the `community.general` collection, which is included in the full `ansible` package but not in `ansible-core`. Added the collection caveat and the `community.general.pfexec` method name for `ansible-core` users.
- The RBAC concept list used "Execution Profiles" and described roles as named collections of profiles. Oracle Solaris documentation uses "rights profiles", and roles are special accounts that users can assume. Updated the terminology and explanation.
- The rights assignment commands used `usermod -P`, which can replace profile settings on older Solaris-style syntax and is not the current Oracle Solaris 11.4 documentation pattern. Updated examples to use `usermod -K profiles+=...`.
- The SMF SSH example checked for the string `ssh` in `svcs -a`, which would not enable an existing but disabled SSH service because `ssh` would still appear in the output. Changed it to query the specific service state and enable SSH when the state is not `online`.
- The custom RBAC profile example edited `/etc/security/prof_attr` and `/etc/security/exec_attr` directly. Oracle Solaris documentation recommends using `profiles(1)` for those databases. Replaced the direct file appends with `profiles -p`.
- The custom RBAC profile claimed command-specific entries were sufficient for Ansible operations generally. Ansible documentation states privilege escalation must be general because modules execute temporary code paths. Clarified that command-path-limited profiles are only suitable for direct command automation, while general modules need broader rights.

## Review Notes
The package and interpreter examples are plausible for Solaris and SmartOS, but exact Python package names and interpreter paths can vary by Oracle Solaris SRU, illumos distribution, zone image, and installed package set. The post already advises checking the target system's interpreter path.
