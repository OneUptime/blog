# Validation Summary: How to Configure Wake-on-LAN on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Wake-on-LAN (WoL) / magic packets
- Ubuntu / Linux networking
- ethtool
- systemd services
- /etc/rc.local (rc-local generator)
- NetworkManager (nmcli)
- Netplan (systemd-networkd renderer)
- wakeonlan and etherwake CLI tools
- Python (socket-based magic packet sender, WoL relay)
- Flask + gunicorn (WoL web interface)
- iptables / netfilter-persistent
- tcpdump

## Sources Consulted
- ethtool man page / `ethtool(8)` — `-s ... wol` flags (p, u, m, b, a, g, s, d) and `sopass` for SecureOn
- Netplan reference documentation (https://netplan.readthedocs.io/) — `wakeonlan`, `routes`, and deprecation of `gateway4`/`gateway6`
- NetworkManager `nm-settings` reference — `802-3-ethernet.wake-on-lan` property values
- wakeonlan(1) and etherwake(8) man pages — `-i`, `-p` flags
- Wikipedia / AMD Magic Packet technology spec — magic packet format (6×0xFF + 16× MAC = 102 bytes), EtherType 0x0842, UDP ports 7/9
- Python `socket` library docs — `SO_BROADCAST`, `sendto`

## Issues Found
1. **Deprecated `gateway4` directive in Netplan static-IP example.** The static configuration used `gateway4: 192.168.1.1`. The `gateway4`/`gateway6` keys have been deprecated in Netplan since v0.103 (Ubuntu 20.04+) and emit a deprecation warning on `netplan generate`/`apply`, with removal planned. Since the post explicitly targets "modern Ubuntu," I replaced it with the recommended `routes:` form:

   ```yaml
   routes:
     - to: default
       via: 192.168.1.1  # Default gateway (gateway4 is deprecated)
   ```

   This is functionally equivalent and is the currently supported syntax.

## Review Notes
- The magic packet format (6 bytes of 0xFF followed by the MAC repeated 16 times = 102 bytes), the ethtool WoL flag table, the EtherType `0x0842`, and the standard UDP port 9 are all accurate.
- The Python magic-packet and relay scripts are syntactically correct and use the socket API properly (`SO_BROADCAST`, context-managed sockets).
- `sudo systemctl enable rc-local` (Method 2) is a known gotcha: `rc-local.service` is a static unit, so on modern systemd `enable` may report that it cannot be enabled. The service still runs at boot via the systemd rc-local generator as long as `/etc/rc.local` exists and is executable. This was left as-is because the approach still works in practice and is widely documented; readers should not be alarmed if `enable` prints a "static" notice.
- `After=network.target` in the systemd WoL unit does not strictly guarantee the interface is fully up; `network-online.target` (with the corresponding wait service) would be more robust on some systems. The current form works on most setups and was left unchanged as it is not incorrect.
- The NetworkManager `802-3-ethernet.wake-on-lan "magic,broadcast"` combined-flags value is valid for the flags-style property; correct as written.
- `wakeonlan -i 127.0.0.1` in the diagnostics section is only a local sanity test and will not wake remote hosts; it is presented as a test command, which is acceptable.
