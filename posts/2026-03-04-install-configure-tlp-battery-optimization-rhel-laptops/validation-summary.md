# Validation Summary: How to Install and Configure TLP for Battery Optimization on RHEL Laptops

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL
- TLP and `tlp-rdw`
- `systemd`
- Linux power management
- ThinkPad battery charge thresholds
- UPower

## Sources Consulted
- TLP documentation: Fedora installation and RHEL/CentOS EPEL note - https://linrunner.de/tlp/installation/fedora.html
- TLP documentation: `tlp` usage - https://linrunner.de/tlp/usage/tlp.html
- TLP documentation: `tlp-stat` usage - https://linrunner.de/tlp/usage/tlp-stat.html
- TLP documentation: processor settings - https://linrunner.de/tlp/settings/processor.html
- TLP documentation: networking settings - https://linrunner.de/tlp/settings/network.html
- TLP documentation: disks and controllers settings - https://linrunner.de/tlp/settings/disks.html
- TLP documentation: PCIe ASPM settings - https://linrunner.de/tlp/settings/runtimepm.html
- TLP documentation: USB autosuspend settings - https://linrunner.de/tlp/settings/usb.html
- TLP documentation: battery care settings - https://linrunner.de/tlp/settings/battery.html
- TLP documentation: `power-profiles-daemon` conflict guidance - https://linrunner.de/tlp/faq/ppd.html
- Fedora Packages: TLP package availability in Fedora EPEL - https://packages.fedoraproject.org/pkgs/tlp/tlp/
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream - https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- Added CodeReady Builder enablement and changed the EPEL command from `dnf install epel-release` to the official EPEL release RPM URL using `$(rpm -E %rhel)`, because clean RHEL systems need CRB enabled for EPEL dependencies and do not generally have `epel-release` available before EPEL is enabled.
- Replaced the broad ThinkPad `akmod-tp_smapi` install command with `tlp-stat -b` recommendation checking. Upstream TLP documents external ThinkPad kernel modules as legacy-only and needed only when `tlp-stat -b` recommends them; the package is also repository-dependent.
- Corrected `tlp-stat -p` descriptions. TLP documents `-p` as processor tunables, not power consumption estimates or current power draw.
- Changed the apply step verification comment from "settings are active" to "configured settings are loaded", because `tlp-stat -c` shows active configuration rather than proving every kernel tunable took effect.
- Replaced `tlp-stat -p` with `tlp-stat -b` for checking battery status and rate information.
- Changed the closing statement that TLP works alongside RHEL's default power management. TLP documentation states that `power-profiles-daemon` conflicts with TLP and should be uninstalled or stopped and masked when used in parallel.

## Review Notes
Several settings in the sample configuration are hardware- and kernel-dependent. The post now remains technically correct, but future improvements could mention checking `tlp-stat` output for available CPU governors, platform profiles, battery names, and charge threshold support before applying model-specific tuning.
