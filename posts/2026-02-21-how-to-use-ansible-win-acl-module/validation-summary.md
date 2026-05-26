# Validation Summary: How to Use Ansible win_acl Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_acl module
- ansible.windows.win_acl_inheritance module
- ansible.windows.win_file module
- Windows NTFS ACLs and DACLs
- .NET FileSystemRights, InheritanceFlags, and PropagationFlags

## Sources Consulted
- Ansible Community Documentation: ansible.windows.win_acl module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_acl_module.html
- Ansible Community Documentation: ansible.windows.win_acl_inheritance module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_acl_inheritance_module.html
- Ansible Community Documentation: ansible.windows.win_file module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_file_module.html
- ansible.windows collection source: win_acl.ps1 - https://github.com/ansible-collections/ansible.windows/blob/main/plugins/modules/win_acl.ps1
- Microsoft Learn: FileSystemRights enum - https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights
- Microsoft Learn: InheritanceFlags enum - https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.inheritanceflags
- Microsoft Learn: PropagationFlags enum - https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.propagationflags
- Microsoft Learn: How DACLs control access to an object - https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object

## Issues Found
- The complete application deployment example granted ACLs on `{{ app_root }}\\logs` without first creating that directory. The `win_acl` module fails when the target path does not exist, so I added a `win_file` task to create the logs directory before applying its ACL.
- The troubleshooting section said the Ansible user could need the "Manage auditing and security log" privilege to modify ACLs. That privilege is for audit/security-log scenarios, not normal DACL edits handled by `win_acl`, so I changed the guidance to require local administrator rights or equivalent permission to change the object's DACL.
- The examples use an IIS AppPool identity, but the post did not mention the documented `Web-Scripting-Tools` requirement. I added that caveat to the user lookup troubleshooting note.

## Review Notes
The reviewed `win_acl`, `win_acl_inheritance`, and `win_file` parameters and examples otherwise match the current `ansible.windows` collection documentation. The rights and inheritance explanations are consistent with the .NET ACL enum documentation. The post could eventually mention that `win_acl` also supports registry and certificate-key permissions, but that is outside the article's file-permissions focus.
