# Validation Summary: How to Use Ansible to Manage Windows Hosts with HTTPS WinRM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- WinRM
- Windows PowerShell
- HTTPS/TLS
- X.509 certificates
- Windows Firewall

## Sources Consulted
- Ansible Windows Remote Management documentation: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm.html
- Ansible WinRM certificate authentication documentation: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm_certificate.html
- Ansible INI inventory documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible ansible.windows.win_shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible community.windows.win_firewall_rule module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_firewall_rule_module.html
- Microsoft WinRM installation and configuration documentation: https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management
- Microsoft PowerShell WSMan provider documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.wsman.management/about/about_wsman_provider

## Issues Found
- The introduction and HTTPS explanation overstated HTTP behavior by saying credentials and data are always transmitted in plain text. Ansible's WinRM documentation states that NTLM, Kerberos, and CredSSP can provide message-level encryption over HTTP, while Basic and certificate authentication do not. Updated the wording and diagram label to distinguish "no TLS" from always-plaintext transport.
- The INI inventory example used `ansible_password={{ vault_windows_password }}`, which is misleading in an INI inventory example. Replaced it with a clear placeholder value so readers do not assume a Jinja variable reference in the inventory line is the correct vault pattern.
- The certificate authentication example omitted required client certificate properties. Added the requirement for client authentication Extended Key Usage and a userPrincipalName Subject Alternative Name.
- The certificate import example only added the client certificate to Trusted People. For self-signed client certificates, Windows must also trust the certificate chain. Updated the example to trust the self-signed certificate as a root certificate as well.
- The certificate mapping example used a literal subject and the client certificate thumbprint as the issuer. Ansible's certificate authentication documentation and the WSMan provider documentation require the mapped subject to come from the certificate UPN and the issuer to be the issuer CA certificate thumbprint. Updated the PowerShell example accordingly.

## Review Notes
- The remaining examples are technically consistent with the current Ansible and Microsoft documentation reviewed. In a production environment, a CA-issued server certificate and a vaulted password stored in a vars file would be preferable to placeholders or self-signed bootstrap examples.
