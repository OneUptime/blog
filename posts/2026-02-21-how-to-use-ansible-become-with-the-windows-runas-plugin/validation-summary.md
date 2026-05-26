# Validation Summary: How to Use Ansible become with the Windows runas Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible `ansible.builtin.runas` become plugin
- Ansible Windows modules (`ansible.windows`, `community.windows`)
- Windows Remote Management (WinRM)
- Windows UAC and access tokens
- Ansible Vault

## Sources Consulted
- Ansible privilege escalation guide, "Become and Windows": https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `ansible.builtin.runas` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/runas_become.html
- Ansible Windows Remote Management guide: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm.html
- Ansible Windows host setup requirements: https://docs.ansible.com/ansible/8/os_guide/windows_setup.html
- Ansible `ansible.windows.win_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible `community.windows.win_scheduled_task` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_scheduled_task_module.html
- Microsoft Learn, Disable User Account Control (UAC): https://learn.microsoft.com/en-us/troubleshoot/windows-server/windows-security/disable-user-account-control

## Issues Found
- The prerequisites omitted .NET Framework 4.0 or later and the Secondary Logon service requirement. Added both because Ansible's Windows setup and runas documentation list them as requirements.
- The `pywinrm[credssp]` installation comment said it was for a requirements file. Changed it to say it is for the CredSSP transport, which is what that extra installs support for.
- The WinRM setup commands showed a basic HTTP-style testing configuration, but the inventory used port 5986, which is HTTPS and requires an HTTPS listener. Changed the inventory to port 5985 so it matches the setup shown.
- The UAC example described `EnableLUA` as disabling UAC for one account, but it is a host-wide UAC setting and requires a reboot. Updated the task name, made the unsafe fallback opt-in, and added the reboot step.
- The UAC example did not set `state: present` for registry values. Added it for explicit idempotent registry configuration.
- The `LocalAccountTokenFilterPolicy` explanation was too broad. Clarified that it applies to local administrator accounts over remote connections.

## Review Notes
The remaining examples use valid Ansible module names and current parameters according to the official documentation. The WinRM testing configuration uses port 5985 and should not be used as a production security baseline; production environments should prefer HTTPS or stronger domain authentication such as Kerberos where appropriate.
