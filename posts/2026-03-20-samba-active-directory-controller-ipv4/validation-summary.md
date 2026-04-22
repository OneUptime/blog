# Validation Summary: How to Set Up Samba as an Active Directory Domain Controller on IPv4

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Samba Active Directory Domain Controller
- Samba Internal DNS
- Kerberos
- LDAP and OpenLDAP command-line tools
- systemd service management
- Debian/Ubuntu Linux package installation
- RHEL-compatible Samba support caveat
- IPv4 network binding

## Sources Consulted
- SambaWiki: Setting up Samba as an Active Directory Domain Controller - https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller
- SambaWiki: Distribution-specific Package Installation - https://wiki.samba.org/index.php/Distribution-specific_Package_Installation
- SambaWiki: Managing the Samba AD DC Service Using Systemd - https://wiki.samba.org/index.php/Managing_the_Samba_AD_DC_Service_Using_Systemd
- Samba smb.conf current man page - https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba samba-tool current man page - https://www.samba.org/samba/docs/current/man-html/samba-tool.8.html
- SambaWiki: Updating Samba, LDAP strong authentication notes - https://wiki.samba.org/index.php/Updating_Samba
- Ubuntu Server documentation: Provisioning a Samba Active Directory Domain Controller - https://ubuntu.com/server/docs/how-to/samba/provision-samba-ad-controller/
- Red Hat Enterprise Linux 9 documentation: Using Samba as a server - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_using_network_file_services/installing-nfs_exporting-nfs-shares

## Issues Found
- The Debian/Ubuntu package command omitted the dedicated `samba-ad-dc` package and helper packages needed by the later DNS and LDAP tests. Updated the package list to include Samba AD DC, Kerberos config, DNS tools, LDAP tools, and the GSSAPI SASL module.
- The RHEL/Rocky `dnf install samba samba-dc krb5-workstation` command was misleading for an AD DC setup. Red Hat documentation states that RHEL does not support running Samba as an AD domain controller, so the post now points RHEL-compatible users to a build or trusted third-party package with AD DC support.
- The post only stopped `smbd`, `nmbd`, and `winbind`. Samba AD DC service guidance says these standalone services should be disabled and masked so the AD DC service can manage its own processes, so the commands were updated.
- The provisioning flow did not move the package-provided `/etc/samba/smb.conf` out of the way. Samba provisioning can refuse to replace an existing config, so a command was added to move it aside before provisioning.
- The IPv4 interface binding was shown only as an `smb.conf` excerpt. Added `--option="interfaces=lo 192.168.1.10/24"` and `--option="bind interfaces only=yes"` to provisioning so Samba registers and binds to the intended IPv4 interface during setup, then clarified that the options should remain in `smb.conf`.
- The systemd comment said to use the `samba` service while the command used `samba-ad-dc`. Updated the wording to refer to the AD DC service.
- The DNS test depended on the local resolver already pointing at the DC. Updated the `host` command to query `192.168.1.10` explicitly.
- The LDAP test used an unencrypted simple bind to `ldap://192.168.1.10`, which modern Samba rejects by default when `ldap server require strong auth = yes`. Updated it to use the Kerberos ticket with SASL GSSAPI and an FQDN so the Kerberos service principal can match.

## Review Notes
- The remaining Samba commands and `smb.conf` parameters match current Samba documentation for a basic AD DC using the internal DNS backend.
- For a production deployment, the post could later mention time synchronization, DNS resolver configuration on the DC, and a second DC for failover, but those were outside the narrow corrections needed here.
