# Validation Summary: How to Join a RHEL Samba Server to an Active Directory Domain

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- Samba Winbind
- Active Directory
- Kerberos
- realmd
- NetworkManager
- chrony
- authselect
- SELinux
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using Samba as a server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Samba smb.conf manual page: https://www.samba.org/samba/docs/4.13/man-html/smb.conf.5.html
- Samba Wiki, "Idmap config rid": https://wiki.samba.org/index.php/Idmap_config_rid
- Local command availability check for nmcli and host in the review environment

## Issues Found
- The package installation command was missing Red Hat's documented `samba-common-tools` and `samba-winbind-krb5-locator` packages for RHEL 9 Winbind domain joins, and included SSSD/adcli packages that are not needed for the Winbind flow shown. Updated the package list to match the RHEL 9 Samba Winbind guidance.
- The DNS test for the AD LDAP service record used `host _ldap._tcp.example.com` without specifying an SRV query. Changed it to `host -t SRV _ldap._tcp.example.com` so it verifies the record type Active Directory discovery relies on.
- The `net ads join` alternative appeared before the post created `smb.conf`, but Red Hat documents that `net ads join` requires manually creating Samba configuration first. Clarified that this alternative should be run after creating the shown Samba configuration.
- The `net ads join` example used an unqualified `administrator` user. Changed it to `EXAMPLE\\administrator`, matching Red Hat's documented domain-qualified form.
- The Samba configuration omitted `passdb backend = tdbsam`, which Red Hat includes in its manual `net ads join` baseline configuration for an AD domain member. Added it to the `[global]` section.
- The service startup command enabled `winbind` and `smb` together. Red Hat notes that Winbind must be running before Samba queries domain users and groups. Split the commands so `winbind` starts before `smb`, and added `testparm` verification before starting services.
- The automatic home directory section selected the `sssd` authselect profile even though the article configures Winbind. Changed it to `authselect select winbind with-mkhomedir --force`.

## Review Notes
- Red Hat recommends using `realm join` for this workflow because it updates the Samba, NSS, PAM, and Winbind configuration automatically.
- The `net ads join` path is valid, but it requires more manual configuration than the `realm join` path.
- The `winbind enum users` and `winbind enum groups` settings are valid, but enumeration can be expensive in large Active Directory environments.
