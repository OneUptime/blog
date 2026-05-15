# Validation Summary: How to Add a Network Printer Using IPP on RHEL with CUPS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- CUPS
- IPP
- IPP Everywhere
- Avahi/mDNS/DNS-SD
- Linux printing commands: `lpadmin`, `lpinfo`, `lpoptions`, `lpstat`, `lp`, `ipptool`

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using a CUPS printing server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_a_cups_printing_server/index
- OpenPrinting CUPS `lpadmin(8)` manual: https://openprinting.github.io/cups/cups-local/lpadmin.html
- CUPS `ipptool(1)` manual: https://www.cups.org/doc/man-ipptool.html
- Local CUPS man pages for `lpadmin`, `lpinfo`, `lpoptions`, `lpstat`, `lp`, and `ipptool`
- Avahi tools package references for `avahi-browse`

## Issues Found
- The prerequisites installed `nss-mdns`, but RHEL documentation states that RHEL does not provide the `nss-mdns` plug-in for this workflow. Replaced it with `avahi-tools`, which provides command-line mDNS/DNS-SD tools such as `avahi-browse`.
- The test print command used `/usr/share/cups/data/testprint`. Red Hat documents `/usr/share/cups/data/default-testpage.pdf` for CUPS test-page printing, so the command was updated to that path.
- The troubleshooting section tailed `/var/log/cups/error_log`, but RHEL 9 stores CUPS logs in the systemd journal by default unless file logging is configured. Replaced it with `journalctl -u cups -f`.

## Review Notes
The `lpadmin -m everywhere`, `ipptool -tv ... get-printer-attributes.test`, `lpoptions -l`, `lpstat`, `lp`, and print option examples match CUPS documentation. RHEL notes that driverless printing requires the printer to support a suitable standard such as IPP Everywhere, AirPrint, Mopria, or Wi-Fi Direct Print Services, and manual printer setup remains appropriate on RHEL.
