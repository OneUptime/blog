# Validation Summary: How to Configure Ansible for Windows Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Windows modules
- WinRM
- pywinrm
- PowerShell Remoting
- NTLM, Kerberos, CredSSP, and certificate authentication
- IIS automation with Ansible
- Chocolatey
- Ansible Vault

## Sources Consulted
- Ansible Windows Remote Management documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm.html
- Ansible winrm connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/winrm_connection.html
- Ansible Using Ansible and Windows documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_usage.html
- Ansible WinRM Certificate Authentication documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm_certificate.html
- Ansible module index for Windows and community Windows modules: https://docs.ansible.com/projects/ansible/latest/collections/index_module.html
- Ansible community.windows.win_iis_website deprecation documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_iis_website_module.html
- Ansible community.windows.win_iis_webapppool deprecation documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_iis_webapppool_module.html
- Ansible microsoft.iis.web_app_pool module documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/web_app_pool_module.html
- Ansible microsoft.iis.website module documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/website_module.html
- Microsoft PowerShell Remoting WinRM security documentation: https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/winrm-security
- pywinrm project documentation: https://pypi.org/project/pywinrm/

## Issues Found
- The dependency installation section labeled `pywinrm[credssp]` as required for certificate authentication. Changed the comment to CredSSP authentication because the extra installs CredSSP support, while certificate authentication uses client certificate files and Windows-side certificate mapping.
- The WinRM quick setup enabled CredSSP by setting the raw WinRM service auth value. Replaced it with `Enable-WSManCredSSP -Role Server -Force`, matching the supported PowerShell setup command.
- The manual setup used `TrustedHosts` on the managed Windows host as if it were required for Ansible local-account authentication. Replaced it with `LocalAccountTokenFilterPolicy`, which is the relevant setting for remote local administrator token filtering.
- The certificate authentication diagram and heading described certificate auth as "Most Secure." Adjusted that wording to avoid an inaccurate blanket ranking, since Ansible documents certificate auth as local-account-only and recommends Kerberos in domain environments.
- The complete IIS example used deprecated `win_iis_webapppool` and `win_iis_website` modules. Updated the example to use `microsoft.iis.web_app_pool` and `microsoft.iis.website`, including the current `bindings.set` format.
- The troubleshooting `curl` command tested a WinRM endpoint with default curl authentication while the surrounding inventory example used NTLM. Added `--ntlm` so the command matches the documented NTLM scenario.

## Review Notes
- The post is technically relevant and contains implementation details, commands, configuration, and playbooks.
- Current Ansible documentation notes that WinRM/PSRP from macOS can fail in recent releases due to Python stack behavior. The post's macOS prerequisite remains generally understandable but could be expanded in a future revision with that caveat.
- Most examples use short module names. They remain common and generally valid, but future updates could use fully qualified collection names for clarity.
