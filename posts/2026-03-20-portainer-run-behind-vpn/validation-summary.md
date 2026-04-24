# Validation Summary: How to Run Portainer Behind a VPN for Secure Access - Run

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE
- WireGuard
- Tailscale
- OpenVPN Access Server
- Docker
- UFW
- Linux networking and firewalling

## Sources Consulted
- Portainer Docker installation docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer official source for `/system/status`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go
- Portainer official source for the status response fields: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard configuration overview: https://www.wireguard.com/
- Tailscale `tailscale up` CLI docs: https://tailscale.com/docs/reference/tailscale-cli/up
- Tailscale tags docs: https://tailscale.com/docs/features/tags
- Tailscale ACL docs: https://tailscale.com/docs/features/access-control/acls
- Docker port publishing docs: https://docs.docker.com/engine/network/port-publishing/
- Docker packet filtering and firewalls docs: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- OpenVPN Access Server Docker deployment docs: https://openvpn.net/as-docs/v3/docker.html
- OpenVPN Access Server configuration docs: https://openvpn.net/as-docs/configuration.html
- OpenVPN Access Server routing and NAT docs: https://openvpn.net/as-docs/routing-and-nat.html
- Ubuntu `ufw(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
- The WireGuard key-generation snippet wrote into `/etc/wireguard` without `sudo`, which would fail for non-root users. I changed it to run under a root shell with `umask 077` and updated later reads from `/etc/wireguard/*` to use `sudo`.
- The WireGuard server example hard-coded `eth0` as the outbound interface. I replaced it with `YOUR_PUBLIC_INTERFACE` so the example does not fail on systems using different interface names.
- The UFW-only restriction for Portainer was misleading for Docker-based deployments. Docker-published ports can bypass UFW, so I corrected the post to bind Portainer to the WireGuard IP instead of `0.0.0.0` and clarified that the UFW rules apply to host-listening services.
- The WireGuard client example read the server public key from `/etc/wireguard` without `sudo` and included an inline note on the `AllowedIPs` line. I corrected the file read and removed the inline comment to keep the generated config clean.
- The Tailscale example used `portainer/portainer-ce:latest` and had an invalid shell line continuation because of an inline comment after `\`. I fixed the shell syntax and switched the image reference to the current official `portainer/portainer-ce:sts` tag used in Portainer's install docs.
- The Tailscale tagging command omitted the requirement that the device must be allowed to advertise the requested tag. I added that note because `--advertise-tags` requires tag ownership in the tailnet policy.
- The Tailscale ACL example used an explicit `"deny"` rule. Tailscale ACLs use accept rules with deny-by-default behavior, so I removed the invalid deny entry.
- The OpenVPN Access Server example used a non-official Docker image and omitted required options from OpenVPN's official Docker deployment guidance. I replaced it with the official `openvpn/openvpn-as` image, added `--device /dev/net/tun`, `--cap-add=MKNOD`, and `--restart=unless-stopped`, and corrected the routing instructions to the current Admin UI settings.
- The Portainer verification example claimed `/api/system/status` would return `{"Status":"..."}`. Current Portainer exposes `/api/system/status` publicly and returns status data with fields such as `Version` and `InstanceID`, so I corrected the expectation text.
- The introduction and conclusion overstated the security outcome as eliminating all external attack surface. I narrowed the wording to Portainer's direct internet-facing exposure.

## Review Notes
- Tailscale recommends grants for new tailnet policy files, but ACLs remain supported, so the corrected ACL example is still valid.
- Portainer's TCP tunnel port `8000` is optional and only needed for Edge Agent features; the post remains focused on securing the management UI on `9443`.
- Enabling UFW on remote hosts should be done carefully if SSH access is in use.
