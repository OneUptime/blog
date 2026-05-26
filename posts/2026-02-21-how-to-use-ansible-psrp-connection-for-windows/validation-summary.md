# Validation Summary: How to Use Ansible PSRP Connection for Windows

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible
- Ansible PSRP connection plugin
- Windows Remote Management (WinRM / WS-Man)
- PowerShell Remoting Protocol (PSRP)
- pypsrp
- Windows Ansible modules

## Sources Consulted
- Ansible `ansible.builtin.psrp` connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/psrp_connection.html
- Ansible Windows Remote Management documentation: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm.html
- Ansible `ansible.windows.win_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible `ansible.windows.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/setup_module.html
- Ansible `community.windows.win_unzip` module documentation: https://docs.ansible.com/ansible/latest/collections/community/windows/win_unzip_module.html
- Microsoft PowerShell WSMan Remoting documentation: https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/wsman-remoting-in-powershell
- Microsoft PowerShell Remoting Protocol specification: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-psrp/602ee78e-9a19-45ad-90fa-bb132b7cecec

## Issues Found
- The post described PSRP as communicating "instead of the WinRM SOAP protocol." Microsoft documents PSRP messages as being sent over the WS-Management layer, and Ansible documents PSRP as using the same underlying transport as the WinRM plugin. Updated the wording and diagram label to say PSRP is carried over WS-Man/WinRM to a PowerShell runspace.
- The pypsrp installation commands did not include Ansible's documented version constraint. Updated the base, Kerberos, CredSSP, and troubleshooting install commands to use `pypsrp>=0.4.0,<1.0.0`.
- The authentication overview omitted certificate authentication and implied an exact match with WinRM. Updated the wording and option list to include `certificate` and note that PSRP also supports `negotiate`.
- The Basic authentication example used HTTP port 5985. Ansible's Windows Remote Management documentation warns that Basic should not be used over HTTP. Updated the example to use HTTPS port 5986 with certificate validation ignored for a lab/self-signed setup.
- The "All PSRP Configuration Options" section was not complete and included the wrong proxy variable name. Renamed it to "Common PSRP Configuration Options" and changed `ansible_psrp_no_proxy` to the documented `ansible_psrp_ignore_proxy`.

## Review Notes
Short module names such as `win_ping`, `win_service`, `win_file`, and `win_get_url` remain usable when the relevant Windows collections are installed, but future edits could use fully qualified collection names for clearer documentation links. `community.windows.win_unzip` is currently in the `community.windows` collection and may require that collection on installations that only include `ansible-core`.
