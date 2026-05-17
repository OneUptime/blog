# Validation Summary: How to Set Up Bluetooth on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BlueZ (Linux Bluetooth protocol stack, version 5.x)
- bluetoothctl (interactive Bluetooth CLI)
- hciconfig / hcitool (legacy Bluetooth utilities)
- gatttool (legacy BLE GATT utility)
- rfcomm (Bluetooth Serial Port Profile)
- rfkill (RF blocking management)
- systemd (bluetooth.service)
- udev rules (USB autosuspend tuning)
- Python 3 (with python3-gattlib for BLE)
- Ubuntu Server packaging (apt, bluez, bluez-tools)

## Sources Consulted
- BlueZ project documentation and source: https://github.com/bluez/bluez
- `bluetoothctl` interactive help output (verified against BlueZ 5.72 on Ubuntu 24.04)
- `bluetoothctl(1)` man page
- Ubuntu package archive (`apt-cache show bluez`, `bluez-tools`, `python3-gattlib`) — all packages confirmed to exist in current Ubuntu repos (universe for `bluez-tools` and `python3-gattlib`)
- Linux kernel USB sysfs documentation (Documentation/ABI/testing/sysfs-bus-usb) — verified `power/autosuspend` and `power/autosuspend_delay_ms` attributes
- `/etc/bluetooth/main.conf` reference (BlueZ source: src/main.conf)
- Bluetooth SIG Class of Device assigned numbers (verified 0x000100 == major class "Computer", minor "Uncategorized")

## Issues Found
No technical issues found.

All commands, flags, configuration keys, and code samples were verified against current BlueZ 5.72 (Ubuntu 24.04) and Linux kernel sysfs behavior:

- `bluetoothctl` subcommands (`show`, `power`, `pairable`, `discoverable`, `discoverable-timeout`, `agent`, `default-agent`, `scan <on/off/bredr/le>`, `devices [Paired/...]`, `info`, `quit`, `--version`) all match the live `help` output.
- `/etc/bluetooth/main.conf` keys (`AutoEnable`, `Name`, `Class`, `DiscoverableTimeout`, `PairableTimeout`, `ControllerMode = dual`, `DisabledPlugins`) match BlueZ defaults.
- `python3-gattlib` package exists in the Ubuntu universe repository.
- The udev rule for disabling USB autosuspend via `ATTR{power/autosuspend}="-1"` is valid (the attribute still exists in modern kernels).
- `rfcomm bind`, `hciconfig` subcommands, and `hcitool lescan` syntax are all correct.
- The Python regex `r'([0-9A-F:]{17})\s+(.*)'` correctly parses `hcitool lescan` output.

## Review Notes
- `hcitool`, `hciconfig`, and `gatttool` have been marked deprecated by the BlueZ project for several years in favor of `bluetoothctl` and the D-Bus API. They still ship and work in current BlueZ packages, but future BlueZ releases may drop them. The post does present `bluetoothctl` as the primary tool, which is the right framing.
- The `power/autosuspend` sysfs attribute (in seconds) is the older interface; the modern replacement is `power/autosuspend_delay_ms` (in milliseconds) plus `power/control` (`on`/`auto`). Both currently coexist, so the post's udev rule still works, but `ATTR{power/control}="on"` is the cleaner long-term approach.
- `python3-gattlib` is imported in the example only indirectly (the Python script actually shells out to `hcitool lescan` rather than using the library), so the package install is somewhat optional for the shown example.
- `Class = 0x000100` corresponds to "Computer / Uncategorized" — appropriate for a generic server.
- `ControllerMode = dual` is the BlueZ default; the line is shown for clarity but could be omitted unless overriding.
