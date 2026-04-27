# Validation Summary: How to Persist Network Namespace Configuration Across Reboots

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip link`, `ip addr`, `ip route`)
- systemd service units (Type=oneshot, RemainAfterExit, ExecStop)
- iptables NAT (MASQUERADE)
- Linux sysctl (`net.ipv4.ip_forward`)
- Per-namespace `/etc/netns/<NAME>/resolv.conf` overlay

## Sources Consulted
- ip-netns(8) man page — https://man7.org/linux/man-pages/man8/ip-netns.8.html (confirms bind-mounting of `/etc/netns/NAME/` files into the executed process's `/etc/`)
- systemd.service(5) man page — https://man.archlinux.org/man/systemd.service.5 (confirms `Type=oneshot` + `RemainAfterExit=yes` + `ExecStop=` is the canonical setup-service pattern, with a firewall-setup example identical in shape to this post's)
- iptables(8) — for `-C/-A/-D POSTROUTING` flag semantics and the idempotent check-then-add pattern
- iproute2 source (`ip netns add` creates a bind mount under `/var/run/netns/`, which lives on tmpfs and therefore disappears on reboot)

## Issues Found
No technical issues found.

All commands, flags, and unit-file directives are syntactically correct and current:
- `ip netns add`, `ip link add ... type veth peer name ...`, `ip link set <iface> netns <ns>`, `ip netns exec` usage is correct.
- Host/namespace IP/route configuration is consistent (host `10.0.0.1/24`, namespace `10.0.0.2/24`, default via `10.0.0.1`).
- The `iptables -t nat -C ... || iptables -t nat -A ...` idempotency pattern is correct.
- `Type=oneshot` + `RemainAfterExit=yes` + `ExecStart=` + `ExecStop=` is the documented pattern; `WantedBy=multi-user.target` is appropriate.
- The `/etc/netns/ns1/resolv.conf` overlay claim is accurate — `ip netns exec` creates a mount namespace and bind-mounts files from `/etc/netns/<NAME>/` over their counterparts in `/etc/` for the executed process.
- The teardown script correctly uses `ip link delete veth-host` (deleting one side of a veth pair removes the peer automatically), and the matching `iptables -D` rule mirrors the `-A` rule exactly.

## Review Notes
- The script hardcodes `eth0` as the upstream interface for MASQUERADE. On modern distributions using predictable interface names (e.g., `enp0s3`, `ens33`), readers will need to substitute the correct name. This is implicit in any tutorial of this kind and not an error.
- `After=network.target` / `Wants=network.target` is appropriate for namespace setup that does not require full network reachability before running. If readers later add steps that require DNS resolution or upstream reachability at unit start, `network-online.target` (with `After=` and `Wants=`) would be the stricter choice.
- `set -e` combined with `2>/dev/null || true` on potentially-failing commands is intentional and works correctly: the `|| true` neutralizes the failure for that specific command without disabling `set -e` for the rest of the script.
- The `/etc/netns/NAME/` overlay only applies to processes started via `ip netns exec`. Processes attached to the namespace by other means (e.g., `nsenter`, `unshare`, systemd's `NetworkNamespacePath=`) will not see the overlay — out of scope for this post but worth knowing.
- Method 2 (systemd-networkd `.netdev`) is mentioned only briefly and accurately notes that full namespace support in networkd is limited; no concrete configuration is provided, so there is nothing to verify.
