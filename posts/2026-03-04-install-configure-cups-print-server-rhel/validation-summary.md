# Validation Summary: How to Install and Configure CUPS Print Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- CUPS
- firewalld
- systemd
- CUPS command-line tools: `lpadmin`, `lpinfo`, `lpstat`, `lp`, `cupsctl`

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using a CUPS printing server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_a_cups_printing_server/index
- OpenPrinting `cupsd.conf(5)` manual: https://openprinting.github.io/cups/doc/man-cupsd.conf.html
- OpenPrinting `lpadmin(8)` manual: https://openprinting.github.io/cups/doc/man-lpadmin.html
- OpenPrinting `cupsctl(8)` manual: https://openprinting.github.io/cups/doc/man-cupsctl.html
- OpenPrinting `lpstat(1)` manual: https://openprinting.github.io/cups/doc/man-lpstat.html
- OpenPrinting CUPS command-line printer administration guide: https://www.cups.org/doc/admin.html

## Issues Found
- The firewall section opened CUPS twice by using both `--add-service=ipp` and `--add-port=631/tcp`. Red Hat's RHEL CUPS guide documents opening TCP port 631 directly, so the redundant `--add-service=ipp` command was removed.
- The web interface section pointed users to `https://your-server-ip:631` for the general interface. Red Hat documents `http://<hostname>:631` for the basic web UI and HTTPS for authenticated administration, so the URL was corrected and the `/admin/` HTTPS URL was added for administrative tasks.
- The printer discovery command used `lpstat -p -d`, which lists configured printers and the default destination rather than detected printer devices. It was changed to `lpinfo -v`, which CUPS documents for listing available devices.
- The test print command used `/usr/share/cups/data/testprint`. Red Hat documents `/usr/share/cups/data/default-testpage.pdf` for printing a CUPS test page, so the path was corrected.
- The sharing section said `cupsctl --share-printers` shares all printers. CUPS documentation says it enables sharing globally, while individual printers still need `lpadmin -p <printer> -o printer-is-shared=true`, so the comment was corrected.
- The sharing verification command used `lpstat -v`, which shows printer device URIs, not sharing state. It was changed to check the `cupsctl` `_share_printers=1` setting.

## Review Notes
The `lpadmin -m drv:///...` example is valid for a locally available driver URI, but CUPS and Red Hat both prefer driverless printing and document that printer drivers and PPD-based workflows are deprecated for future CUPS releases. The post already includes an IPP Everywhere example using `-m everywhere`.
