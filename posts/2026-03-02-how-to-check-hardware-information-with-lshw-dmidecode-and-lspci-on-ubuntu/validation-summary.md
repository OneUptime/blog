# Validation Summary: How to Check Hardware Information with lshw, dmidecode, and lspci on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- lshw
- dmidecode
- lspci
- lsusb
- pciutils
- usbutils
- Bash shell commands

## Sources Consulted
- Local `lshw(1)` manual page; Ubuntu manpage: https://manpages.ubuntu.com/manpages/jammy/man1/lshw.1.html
- Local `dmidecode(8)` manual page; Ubuntu manpage: https://manpages.ubuntu.com/manpages/jammy/man8/dmidecode.8.html
- Local `lspci(8)` manual page; Linux man-pages mirror: https://man7.org/linux/man-pages/man8/lspci.8.html
- Local `lsusb(8)` manual page; Linux man-pages mirror: https://man7.org/linux/man-pages/man8/lsusb.8.html
- Ubuntu `update-pciids(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/update-pciids.8.html

## Issues Found
- `sudo dmidecode -t port` used an invalid DMI type keyword. Changed it to `sudo dmidecode -t connector`, which is the documented keyword for port connector records.
- The post described `dmidecode` output as accurate hardware information. Changed this to firmware-reported information because the `dmidecode` manual notes that SMBIOS/DMI data can be unreliable when firmware reports incorrect values.
- The `lshw -short | grep -v "\-"` example did not reliably show hardware without drivers. Changed it to filter for `UNCLAIMED`, which is the relevant `lshw` status for devices without an attached driver.
- Several memory examples used broad `Size` or `Memory Device` matches that can include non-slot DMI records such as memory array capacity or memory mapped address records. Tightened the filters to match actual `Size:` fields and exact `Memory Device` records.
- The physical CPU count example counted socket designations rather than populated processors. Changed it to count populated processor status entries.
- Two `lspci -k` pipelines intended to find devices without drivers actually selected output around devices with drivers. Replaced them with an `awk` command that prints device records lacking `Kernel driver in use`.
- The unknown-hardware example used `lspci -nn | grep -v "Linux Foundation"` and suggested unknown devices show `0000:0000`. Replaced this with a specific `lspci -nn -s` lookup and a full `lspci -nn` after `sudo update-pciids`.

## Review Notes
The main CLI flags and package names were current for Ubuntu. Some examples remain intentionally simple for readability, but the corrected filtering avoids the misleading results found during review.
