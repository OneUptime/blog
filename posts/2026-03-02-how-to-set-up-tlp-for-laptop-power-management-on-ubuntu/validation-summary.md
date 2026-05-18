# Validation Summary: How to Set Up TLP for Laptop Power Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TLP (Linux Advanced Power Management)
- TLP-RDW (Radio Device Wizard)
- Ubuntu 22.04+
- systemd / systemctl
- power-profiles-daemon (conflict handling)
- tp-smapi-dkms, acpi-call-dkms (ThinkPad battery threshold modules)
- Intel P-State / CPU frequency governors
- SATA ALPM, PCIe ASPM, USB autosuspend
- `tlp-stat`, `lsusb`, `upower`, `acpi` CLI tools
- sysfs `/sys/class/power_supply/BAT0`

## Sources Consulted
- TLP official documentation: https://linrunner.de/tlp/
- TLP introduction (config file locations): https://linrunner.de/tlp/settings/introduction.html
- TLP processor settings: https://linrunner.de/tlp/settings/processor.html
- TLP disk settings: https://linrunner.de/tlp/settings/disks.html
- TLP USB settings: https://linrunner.de/tlp/settings/usb.html
- TLP `tlp-stat` usage: https://linrunner.de/tlp/usage/tlp-stat.html
- TLP `defaults.conf` (current parameter list): https://github.com/linrunner/TLP/blob/main/defaults.conf
- TLP `deprecated.conf` (removed parameters): https://github.com/linrunner/TLP/blob/main/deprecated.conf
- TLP `rename.conf` (BLACKLIST → DENYLIST mapping): https://github.com/linrunner/TLP/blob/main/rename.conf
- `tlp(8)` and `tlp-stat(8)` manpages

## Issues Found

1. **Removed parameter `USB_AUTOSUSPEND_DISABLE_ON_SHUTDOWN`**: This option was removed from TLP and is listed in `deprecated.conf`. The post also mislabeled it with the comment "Autosuspend delay in seconds" (it was historically a boolean, not a delay). Replaced the entry with the still-supported `USB_EXCLUDE_*` device-class options that better illustrate how to exclude problematic USB devices.

2. **Duplicate `USB_AUTOSUSPEND=1` line with misleading comment**: The post declared `USB_AUTOSUSPEND=1` twice, the second time with a comment claiming it enables "input devices (mouse, keyboard) autosuspend". `USB_AUTOSUSPEND` is a single global toggle — there is no per-device-class input control. Removed the duplicate.

3. **Removed parameter `RESTORE_DEVICE_STATE_ON_STARTUP`**: This option was removed from TLP and is listed in `deprecated.conf`. Replaced with the current `DEVICES_TO_DISABLE_ON_STARTUP` / `DEVICES_TO_ENABLE_ON_STARTUP` parameters which serve the same purpose under tlp-rdw.

4. **Incorrect config path `/etc/tlp/tlp.conf`**: TLP's configuration file is `/etc/tlp.conf` (single file, not a subdirectory). No `/etc/tlp/tlp.conf` exists. Drop-ins live at `/etc/tlp.d/*.conf`. Corrected to `/etc/tlp.conf`.

5. **`tlp-stat -e` mislabeled as "PCI devices"**: The `-e` flag is `--pcie` and shows PCIe device tunables, not PCI. Corrected to "PCIe devices".

6. **`tlp-stat -r` mislabeled as "RadioManagement (with tlp-rdw)"**: The `-r` flag (`--rfkill`) shows radio device state via rfkill. It is not specific to tlp-rdw. Corrected to "Radio device state (rfkill)".

7. **Misleading comment `CPU_SCALING_MAX_FREQ_ON_AC=0   # 0 = use hardware max`**: Per TLP docs, setting these to `0` disables the setting (leave at kernel default), which is not the same semantic as "use hardware max". Corrected the comment to "0 = leave at kernel default".

## Review Notes

- The `acpi-call-dkms` package is listed twice (once for ThinkPads, once for ASUS/Samsung/HP) — left as-is since it's a stylistic redundancy, not a technical error, and the two contexts are different audiences.
- The `tp-smapi-dkms` recommendation for ThinkPad battery thresholds is conservative. Modern ThinkPads (kernel ≥ 5.5 with `thinkpad_acpi`) generally don't need `tp-smapi`, but the post's guidance still works on older models and won't break newer ones.
- `cat /sys/class/power_supply/BAT0/capacity` is grouped under a "Check wear level" comment, but `capacity` shows current charge percent, not wear. Wear level is `charge_full / charge_full_design`. The individual commands are still valid; left as-is since all three are useful battery-health probes.
- The "Long life (mostly plugged in): start=20, stop=80" threshold strategy is unusual — most ThinkPad users would pair `start=75` with `stop=80` for an always-plugged scenario. Not technically wrong (start=20 stop=80 just lets the battery cycle further before recharging) so left as-is.
- The post is broadly accurate and reflects current TLP behavior on Ubuntu 22.04+ after the fixes above.
