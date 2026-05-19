# Validation Summary: How to Set Up CUPS with IPP Everywhere on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CUPS (Common UNIX Printing System)
- IPP Everywhere (PWG standard)
- Avahi / mDNS / Bonjour
- AirPrint (Apple), Mopria (Android/Windows)
- Ubuntu (apt, systemd)
- lpadmin, lpinfo, lpstat, lpoptions, lp, lpq, cupsctl, cupsenable, cupsaccept, ipptool, avahi-browse, avahi-resolve-host-name

## Sources Consulted
- CUPS official documentation: https://www.cups.org/doc/
- CUPS lpadmin man page: https://www.cups.org/doc/man-lpadmin.html
- CUPS cupsctl man page: https://www.cups.org/doc/man-cupsctl.html
- CUPS cupsd.conf reference: https://www.cups.org/doc/man-cupsd.conf.html
- IETF RFC 8011 (IPP/1.1): https://datatracker.ietf.org/doc/html/rfc8011 — for `print-quality` enum values
- PWG IPP Everywhere specification: https://www.pwg.org/ipp/everywhere.html
- PWG self-certification & IPP attribute registry: https://www.pwg.org/ipp/
- Avahi documentation: https://avahi.org/
- Ubuntu package documentation for cups, cups-ipp-utils, avahi-utils

## Issues Found

1. **Incorrect `print-quality` enum values comment.** The post said `# 5=best, 3=normal, 4=high` on the `lp -o print-quality=5` example. Per RFC 8011 §5.2.13 and the IPP attribute registry, the canonical values are `3=draft, 4=normal, 5=high`. Updated the comment to reflect the correct mapping.

2. **Incorrect CUPS model name `-m driverless` in the first `lpadmin` example.** The canonical CUPS model for IPP Everywhere driverless printing is `everywhere` (as is correctly used in the second `lpadmin` example in the same code block). The `driverless:` prefix is a URI scheme used by the cups-filters `driverless` backend (e.g. `lpinfo --include-schemes=driverless`), not a value for `-m`. Changed `-m driverless` to `-m everywhere` for consistency with CUPS documentation.

3. **Misleading comment on `cupsctl --remote-any`.** The original comment claimed this enables "Bonjour/mDNS broadcasting", but `--remote-any` actually allows printing/administration from any IP address (it's about remote access, not mDNS). Bonjour broadcasting is enabled via `BrowseLocalProtocols dnssd` and `--share-printers`. Updated the comment to accurately describe what the flag does.

## Review Notes

- The `ipptool -tv ipp://printer-hostname/ipp/print get-printer-attributes.test` example relies on ipptool resolving the test file from `CUPS_DATADIR` (typically `/usr/share/cups/ipptool/`). This generally works but is less robust than using the absolute path shown later in the post. Not a defect, just a minor consistency point.
- `curl -s ipp://printer-hostname.local/ipp/print -v` requires a curl build with IPP/cups protocol support. Most distro curl packages do not include it; if the user's curl lacks this, the command will fail with "Protocol 'ipp' not supported". A small caveat worth noting, but the command is plausibly useful when curl is built with cups support.
- The `<Location>` blocks use the legacy `Order allow,deny / Allow` syntax. This is still accepted by modern CUPS (2.x) for backward compatibility, but the newer recommended syntax uses `AuthType`/`Require`. Not technically wrong; just dated.
- The `-m everywhere` workflow depends on the printer responding to `Get-Printer-Attributes` with IPP Everywhere–compliant capability data. Some older or partially compliant printers may need the `cups-filters`/`ippeveps` package; the post correctly assumes a modern IPP Everywhere–capable printer.
- The bash script in "Multiple Printer Setup" uses associative arrays (`declare -A`), which requires bash 4.0+. Ubuntu has shipped with bash ≥ 4.x for many years, so this is fine.
