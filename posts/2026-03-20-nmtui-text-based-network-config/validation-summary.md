# Validation Summary: How to Use nmtui for Text-Based Network Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nmtui (NetworkManager Text User Interface)
- NetworkManager
- nmcli (referenced for comparison and reactivation)
- Linux distributions: Debian/Ubuntu, RHEL/CentOS/AlmaLinux
- Package managers: apt, dnf

## Sources Consulted
- NetworkManager official documentation: https://networkmanager.dev/docs/
- nmtui(1) man page (Red Hat): https://man7.org/linux/man-pages/man1/nmtui.1.html
- nmcli(1) man page: https://man7.org/linux/man-pages/man1/nmcli.1.html
- Red Hat documentation on configuring networking with nmtui: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-networking-with-nmtui_configuring-and-managing-networking
- Debian/Ubuntu package metadata for `network-manager` (which provides `nmtui`)
- Fedora/RHEL package metadata for `NetworkManager-tui`

## Issues Found
No technical issues found.

All commands, package names, navigation keys, and menu descriptions are accurate:
- The three main menu options (Edit a connection, Activate a connection, Set system hostname) match nmtui's actual UI.
- Navigation keys (Tab, Space/Enter, Esc) are correct.
- Package names are correct: `network-manager` on Debian/Ubuntu (which bundles nmtui) and `NetworkManager-tui` on RHEL-family distributions.
- The static IP configuration steps (Manual mode, CIDR address, gateway, DNS server) match nmtui's IPv4 CONFIGURATION section.
- `nmcli connection up "Wired connection 1"` is the correct command to reapply changes after editing a profile.
- The asterisk `*` indicator for active connections is accurate.

## Review Notes
- The note "(requires root/sudo)" next to the `nmtui` command is a reasonable simplification. In practice, nmtui can be launched by an unprivileged user, but most modification operations require PolicyKit authorization or root. For typical server use cases (the post's focus), running with sudo is the practical default.
- The fenced code block for the ASCII menu uses `sql` as the language hint. This is a stylistic/highlighter choice rather than a technical issue — it does not affect rendering correctness.
- nmtui is technically built on the `newt` library (which uses S-Lang under the hood), not raw `ncurses`. However, "curses-based" is widely used colloquially to describe such TUIs and is not a meaningful inaccuracy for the audience.
