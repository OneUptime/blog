# Validation Summary: How to Troubleshoot CUPS Printing Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- CUPS (Common UNIX Printing System)
- Ubuntu (apt package management)
- systemd / systemctl
- journald (journalctl)
- IPP (Internet Printing Protocol)
- SMB/CIFS print sharing
- Kerberos / SASL GSSAPI authentication
- PPD (PostScript Printer Description) files
- HPLIP, Gutenprint, cups-pdf drivers
- CUPS CLI tools: `lp`, `lpstat`, `lpq`, `lpadmin`, `lpoptions`, `lpinfo`, `cancel`, `cupsctl`, `cupsenable`, `cupsaccept`, `cupstestppd`, `cups-config`, `cupsd`

## Sources Consulted
- CUPS official documentation: https://www.cups.org/documentation.html
- CUPS man pages: `lp(1)`, `lpstat(1)`, `lpadmin(8)`, `lpinfo(8)`, `lpoptions(1)`, `cupsctl(8)`, `cupsenable(8)`, `cupsaccept(8)`, `cupstestppd(1)`, `cupsd(8)`, `cancel(1)`
- CUPS command reference: https://www.cups.org/doc/man-lpadmin.html, https://www.cups.org/doc/man-lp.html
- Ubuntu CUPS package documentation: https://ubuntu.com/server/docs/service-cups
- Debian/Ubuntu package archives for `krb5-user`, `libsasl2-modules-gssapi-mit`, `printer-driver-*`, `hplip`, `smbclient`
- CUPS logging documentation: https://www.cups.org/doc/accounting.html

## Issues Found

1. **Invalid command `lp-release`** (Debugging a Specific Print Job section): The command `lp-release $JOBID` does not exist in CUPS. The standard way to release a held job is `lp -i $JOBID -H resume`. Fixed by replacing with the correct invocation.

2. **Incorrect raw mode syntax** (Diagnosing Print Quality Issues section): `lpadmin -p PrinterName -o raw` is not the correct syntax for switching a queue to raw mode. The `-o` flag sets job options, while the driver/model is set with `-m`. Fixed by changing to `-m raw` and adding `sudo` for consistency with admin commands. Also clarified the file format requirement — raw mode requires data already in the printer's native format, not strictly PostScript.

3. **Misleading Kerberos/NTLM package install** (Network Printer Authentication section): The line installed `libcups2 libcupsimage2`, which are just CUPS runtime libraries (typically already installed) and have no relationship to Kerberos or NTLM authentication. Replaced with `krb5-user` and `libsasl2-modules-gssapi-mit`, which are the actual packages needed for Kerberos/GSSAPI authentication with CUPS.

4. **Incorrect `lpstat -o` usage with a job ID** (Debugging a Specific Print Job section): `lpstat -l -o $JOBID` treats its argument as a destination (printer/class) name, not a job ID, so it would fail to look up the intended job. Fixed by using `lpstat -l -W not-completed | grep -A 10 "$JOBID"` to filter for the job ID from the long-form output.

## Review Notes

- The SMB printer example uses `-m everywhere` (IPP Everywhere model). This works only if the printer behind the SMB share also speaks IPP/PWG Raster. For older or vendor-specific SMB-shared printers, a manufacturer-specific PPD (or `-m raw`) may be required. Left as-is since the example does work for modern printers.
- `cupsenable`/`cupsaccept`/`cupsdisable`/`cupsreject` are the modern command names; older systems may also have `enable`/`accept`/`disable`/`reject`, but the modern names are preferred and correct here.
- `/usr/share/cups/data/default-testpage.pdf` and `/usr/share/cups/data/testprint` are present in Ubuntu's CUPS package (`cups-server-common`); references are accurate.
- The `cupsd -t` configuration syntax test is correct and supported.
- The SMB URI format `smb://domain;username:password@server/PrinterShare` is valid CUPS syntax (the `;` separates workgroup/domain from user).
- The `c0*`/`d0*` spool file naming convention in `/var/spool/cups/` is accurate (control and data files respectively).
- All journalctl, ss, systemctl, apt, and curl invocations are syntactically correct.
