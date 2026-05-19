# Validation Summary: How to Configure Printer Sharing Between Ubuntu and macOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- macOS
- CUPS
- IPP / IPP Everywhere
- Bonjour / DNS-SD / mDNS
- Avahi
- AirPrint

## Sources Consulted
- OpenPrinting CUPS Printer Sharing: https://openprinting.github.io/cups/doc/sharing.html
- OpenPrinting CUPS lpadmin(8): https://www.cups.org/doc/man-lpadmin.html
- OpenPrinting CUPS cupsd.conf(5): https://openprinting.github.io/cups/doc/man-cupsd.conf.html
- OpenPrinting CUPS cupsd-logs(5): https://openprinting.github.io/cups/doc/man-cupsd-logs.html
- Ubuntu Server documentation, Install and configure a CUPS print server: https://ubuntu.com/server/docs/how-to/networking/cups-print-server/
- Apple Platform Deployment, AirPrint payload settings: https://support.apple.com/guide/deployment/airprint-payload-settings-dep3b4cf515/web
- Printer Working Group, IPP Everywhere: https://pwg.org/ipp/everywhere.html
- Local CUPS man pages and command help for cupsctl, lpadmin, lp, lpq, lpstat, cupsd.conf, and cups-files.conf.

## Issues Found
- The Ubuntu printer creation example used a hard-coded HPIJS model path that may not exist on current systems and relies on deprecated PPD/driver selection. I changed the example to tell readers to select a model from `lpinfo -m` or use `everywhere` for driverless IPP/IPP-USB printers, and replaced the specific HPIJS path with a generic sample model.
- The CUPS sharing snippet used `Listen 0.0.0.0:631`, which only covers IPv4 despite the comment saying all interfaces. I changed it to `Port 631`, matching Ubuntu documentation for listening on all interfaces.
- The Bonjour/AirPrint sharing configuration only set `BrowseLocalProtocols dnssd`. I added `BrowseDNSSDSubTypes _cups,_print` so the advertised shared queues indicate both CUPS sharing and IPP Everywhere-style discovery.
- The authenticated printer example created `macuser` with `lppasswd` but required membership in `@SYSTEM` or `@lp`, so the created user would not necessarily satisfy the policy. I changed the policy to `Require user macuser` and the setup command to create a local user.
- The completed-job monitoring command used `lpstat -W completed -p OfficeHP`, which reports printer status rather than completed jobs. I changed it to `lpstat -W completed -o OfficeHP`.
- The page-count example grepped `Successful-OK` from `page_log`, but CUPS records IPP status strings in `access_log`, while `page_log` uses page accounting fields. I changed the example to read page accounting fields from `page_log`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some printer-driver details remain hardware-specific: legacy USB printers can still require vendor drivers or printer applications, while driverless queues should prefer IPP Everywhere where available.
