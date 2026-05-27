# Validation Summary: How to Use Ansible to Configure RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Red Hat Enterprise Linux 9
- Red Hat Subscription Management
- DNF package management
- EPEL repository setup
- SELinux booleans and file contexts
- firewalld
- chrony
- Linux sysctl tuning
- RHEL system-wide cryptographic policies
- OpenSSH server configuration

## Sources Consulted
- Ansible `community.general.redhat_subscription` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redhat_subscription_module.html
- Ansible `community.general.rhsm_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/rhsm_repository_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.posix.selinux` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible `ansible.posix.seboolean` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible `community.general.sefcontext` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/sefcontext_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Red Hat Enterprise Linux 9 Security hardening documentation, system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat repository guidance for RHEL 9 BaseOS, AppStream, and CodeReady Linux Builder repositories: https://access.redhat.com/solutions/265523
- Red Hat EPEL installation guidance: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The inventory example did not define a `web` group, but SELinux boolean tasks used `when: "'web' in group_names"`. Added `[web]` and `[db]` groups so the conditional example works as written.
- The firewalld tasks used `permanent: true` without `immediate: true`, which updates permanent configuration but does not reliably apply rules to the running firewall until reload. Added `immediate: true` to the service and port examples.
- The crypto-policy task used `update-crypto-policies --set DEFAULT:NO-SHA1`, which is a RHEL 8-era hardening example. RHEL 9's `DEFAULT` policy already restricts SHA-1 signatures. Replaced it with an idempotent check using `update-crypto-policies --show` and `update-crypto-policies --set DEFAULT` only when needed.

## Review Notes
- The EPEL RPM URL is current and commonly documented, but production playbooks should avoid disabling GPG checks unless they explicitly manage package trust another way.
- The examples rely on `community.general` and `ansible.posix`, which are not part of `ansible-core`; users must have those collections available.
- Some command-based tasks could be made more fully idempotent in a future revision, but the commands and module usage are technically valid after the fixes above.
