# Validation Summary: How to Map Active Directory Users and Groups to RHEL POSIX Attributes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- realmd
- Active Directory
- POSIX UID/GID attributes
- PowerShell ActiveDirectory module
- FreeIPA/Red Hat IdM ID views
- NFS identity mapping

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Integrating RHEL systems directly with Windows Active Directory": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/integrating_rhel_systems_directly_with_windows_active_directory/red_hat_enterprise_linux-9-integrating_rhel_systems_directly_with_windows_active_directory-en-us.pdf
- Red Hat Enterprise Linux 7 Windows Integration Guide, SSSD AD POSIX attributes and realmd configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/windows_integration_guide/windows_integration_guide
- SSSD ldap provider man page, ID mapping algorithm and cache guidance: https://www.mankier.com/5/sssd-ldap
- SSSD LDAP attributes man page, user and group attribute mapping defaults: https://www.mankier.com/5/sssd-ldap-attributes
- SSSD override man page, local override syntax and replacement behavior: https://www.mankier.com/8/sss_override
- Microsoft Learn, Set-ADUser cmdlet documentation: https://learn.microsoft.com/en-us/powershell/module/activedirectory/set-aduser
- Microsoft Learn, Active Directory RFC 2307 and schema attributes: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/216e01b1-4f6d-40d9-b7b1-22c5ba836d4a
- Microsoft Learn, unixHomeDirectory schema attribute: https://learn.microsoft.com/en-us/windows/win32/adschema/a-unixhomedirectory
- Red Hat Enterprise Linux IdM ID view documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_idm_users_groups_hosts_and_access_control_rules/using-an-id-view-to-override-a-user-attribute-value-on-an-idm-client_managing-users-groups-hosts

## Issues Found
- The SSSD automatic ID mapping explanation was too simplistic. It described the mapping as only adding RID to a base ID, but SSSD allocates domain slices and maps RIDs within those slices. Updated the explanation while keeping the original example as a first-slice example.
- The NFSv4 with Kerberos note was too broad. Updated it to say NFSv4 name mapping with Kerberos can reduce reliance on numeric IDs but still needs consistent identity resolution.
- The AD POSIX setup step recommended installing "Identity Management for UNIX" and using the Unix Attributes tab. That extension is deprecated for current Windows Server deployments. Replaced it with guidance to use existing RFC 2307 attributes via PowerShell or the ADUC Attribute Editor.
- The SSSD restart/cache command used `sss_cache -E` after changing ID mapping. SSSD documentation says changing ID mapping requires stopping SSSD, removing the SSSD database, and restarting. Updated the command sequence.
- The handling-users-without-POSIX-attributes section implied fallbacks could resolve users without POSIX IDs. Clarified that `uidNumber` and `gidNumber` are required when `ldap_id_mapping = False`; fallbacks only cover home directory and shell.
- The `sss_override user-add` examples used repeated commands for the same user, but each command replaces the previous override. Combined the multi-attribute override into one command and kept a single-attribute example.
- The FreeIPA ID view example used `--gid`, which is not the documented option for ID overrides. Changed it to `--gidnumber` and clarified that `--hostgroups` applies to current host group members.

## Review Notes
The guide is technically relevant and valid after the fixes. Future improvements could mention joining with `realm join --automatic-id-mapping=no` as an alternative to manually editing SSSD, and could add a reminder to publish POSIX attributes to the AD global catalog for better SSSD performance in multi-domain environments.
