# Validation Summary: How to Troubleshoot Samba Not Responding on IPv4 Interfaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba SMB/CIFS services (`smbd`, `nmbd`)
- Samba configuration (`smb.conf`)
- Linux systemd service management
- Linux socket and port diagnostics (`ss`, `nc`)
- Linux firewalls (`iptables`, UFW, firewalld)
- Samba host access controls
- Samba logging and `smbcontrol`
- SELinux Samba labels and booleans

## Sources Consulted
- Samba Wiki: Configure Samba to Bind to Specific Interfaces - https://wiki.samba.org/index.php/Configure_Samba_to_Bind_to_Specific_Interfaces
- Samba Wiki: Samba Domain Member Port Usage - https://wiki.samba.org/index.php/Samba_Domain_Member_Port_Usage
- Samba `smb.conf(5)` manual - https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- Samba `testparm(1)` manual - https://www.samba.org/samba/docs/4.17/man-html/testparm.1.html
- Samba `smbcontrol(1)` manual - https://www.samba.org/samba/samba/docs/4.19/man-html/smbcontrol.1.html
- Samba `smbpasswd(8)` manual - https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Red Hat Enterprise Linux documentation: Using Samba as a server - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_using_network_file_services/index
- Red Hat SELinux documentation for Samba labels and booleans - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/epub/selinux_users_and_administrators_guide/how-file-context-is-determined
- Ubuntu Server documentation: UFW firewall syntax and Samba application profile - https://ubuntu.com/server/docs/how-to/security/firewalls/
- firewalld `firewall-cmd(1)` manual - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- iptables Packet Filtering HOWTO - https://www.iptables.org/documentation/HOWTO/packet-filtering-HOWTO-7.html
- Local command help checked for `systemctl`, `ss`, `nc`, `iptables`, and `ufw`.

## Issues Found
1. **Systemd service names were Debian/Ubuntu-specific**: The post used only `smbd` and `nmbd` units, but RHEL/CentOS/Fedora commonly use `smb` and `nmb` service units for the same daemons. **Fix:** Added RHEL/CentOS/Fedora service commands in Step 1 and made the diagnostic script fall back to `smb nmb`.
2. **UFW example opened only part of the Samba port set and omitted the Samba profile**: The post checked for ports 137, 138, 139, and 445, but the UFW example only opened 445 and 139 by port number. **Fix:** Replaced those rules with Ubuntu's `app Samba` syntax for the subnet, which maps to the Samba application profile.
3. **The error table mapped `no route to host` too narrowly**: A "no route to host" result is more accurately a routing problem or firewall reject, not a packet drop. **Fix:** Changed the cause and fix to check routing and firewall rules.
4. **The error table conflated access denial and authentication failure**: `NT_STATUS_ACCESS_DENIED` is more commonly a share ACL, filesystem permission, `valid users`, or SELinux issue, while missing/disabled Samba users and bad passwords fit `NT_STATUS_LOGON_FAILURE`. **Fix:** Corrected the causes and fixes for both rows.
5. **The quick diagnostic script required privileges but did not use them**: `ss -p`, `testparm`, `pdbedit`, and Samba log reads often require root privileges. **Fix:** Added `sudo` to the relevant script commands and changed the grep expression to `grep -Ei`.

## Review Notes
- Samba's NetBIOS ports 137/udp, 138/udp, and 139/tcp are only needed for NetBIOS/older discovery scenarios; modern direct SMB primarily uses 445/tcp. The post remains acceptable because it is troubleshooting both `smbd` and `nmbd`.
- The SELinux `chcon` example is temporary by itself, but the following `semanage fcontext` and `restorecon` commands make the labeling persistent.
