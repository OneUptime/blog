# Validation Summary: How to Configure CUPS for Duplex Printing on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- CUPS
- IPP printing
- CUPS command-line tools: `lp`, `lpadmin`, `lpoptions`, `lpstat`, `lpinfo`, `lpq`, `ipptool`
- CUPS `cupsd.conf`
- PPD printer option files
- LibreOffice command-line printing
- Ghostscript

## Sources Consulted
- OpenPrinting CUPS Command-Line Printing and Options: https://openprinting.github.io/cups/doc/options.html
- OpenPrinting CUPS `lpadmin(8)` manual: https://openprinting.github.io/cups/doc/man-lpadmin.html
- OpenPrinting CUPS `lp(1)` manual: https://openprinting.github.io/cups/doc/man-lp.html
- OpenPrinting CUPS `lpoptions(1)` manual: https://openprinting.github.io/cups/doc/man-lpoptions.html
- OpenPrinting CUPS `ipptool(1)` manual: https://openprinting.github.io/cups/doc/man-ipptool.html
- OpenPrinting CUPS `lpinfo(8)` manual: https://openprinting.github.io/cups/doc/man-lpinfo.html
- CUPS `cupsd.conf(5)` manual: https://www.cups.org/doc/man-cupsd.conf.html
- Ubuntu Server documentation, Install and configure a CUPS print server: https://ubuntu.com/server/docs/how-to/networking/cups-print-server/
- Local manual pages for `lp`, `lpadmin`, `lpoptions`, `lpstat`, `lpinfo`, `lpq`, `ipptool`, and `cupsd.conf`
- Local LibreOffice 24.2.7.2 command-line help

## Issues Found
- The post used the legacy PPD option `Duplex=DuplexNoTumble` as the primary command-line method. CUPS documents the standard job option as `sides=two-sided-long-edge` / `sides=two-sided-short-edge`, and server-side defaults should be set as `sides-default=...` with `lpadmin`. Updated default-setting and per-job examples to use `sides`.
- The printer capability examples emphasized `Duplex` only. Updated the grep patterns and IPP check to include `sides`, which is the standard IPP/CUPS option name.
- The "all new printers" section created a script in `/etc/cups/interfaces` and described it as a printer-add event hook. Current CUPS documentation says interface scripts are not supported. Replaced it with a provisioning script that iterates existing CUPS destinations and applies `sides-default` where duplex support is advertised.
- The LibreOffice example was labeled as command-line printing with duplex but used `--print-to-file`, which prints to a file rather than sending the document to the named printer. Replaced it with `libreoffice --headless --pt MyPrinter document.odt`, which prints to the named printer and uses the CUPS queue defaults.
- The multi-user verification command used `lpoptions -d`, which shows or sets the default destination, not the printer's duplex option. Replaced it with `lpoptions -p MyPrinter | grep sides`.

## Review Notes
- The PPD editing section remains technically applicable for legacy PPD-based queues, but CUPS printer drivers and PPD files are deprecated for future CUPS feature releases. Prefer IPP Everywhere and standard IPP/CUPS options such as `sides` where possible.
