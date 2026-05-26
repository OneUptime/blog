# Validation Summary: How to Use Ansible to Configure Kerberos Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Kerberos
- MIT krb5 client configuration
- OpenSSH Kerberos and GSSAPI authentication
- chrony time synchronization
- SSSD with LDAP and Kerberos
- Linux keytabs
- Active Directory integration concepts

## Sources Consulted
- Ansible file test documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/file_test.html
- Ansible tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos encryption type documentation: https://web-cert.mit.edu/kerberos/krb5-1.21/doc/admin/enctypes.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config
- chrony configuration documentation: https://chrony-project.org/doc/4.8/chrony.conf.html
- Ubuntu chrony documentation: https://ubuntu.com/server/docs/how-to/networking/chrony-client/
- Red Hat chrony documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_time_synchronization/using-chrony
- SSSD Kerberos migration documentation: https://sssd.io/docs/krb/krb-migration.html
- Red Hat Active Directory integration with SSSD documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-sssd_integrating-rhel-systems-directly-with-active-directory

## Issues Found
- The chrony playbook used `/etc/chrony/chrony.conf` and `chronyd` unconditionally. Ubuntu/Debian document `/etc/chrony/chrony.conf` and the `chrony` service, while Red Hat documents `/etc/chrony.conf` and `chronyd`. Added distro-aware variables for the config path and service name.
- The chrony playbook referenced a `chrony.conf.j2` template that was not shown in the post, so the example was incomplete. Replaced it with an inline `copy` task that writes valid chrony server, `makestep`, and `rtcsync` directives.
- The keytab distribution task checked `inventory_hostname + '.keytab' is file`, which tests a file in the controller's current path rather than the configured `files/keytabs` directory. Updated the condition to check the full controller-side keytab source path.
- The SSH handler restarted `sshd` unconditionally. Debian-family systems commonly use the `ssh` service name, so a distro-aware `ssh_service_name` variable was added.
- The SSSD playbook configured and restarted SSSD without ensuring the required SSSD packages were installed. Added a package task for `sssd` and `sssd-krb5`.
- The final test playbook used `ntpdate -q`, but the article installs and configures chrony, and `ntpdate` is not guaranteed to be present on current systems. Replaced it with a `chronyc tracking` command that reads chrony's last offset.

## Review Notes
- The Kerberos protocol explanation, krb5.conf structure, OpenSSH Kerberos/GSSAPI options, keytab permission guidance, and clock-skew warning are technically consistent with the referenced documentation.
- The encryption-type recommendations are directionally correct, but hard-coding enctype lists can become stale as Kerberos libraries add stronger defaults. Future revisions could explain when to omit `default_tgs_enctypes` and `default_tkt_enctypes`.
