# Validation Summary: How to Use Network Namespaces for Container Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip link`, `ip addr`, `ip route`)
- Linux bridges
- veth pairs
- iptables (NAT/MASQUERADE, FORWARD rules)
- `sysctl` (`net.ipv4.ip_forward`)
- Docker network namespace inspection (`docker inspect`, `SandboxKey`)
- `nsenter`

## Sources Consulted
- iproute2 manual pages: `ip-link(8)`, `ip-netns(8)`, `ip-address(8)`, `ip-route(8)` — https://man7.org/linux/man-pages/man8/ip-netns.8.html
- iptables manual: `iptables(8)`, `iptables-extensions(8)` — https://linux.die.net/man/8/iptables
- Linux kernel networking documentation on namespaces and bridges
- Docker networking documentation (bridge driver, libnetwork) — https://docs.docker.com/engine/network/drivers/bridge/
- Docker `inspect` reference — `NetworkSettings.SandboxKey` field exposes path under `/var/run/docker/netns/`
- `nsenter(1)` manual — https://man7.org/linux/man-pages/man1/nsenter.1.html
- `veth(4)` man page — https://man7.org/linux/man-pages/man4/veth.4.html

## Issues Found
No technical issues found.

All commands and concepts verified:
- `ip link add <name> type bridge`, `ip addr add`, `ip link set ... up` — correct iproute2 syntax for creating and configuring a bridge.
- `ip netns add` — correct command for creating a named network namespace under `/var/run/netns/`.
- `ip link add veth-host type veth peer name veth-cont` — correct veth pair creation syntax.
- `ip link set veth-cont netns container1` — correct command for moving an interface into a namespace.
- `ip link set veth-host master docker0` — correct command for attaching an interface to a bridge.
- `ip netns exec <ns> <cmd>` — correct way to run commands in a namespace.
- `iptables -t nat -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE` — matches Docker's own MASQUERADE rule pattern; the `! -o docker0` correctly excludes inter-container bridge traffic.
- FORWARD rules with `-m state --state RELATED,ESTABLISHED` — valid (though `-m conntrack --ctstate ...` is the modern preferred form, the `state` match is still supported as an alias).
- `docker inspect <id> | jq '.[].NetworkSettings.SandboxKey'` — `SandboxKey` is the documented field that holds the absolute path to the container's network namespace bind mount under `/var/run/docker/netns/`.
- `nsenter --net=<path> ip addr show` — correct way to inspect Docker namespaces, which is necessary because Docker does not symlink its netns into `/var/run/netns/` (so `ip netns exec` does not see them by default).

## Review Notes
- The `-m state` match is technically a legacy alias for `-m conntrack`. While functional and widely supported, the modern recommended form is `-m conntrack --ctstate RELATED,ESTABLISHED`. Not incorrect; just dated.
- The manual replication uses `veth-cont` as the in-namespace interface name, while the diagram shows `eth0`. This is a minor presentational inconsistency; Docker renames the in-namespace end to `eth0`, but the manual walkthrough leaves it as `veth-cont`. The post explicitly frames the manual section as "replicating" rather than "exactly mirroring" Docker, so this is acceptable.
- The post assumes the external uplink interface is `eth0` for the FORWARD rules; on modern systems with predictable network interface names this may be `enp*`/`ens*`/`eno*`. Readers will need to substitute their actual interface name.
- If Docker is running, the `docker0` bridge will already exist and `iptables` rules will already be installed; manually running these commands could conflict with Docker's own setup. Worth noting for readers, but not a correctness issue with the commands themselves.
- The post does not mention setting `FORWARD` policy or that on some distributions `iptables` FORWARD policy defaults to `DROP`, which would require the explicit ACCEPT rules shown. The rules included are sufficient to handle this case.
