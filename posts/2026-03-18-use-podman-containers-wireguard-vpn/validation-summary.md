# Validation Summary: How to Use Podman Containers with WireGuard VPN

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- WireGuard
- Linux networking
- iptables
- systemd Quadlet
- LinuxServer WireGuard container image

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- `wg-quick(8)` manual page: https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard compilation notes: https://www.wireguard.com/compilation/
- LinuxServer WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/

## Issues Found
- The post used `sudo cat > /etc/wireguard/wg0.conf`, which does not apply `sudo` to the shell redirection. This was corrected to `sudo tee ... > /dev/null << 'EOF'` in all affected examples.
- The verification commands used `curl` inside `nginx:alpine`, which does not reliably include `curl`. These checks were changed to run a temporary `curlimages/curl` container in the target container's network namespace instead.
- The text said the observed exit IP should match the WireGuard endpoint. That is not always true; the relevant check is the VPN server's public egress IP. The explanation was corrected.
- The LinuxServer WireGuard container example wrote the client config to `/config/wg0.conf`, but the documented client-mode path is `/config/wg_confs/<tunnel>.conf`. The host-side directory and file path were corrected accordingly.
- The LinuxServer example granted `SYS_MODULE` without the accompanying `/lib/modules` bind mount. The run command and explanation were updated to match the documented requirement when module loading is needed.
- The cross-host routing section manually added routes that `wg-quick` already derives from peer `AllowedIPs`. Those commands were replaced with comments explaining that no extra `ip route add` step is needed there.
- The cross-host test assumed the first container would always receive `10.89.0.2`. A static IP was assigned to make the example deterministic.
- The iptables persistence command was presented as generic. It was narrowed to Debian/Ubuntu systems with `iptables-persistent` installed.
- The monitoring script assumed every running container had `curl` installed. It was updated to probe each container's network namespace with a temporary curl container.
- The Quadlet example used `~` in `Volume=`, which Quadlet does not expand like a shell and can be interpreted incorrectly. It was replaced with an absolute host path example.
- The Quadlet section used `systemctl enable --now` on a generated Quadlet service. Podman documents that generated Quadlet services cannot be enabled that way; the example was corrected to `daemon-reload` plus `start`, with boot activation handled by the `[Install]` section.
- The conclusion overstated performance and compatibility. It was adjusted to a technically safer formulation.

## Review Notes
- The Quadlet example assumes a Podman release with Quadlet support and a system using cgroup v2, as documented by Podman.
- The host-level and containerized examples assume the remote WireGuard peer is configured to route and NAT internet-bound traffic when `AllowedIPs = 0.0.0.0/0` is used.
