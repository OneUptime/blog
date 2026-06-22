# Validation Summary: How to Set Up a Print Server (CUPS) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- CUPS / cupsd
- cups-browsed
- IPP / IPPS / IPP Everywhere
- DNS-SD / mDNS / Avahi
- lpadmin, lpstat, lp, cancel, cupsctl, ipptool
- UFW firewall rules
- Windows and macOS IPP clients

## Sources Consulted
- OpenPrinting CUPS `cupsd.conf(5)` manual: https://www.cups.org/doc/man-cupsd.conf.html
- OpenPrinting CUPS `lpadmin(8)` manual: https://openprinting.github.io/cups/doc/man-lpadmin.html
- OpenPrinting CUPS `cupsd(8)` manual: https://openprinting.github.io/cups/doc/man-cupsd.html
- Ubuntu Server CUPS print server documentation: https://ubuntu.com/server/docs/how-to/networking/cups-print-server/
- Linux `cups-files.conf(5)` manual: https://man7.org/linux/man-pages/man5/cups-files.conf.5.html
- `cups-browsed.conf(5)` manual from the installed system and Arch manual pages: https://man.archlinux.org/man/cups-browsed.conf.5.en
- Local command manuals and help output for `lpadmin`, `cupsctl`, `lpstat`, `cancel`, `lpq`, `cupsd`, and `cups-browsed`

## Issues Found
- `cups-config --version` was shown after installing standard CUPS packages, but `cups-config` is not available in a normal runtime install on the reviewed system. Changed it to `dpkg-query -W cups` to check the installed Ubuntu package version.
- Several CUPS `<Limit ...>` directives were wrapped across multiple physical lines. `cupsd -t` rejected that syntax. Rewrote those directives as single-line tags.
- The first `cupsd.conf` policy omitted an explicit `Create-Job Print-Job Print-URI Validate-Job` limit and included obsolete/invalid `CUPS-Get-Drivers`. Added the job-submission limit and removed `CUPS-Get-Drivers`.
- Remote web access was documented as `https://your-server-ip:631`. Ubuntu documents the web interface at HTTP port 631, with HTTPS used when authentication/encryption is required. Changed the remote URL to `http://your-server-ip:631` and clarified the HTTPS certificate behavior.
- `BrowseAddress @LOCAL` is not a current `cupsd.conf` directive in the reviewed CUPS documentation. Removed it from the sharing snippet.
- The quota section said CUPS has no built-in quota support and provided an unintegrated shell script. Replaced it with CUPS queue quota options: `job-quota-period`, `job-page-limit`, and `job-k-limit`.
- The printer state comment said `cupsenable`/`cupsdisable` controlled whether a printer accepts jobs. Corrected it to say they control processing jobs; `cupsaccept`/`cupsreject` handle accepting new jobs.
- The `cups-browsed.conf` example used stale or unsupported discovery settings: `BrowseRemoteProtocols dnssd cups`, `CreateIPPPrinterQueues All` with a separate `IPPPrinterQueueType Driverless`. Updated it to `BrowseRemoteProtocols dnssd` and `CreateIPPPrinterQueues Driverless`.
- The troubleshooting section used `rm -rf /var/spool/cups/*`, which can remove spool subdirectories. Changed it to delete only files at the top level of the spool directory.
- The diagnostic command attempted to execute `/usr/share/cups/cupsd.conf.default`. Changed it to view the file with `less`.
- The network troubleshooting example used HTTPS on port 631 for a simple web check. Changed it to HTTP to match the documented CUPS web interface URL.
- The production `cupsd.conf` example included `ServerCertificate`, `ServerKey`, and `SystemGroup`, which belong to current CUPS file/TLS configuration handling outside `cupsd.conf`. Replaced them with explanatory comments.
- The production example used `ServerAlias *`, which the CUPS manual warns can expose DNS rebinding risk. Replaced it with explicit aliases.
- The production example duplicated encrypted listeners with both `SSLListen *:443` and `SSLPort 443`. Removed `SSLListen *:443`.
- The production example weakened authenticated encryption with `DefaultEncryption IfRequested`. Changed it to `DefaultEncryption Required`.
- The production example included obsolete or wrong directives `BrowseTimeout` and `MaxRequestSize`. Removed `BrowseTimeout` and changed `MaxRequestSize 0` to `LimitRequestBody 0`.

## Review Notes
The CUPS `cupsd.conf` examples were linted locally with `cupsd -t -c`. They now parse successfully; the remaining local output was limited to non-root permission warnings for system spool/cache paths and default privacy-policy notices. The article still uses some legacy PPD/model examples for non-driverless printers; `lpadmin` documents non-`everywhere` models as deprecated for future CUPS releases, but they remain relevant for existing Ubuntu deployments with legacy printer drivers.
