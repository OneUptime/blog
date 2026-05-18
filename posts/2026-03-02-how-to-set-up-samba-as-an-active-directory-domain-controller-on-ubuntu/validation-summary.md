# Validation Summary: How to Set Up Samba as an Active Directory Domain Controller on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Samba 4 (AD DC mode)
- Ubuntu 22.04 LTS
- Active Directory Domain Services
- Kerberos (krb5)
- LDAP / LDAPS
- DNS (Samba internal DNS backend)
- Netplan
- systemd / systemd-resolved
- Winbind
- UFW (firewall)
- realmd / sssd / adcli (Linux domain join)
- PowerShell `Add-Computer` (Windows domain join)
- `samba-tool` (user/group/domain management, backup, FSMO, replication)

## Sources Consulted
- Samba Wiki — Setting up Samba as an Active Directory Domain Controller: https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller
- Samba Wiki — Samba AD DC Port Usage: https://wiki.samba.org/index.php/Samba_AD_DC_Port_Usage
- Samba Wiki — Managing the Samba AD DC Service Using Systemd: https://wiki.samba.org/index.php/Managing_the_Samba_AD_DC_Service_Using_Systemd
- Samba Wiki — Joining a Samba DC to an Existing Active Directory: https://wiki.samba.org/index.php/Joining_a_Samba_DC_to_an_Existing_Active_Directory
- Samba Wiki — Back up and Restoring a Samba AD DC: https://wiki.samba.org/index.php/Back_up_and_Restoring_a_Samba_AD_DC
- Ubuntu Server documentation — Provisioning a Samba AD Domain Controller: https://ubuntu.com/server/docs/how-to/samba/provision-samba-ad-controller/
- Microsoft Learn — Add-Computer (PowerShell 5.1): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/add-computer
- Netplan reference — default routes and gateway4 deprecation: https://netplan.readthedocs.io/

## Issues Found
1. **Deprecated `gateway4` in netplan example.** `gateway4` has been deprecated since netplan 0.103 (Ubuntu 22.04 ships 0.104) and is removed in newer releases. Replaced with the modern `routes:` block (`to: default`, `via: 192.168.1.1`) to avoid deprecation warnings and stay forward-compatible.
2. **Code fence language mismatch on the Windows domain-join block.** It was tagged `cmd` but the snippet uses `#` comments and the `Add-Computer` PowerShell cmdlet, neither of which are valid in cmd.exe. Changed the language tag to `powershell`.
3. **Incomplete firewall port list for an AD DC.** Per the official Samba AD DC Port Usage wiki, three commonly required ports were missing and have been added with comments: 123/udp (NTP — required because Kerberos demands time synchronization), 137/udp (NetBIOS Name Service), and 138/udp (NetBIOS Datagram).

## Review Notes
- The `samba-tool domain provision` flags, the `samba-tool user add` / `group addmembers` / `domain backup online` / `domain join` / `fsmo show` invocations, the krb5.conf path (`/var/lib/samba/private/krb5.conf`), and the `systemctl unmask samba-ad-dc` step were all verified correct against the Samba wiki and Ubuntu Server docs.
- When joining a second DC with `--dns-backend=SAMBA_INTERNAL`, the Samba wiki recommends additionally passing `--option="dns forwarder=<upstream-ip>"` because the forwarder is not auto-detected during a join. The current command works but operators may want to add this for outbound resolution. Not corrected because the command as written is technically valid.
- `Add-Computer` is Windows PowerShell 5.1 only — it is not present in PowerShell 7.x (cross-platform). On modern Windows hosts using PowerShell 7 as default, users would need to invoke it via `powershell.exe` (5.1). Left as-is because 5.1 ships with all supported Windows desktop and server editions.
- The tag list contains `Window` (likely intended as `Windows`); not modified because the instructions limit changes to technical errors and this is a metadata/spelling issue, not a technical inaccuracy.
- The advice in the `/etc/hosts` section ("Do not have the Samba DC's own IP pointing to itself ... use the actual IP") is slightly awkwardly worded but technically correct — it warns against using a loopback for the FQDN entry, which is the canonical Samba recommendation.
