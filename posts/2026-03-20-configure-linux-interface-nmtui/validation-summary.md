# Validation Summary: How to Configure a Linux Network Interface with nmtui

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NetworkManager (nmtui, nmcli)
- Linux network configuration (IPv4, DHCP, static addressing)
- iproute2 (`ip addr`, `ip route`)
- systemd-resolved (`resolvectl`)
- Package managers (apt, dnf)

## Sources Consulted
- nmtui(1) man page (NetworkManager 1.46.0, locally installed)
- Live capture of the actual nmtui main menu output on Ubuntu (NetworkManager 1.46.0)
- Debian `network-manager` package metadata (`apt-cache show network-manager`, `dpkg -L network-manager`) confirming nmtui ships in the `network-manager` package
- Fedora/RHEL `NetworkManager-tui` package — https://packages.fedoraproject.org/pkgs/NetworkManager/NetworkManager-tui/
- NetworkManager upstream documentation — https://networkmanager.dev/docs/

## Issues Found
1. **Inaccurate main menu listing.** The post claimed `nmtui` shows "three options" and listed Edit a connection, Activate a connection, and Set system hostname. Capturing the actual TUI on NetworkManager 1.46.0 shows five entries: Edit a connection, Activate a connection, Set system hostname, **Radio**, and **Quit**. Updated the post to list all five entries with a brief note on what Radio does.
2. **Unverified `A` keyboard shortcut.** The post said "Press Enter to activate (or `A` for activate)" on the Activate a connection screen. There is no `A` accelerator documented in the nmtui man page or upstream sources, and newt-based dialogs do not support raw single-letter activation while focus is on the connection list. Replaced the parenthetical with an accurate description: pressing Enter triggers the highlighted button, which toggles between **Activate** and **Deactivate** depending on the connection's current state.

## Review Notes
- Package install commands are correct: on Debian/Ubuntu nmtui ships inside the `network-manager` package (verified via `dpkg -L`), and on RHEL/Fedora it lives in the separate `NetworkManager-tui` package.
- IPv4 example values (address `192.168.1.100/24`, gateway `192.168.1.1`, DNS `8.8.8.8`/`1.1.1.1`, search domain `example.com`) are syntactically valid for the nmtui form fields.
- `nmcli con up "Wired connection 1"` is the correct activation command after editing a connection profile.
- `resolvectl status | grep "DNS Servers"` only works on systems using systemd-resolved. Distros that still rely on `/etc/resolv.conf` written directly by NetworkManager will not show output; users on those systems can fall back to `cat /etc/resolv.conf` or `nmcli dev show | grep DNS`. Not changed in the post since systemd-resolved is the default on most modern distros.
- `hostname` is a valid verification command; `hostnamectl` would also show the static/transient/pretty hostname distinctions, but the post's choice is fine for a quick check.
