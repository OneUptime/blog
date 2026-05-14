# Validation Summary: How to Share a CUPS Printer with Windows and macOS Clients from RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- CUPS
- IPP
- Bonjour / mDNS / DNS-SD
- Avahi
- firewalld
- Samba
- SELinux
- Windows printer sharing
- macOS printer discovery

## Sources Consulted
- CUPS Command-Line Printer Administration: https://www.cups.org/doc/admin.html
- CUPS lpadmin(8): https://www.cups.org/doc/man-lpadmin.html
- CUPS cupsd.conf(5): https://www.cups.org/doc/man-cupsd.conf.html
- CUPS Firewall Configuration: https://www.cups.org/doc/firewalls.html
- Red Hat Enterprise Linux 10, Configuring and using a CUPS printing server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_using_a_cups_printing_server/index
- Red Hat Enterprise Linux 10, Configuring and using network file services, Setting up Samba as a print server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_using_network_file_services/index
- Samba smb.conf(5): https://www.samba.org/samba/docs/3.5/man-html/smb.conf.5.html
- Microsoft Printer Sharing Technical Details: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-R2-and-2012/jj590748(v=ws.11)
- Avahi project documentation: https://avahi.org/

## Issues Found
- The Windows IPP instructions selected "Add a printer using a TCP/IP address or hostname" but then provided an HTTP IPP URL. Microsoft documents manual IPP URL connections through the shared-printer-by-name option, so the wizard step was corrected to "Select a shared printer by name."
- The Samba example placed `printing = cups` and `printcap name = cups` inside `[printers]`. Samba documents these as global CUPS printing settings, so a `[global]` section with `load printers = yes`, `printing = cups`, and `printcap name = cups` was added.
- The Samba setup did not verify `smb.conf` before use. Red Hat's Samba print-server procedure includes `testparm`, so that verification command was added.
- The SELinux command used `samba_enable_home_dirs`, which enables Samba access to home directories and is unrelated to printer sharing. It was replaced with SELinux labeling commands for the optional `/var/lib/samba/drivers` printer driver share.
- The troubleshooting section checked `/var/log/cups/error_log`, but current RHEL CUPS documentation states that CUPS logs are stored in the systemd journal by default. The command was changed to `journalctl -u cups -f`.

## Review Notes
- CUPS can still be configured to store logs in `/var/log/cups/`, but the journal command matches the default RHEL behavior.
- The Samba `print$` share is optional unless Windows driver download from the Samba server is required. Modern Windows environments often prefer IPP or locally installed vendor drivers.
