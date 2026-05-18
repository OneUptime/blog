# Validation Summary: How to Set Up IPMI Remote Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPMI (Intelligent Platform Management Interface)
- ipmitool (Ubuntu CLI client, version 1.8.x)
- OpenIPMI (kernel modules: ipmi_devintf, ipmi_si)
- Ubuntu (apt, /etc/modules, GRUB serial console)
- Serial-over-LAN (SOL)
- HPM.1 firmware update standard
- BMC vendor implementations: Dell iDRAC, HP iLO, Supermicro IPMI, Lenovo XClarity

## Sources Consulted
- ipmitool manpage and source (https://github.com/ipmitool/ipmitool)
- Ubuntu packages: `ipmitool` 1.8.19 and `openipmi` 2.0.33 (verified via `apt-cache show`)
- IPMI v2.0 specification (Intel/HP/NEC/Dell) — privilege levels, channel/auth/cipher_privs semantics
- Linux kernel IPMI driver docs (Documentation/IPMI.txt) — `ipmi_devintf`, `ipmi_si` modules
- GRUB serial-console docs (https://www.gnu.org/software/grub/manual/grub/grub.html)
- HPM.1 (PICMG) firmware upgrade specification — used by `ipmitool hpm upgrade`

## Issues Found

1. **Misleading comment on `ipmi sensor get`** — the original comment claimed `ipmi sensor get "CPU Temp"` shows "only sensors in alarm state". In reality this command returns detailed info (thresholds, reading, status) for one named sensor; there is no built-in ipmitool subcommand that filters to alarm-only. Reworded the comment to "Get detailed info for a specific sensor".

2. **Unverifiable Dell raw command** — the original suggested `ipmi raw 0x30 0x01` "For Dell: check iDRAC firmware version". `0x30` is Dell's OEM NetFn, but `0x01` is not a documented "get firmware version" subcommand and behavior is undefined/varies across iDRAC versions. Replaced with `ipmi mc info` (alias for `bmc info` — the standard IPMI Get Device ID command that returns BMC firmware revision on every vendor).

3. **Missing `-I lanplus` on remote hpm upgrade** — the firmware-update example omitted the interface flag. Without `-I lanplus` ipmitool falls back to the default interface (often `open` for local KCS), which does not work for the remote host given by `-H`. Added `-I lanplus` for IPMI v2.0 remote sessions.

4. **Inaccurate claim that `lan set ... auth ... MD5` disables IPMI v1.5** — the `auth` parameter only selects which authentication algorithm is used for v1.5 sessions; it does not turn v1.5 off. Reworded the comment to describe what the command actually does and added a follow-up example using `lan set <ch> cipher_privs` (the correct knob for v2.0 cipher suite restriction), with a note that fully disabling IPMI v1.5 is generally a BMC-specific setting via the vendor's web UI or OEM commands.

## Review Notes
- All other ipmitool subcommands (`lan print/set`, `user list/enable/set`, `channel setaccess`, `chassis power/bootdev`, `sdr`, `sel`, `sol`) were verified against the ipmitool manpage and source; syntax and privilege-level mappings (1=Callback, 2=User, 3=Operator, 4=Administrator) are correct.
- `sel list last 20` syntax requires a reasonably recent ipmitool (added in upstream years ago, present in Ubuntu's 1.8.19) — fine for Ubuntu 22.04+ but may not work on very old distros.
- The `/etc/modules` approach for auto-loading kernel modules still works on Ubuntu via systemd-modules-load.service; the more modern `/etc/modules-load.d/<name>.conf` form is an alternative but not required.
- `cipher_privs` example uses a common conservative mask (disable cipher suites 0, 6, 11 — the no-auth / no-integrity ones); the actual safe set depends on the BMC's supported cipher suite list returned by `ipmitool channel getciphers ipmi`.
- The example admin passwords (`SecurePassword123!`, `OperatorPass123!`) are illustrative; readers should heed the later "Generate Strong Random Credentials" section in production.
