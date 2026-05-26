# Validation Summary: How to Configure Ansible with Kerberos for Windows

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ansible
- WinRM
- Kerberos
- Active Directory
- pywinrm
- CredSSP
- MIT Kerberos client tools
- Windows `setspn` and `ktpass`

## Sources Consulted
- Ansible Community Documentation: Windows Remote Management - https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm.html
- Ansible Community Documentation: Kerberos Authentication - https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm_kerberos.html
- Microsoft Learn: Installation and configuration for Windows Remote Management - https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management
- Microsoft Learn: How to configure WinRM for HTTPS - https://learn.microsoft.com/en-us/troubleshoot/windows-client/system-management-components/configure-winrm-for-https
- Microsoft Learn: setspn - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn
- Microsoft Learn: ktpass - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ktpass
- MIT Kerberos Documentation: kinit - https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos Documentation: krb5.conf - https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html

## Issues Found
- The Kerberos sequence diagram and explanation said the Windows host validates the presented ticket "with the KDC." Kerberos service tickets are normally validated by the service using its local service key, with optional domain controller/PAC validation in some environments. Updated the diagram and text.
- The prerequisites listed LDAP ports as required for this Kerberos setup. Kerberos authentication itself requires Kerberos connectivity and DNS/domain resolution; LDAP is only needed for automation that queries AD. Updated the prerequisite wording.
- The package installation snippet used an older/general `yum` example and installed `pykerberos` separately. Current Ansible documentation recommends installing `pywinrm[kerberos]>=0.4.0`; updated the snippet to use `dnf` for modern RHEL-family systems and a quoted `pip3` command.
- The `/etc/krb5.conf` playbook used `ansible.builtin.template` with a `content` parameter, which is not a valid template module pattern. Changed it to `ansible.builtin.copy` with inline `content` and an explicit file mode.
- The text said Ansible will automatically run `kinit` whenever a password is provided. Added the documented exception for `ansible_winrm_kinit_mode=manual`.
- The WinRM section implied Kerberos always needs to be enabled manually. Microsoft documentation says WinRM service Kerberos authentication defaults to enabled, so the wording now says the playbook verifies/enforces the setting.
- The SPN example hard-coded `corp.local` for the FQDN registration and did not mention the AD permissions requirement. Updated it to derive the FQDN and note that SPN registration requires permission to modify the computer account.
- The CredSSP section omitted the optional control-node Python requirement. Added the documented `pywinrm[credssp]>=0.4.0` install command.
- The cron section described the script as renewing the ticket, but the script obtains a fresh TGT with `kinit -kt`. Changed the wording to "refresh" the ticket.

## Review Notes
- `ansible_winrm_server_cert_validation=ignore` is technically supported, but production setups should prefer a trusted CA chain for WinRM HTTPS certificates.
- The keytab example uses `ktpass` with AES256-SHA1, which is a documented option, but organizations should confirm the account encryption settings and key version behavior in their AD environment.
