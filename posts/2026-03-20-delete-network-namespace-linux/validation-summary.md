# Validation Summary: How to Delete a Network Namespace on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux network namespaces
- iproute2 (`ip netns`, `ip link`)
- Linux mount/unmount of bind-mounted namespace files
- veth (virtual Ethernet) interfaces
- Docker / Kubernetes namespace handling (briefly)

## Sources Consulted
- `man ip-netns` (iproute2 official manual page)
- Linux kernel documentation on network namespaces (`Documentation/admin-guide/sysctl/net.rst`, `man 7 network_namespaces`)
- iproute2 source for `ip/ipnetns.c` (netns_delete behavior)
- `man ip-link` for veth pair behavior

## Issues Found
No technical issues found.

All commands and claims were verified against the iproute2 man page and observed behavior:

- `ip netns delete ns1` — correct; the man page documents that the mount point in `/run/netns` is unmounted and removed.
- The claim that the namespace persists while any process or file descriptor references it matches the man page wording: "If this is the last user of the network namespace the network namespace will be freed... otherwise the network namespace persists until it has no more users."
- `ip link delete veth0` — correct; deleting one peer of a veth pair automatically removes the other.
- `ip netns pids NETNSNAME` — correct subcommand per `man ip-netns`.
- The manual cleanup sequence (`umount /var/run/netns/ns1` then `rm /var/run/netns/ns1`) matches what `ip netns delete` does internally (umount2 + unlink).
- The note about Docker/Kubernetes not using `/var/run/netns` is correct — Docker stores its handles under `/var/run/docker/netns/` and Kubernetes/CRIs reference `/proc/<pid>/ns/net`, so `ip netns` does not see them unless symlinked into `/var/run/netns/`.
- `ip link show type veth` — correct filter syntax.
- The awk pipeline `ip netns list | awk '{print $1}'` correctly extracts the namespace name from output that may include trailing `(id: N)` annotations.

## Review Notes
- `/var/run` is conventionally a symlink to `/run` on modern systemd-based distributions, so `/var/run/netns/` and `/run/netns/` refer to the same directory. The post uses `/var/run/netns/` consistently, which is fine and works on all modern distros.
- The man page notes a useful caveat the post does not mention: if a physical device was moved into a netns and that netns is deleted while a process is still running inside it, the device will only return to the default namespace after that process exits. This is an enhancement opportunity, not an error.
- The post could optionally mention `ip -all netns delete` as a built-in alternative to the shell loop, but the loop is also correct and gives the user more control (e.g., the `echo` line).
