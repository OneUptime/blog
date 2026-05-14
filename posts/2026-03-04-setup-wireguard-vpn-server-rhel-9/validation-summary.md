# Validation Summary: How to Set Up a WireGuard VPN Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- wireguard-tools (`wg`, `wg-quick`)
- firewalld / `firewall-cmd`
- Linux IP forwarding and NAT masquerading
- systemd service enablement

## Sources Consulted
- Red Hat Enterprise Linux 9 networking documentation, "Setting up a WireGuard VPN": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 release notes, Technology Previews: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/technology_previews
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- `wg(8)` manual from wireguard-tools: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- `wg-quick(8)` manual from wireguard-tools: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- `firewall-cmd(1)` manual from firewalld: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post said WireGuard is supported in the RHEL kernel without mentioning Red Hat's RHEL 9 Technology Preview status. Updated the wording to say WireGuard runs in the kernel on RHEL 9 and is provided as a Technology Preview.
- The prerequisites and installation commands said EPEL was required for `wireguard-tools`. Red Hat's RHEL 9 documentation installs `wireguard-tools` directly with `dnf install wireguard-tools`, so the EPEL prerequisite and `epel-release` command were removed.
- The server private key generation command used `tee` without redirecting stdout, which prints the private key to the terminal. Redirected `tee` output to `/dev/null` while still writing the key file.
- The client key generation command did not set restrictive file permissions. Added `umask 077` before generating the client private key.

## Review Notes
- The WireGuard configuration keys (`PrivateKey`, `Address`, `ListenPort`, `PostUp`, `PostDown`, `PublicKey`, `AllowedIPs`, `Endpoint`, `PersistentKeepalive`, and `DNS`) match the documented `wg` and `wg-quick` formats.
- The `firewall-cmd` commands for adding/removing UDP ports, masquerading, permanent changes, and reload are valid. In a production RHEL environment, administrators should choose the correct firewalld zone instead of relying on the default zone.
- Red Hat states that Technology Preview features are not covered by production SLAs and are not recommended for production use.
