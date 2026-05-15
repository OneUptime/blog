# Validation Summary: How to Set Up Samba as a Domain Controller on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba Active Directory Domain Controller
- Kerberos
- DNS
- firewalld
- systemd
- Windows Active Directory domain joins
- Samba Group Policy Objects

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using Samba as a server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- SambaWiki, "Setting up Samba as an Active Directory Domain Controller": https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller
- SambaWiki, "Distribution-specific Package Installation": https://wiki.samba.org/index.php/Distribution-specific_Package_Installation
- SambaWiki, "Managing the Samba AD DC Service Using Systemd": https://wiki.samba.org/index.php/Managing_the_Samba_AD_DC_Service_Using_Systemd
- SambaWiki, "Samba AD DC Port Usage": https://wiki.samba.org/index.php/Samba_AD_DC_Port_Usage
- Samba current `samba-tool(8)` manual page: https://www.samba.org/samba/docs/current/man-html/samba-tool.8.html
- SambaWiki, "DNS Administration": https://wiki.samba.org/index.php/DNS_Administration

## Issues Found
- The install section implied that `samba-dc` could be installed from RHEL repositories. Red Hat documentation states that running Samba as an AD DC is not supported on RHEL, and SambaWiki notes that Red Hat does not provide AD DC packages. Updated the section to require an AD-DC-capable source or trusted third-party build and removed the misleading `samba-dc` install command.
- The verification commands used `host`, but the prerequisites did not include DNS utilities. Added `bind-utils` to the prerequisites and install command.
- The `smb.conf` backup command failed when `/etc/samba/smb.conf` did not exist. Wrapped it in a file-existence check.
- The Kerberos section used only `/var/lib/samba/private/krb5.conf`, which is not the common path for source-built Samba. Added the source-build path caveat and instructed readers to use the provision output.
- The service section said the DC runs as a single `samba` process and used a generic `samba` systemd unit. Samba documentation explains that the AD DC daemon manages required `smbd` and `winbindd` subprocesses, and source-built deployments commonly use a `samba-ad-dc` unit. Updated the explanation and commands.
- The firewall example used generic firewalld services and omitted AD DC ports such as endpoint mapper, Kerberos password change, LDAP over UDP, and the dynamic RPC range. Replaced it with explicit ports from the Samba AD DC port usage documentation.
- The file-share section did not mention the Samba team's caveat that DCs are not recommended as file servers and that DC share permissions should be managed with Windows ACL tools. Added a short warning while preserving the existing example.

## Review Notes
The post is suitable as a lab guide, but Samba AD DC on RHEL remains outside Red Hat support. A future improvement would be to add a dedicated DNS resolver configuration step and a complete source-build or third-party-package installation path, because the exact paths and service files depend on how AD-DC-capable Samba is installed.
