# Validation Summary: How to Use IPMI/BMC for Remote Server Management on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPMI (Intelligent Platform Management Interface)
- BMC (Baseboard Management Controller)
- ipmitool CLI
- Linux IPMI kernel drivers (ipmi_msghandler, ipmi_devintf, ipmi_si)
- OpenIPMI daemon
- Serial Over LAN (SOL)
- prometheus-community/ipmi_exporter
- GRUB serial console configuration
- systemd serial-getty

## Sources Consulted
- ipmitool(1) man page — https://man.archlinux.org/man/extra/ipmitool/ipmitool.1.en
- Linux IPMI Driver documentation (kernel.org) — https://docs.kernel.org/driver-api/ipmi.html
- Thomas-Krenn wiki: Configuring IPMI under Linux using ipmitool — https://www.thomas-krenn.com/en/wiki/Configuring_IPMI_under_Linux_using_ipmitool
- prometheus-community/ipmi_exporter releases — https://github.com/prometheus-community/ipmi_exporter/releases
- Ubuntu openipmi package — https://packages.ubuntu.com/openipmi
- ipmitool issue #29 (cipher suites) — https://github.com/ipmitool/ipmitool/issues/29
- OpenBMC ipmitool cheatsheet — https://github.com/openbmc/docs/blob/master/IPMITOOL-cheatsheet.md
- IPMI v2.0 specification (cipher suite definitions for suites 3 and 17)

## Issues Found
1. **Incorrect `cipher_suite_priv_max` value in the Security Considerations section.** The post had `XcXXXXXXXXXXXXXX`, which would disable every cipher suite except suite 1 (callback-only). This would break authenticated access via cipher suites 3 and 17 — the opposite of the stated intent. Replaced with `XaaaaXXaaaaXXaaX`, which disables cipher 0 (the well-known auth-bypass) and leaves the secure suites (including 3 and 17) at Administrator level. Also added an inline comment explaining the encoding (X/c/u/o/a → privilege levels) so the syntax is comprehensible.

2. **Missing systemd unit for ipmi_exporter.** The post ran `systemctl enable --now ipmi_exporter` directly after extracting the release tarball. Verified by inspecting the v1.8.0 release: the tarball contains only `LICENSE` and the `ipmi_exporter` binary — no systemd unit. The original command would fail with "Unit ipmi_exporter.service not found." Added a `tee` block that creates `/etc/systemd/system/ipmi_exporter.service` with a minimal unit, followed by `daemon-reload` before the enable.

## Review Notes
- Kernel modules (`ipmi_msghandler`, `ipmi_devintf`, `ipmi_si`), power subcommands (`status`/`on`/`off`/`soft`/`cycle`/`reset`), user/channel/lan/sensor/sel/sol commands, the SOL escape sequence (`~.`), and the GRUB serial console setup are all correct and current.
- The `openipmi` Ubuntu package ships a SysV init script, but systemd's sysv-generator wraps it, so `systemctl enable --now openipmi` works on modern Ubuntu releases as shown.
- The privilege-level list in the user section omits 1=Callback and 5=OEM, but that's a reasonable simplification for a tutorial focused on practical use.
- `ipmi_exporter` v1.8.0 is current as of the validation date; future readers may want to check the releases page for newer versions.
- The post correctly notes that cipher suite 17 uses AES-128 (specifically AES-CBC-128 with HMAC-SHA256), and recommends `-I lanplus -C 17` which is the modern best-practice invocation.
- Choice of `ttyS1` vs `ttyS0` for the SOL serial console is BMC-vendor-specific; the example value is fine as illustration.
