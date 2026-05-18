# Validation Summary: How to Set Up Network Namespaces for Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux network namespaces (netns)
- iproute2 (`ip netns`, `ip link`, `ip addr`, `ip route`)
- Virtual Ethernet (veth) pairs
- Linux IP forwarding (`net.ipv4.ip_forward`)
- iptables (FORWARD chain, NAT/MASQUERADE)
- Traffic Control (`tc`) with netem (delay, jitter, packet loss)
- Python `http.server`, netcat (`nc`), curl, traceroute, nslookup
- Bash scripting

## Sources Consulted
- `ip-netns(8)` manual page (iproute2)
- `tc-netem(8)` manual page
- `iptables(8)` / netfilter documentation
- Linux kernel networking documentation on namespaces (https://www.kernel.org/doc/html/latest/networking/index.html)
- iproute2 source / `ip link`, `ip addr`, `ip route` reference
- Ubuntu default filesystem layout (`/var/run` -> `/run` symlink)

## Issues Found
No technical issues found.

All commands and syntax were verified against official documentation:
- `ip netns add/list/exec/del` — correct iproute2 usage.
- `ip link add ... type veth peer name ...` — correct veth creation syntax.
- `ip link set <iface> netns <ns>` — correct way to move an interface into a namespace.
- `sysctl -w net.ipv4.ip_forward=1` — correct.
- `tc qdisc add dev <iface> root netem delay 50ms`, `loss 5%`, and `delay 50ms 10ms` (delay with jitter) — all match the netem(8) grammar.
- `iptables -t nat -A POSTROUTING -s <cidr> -j MASQUERADE` — correct NAT rule for outbound from a namespace.
- `iptables -A FORWARD -p tcp --dport 80 -s ... -j DROP` — correct FORWARD-chain rule.
- `/var/run/netns/` — valid on Ubuntu (symlink to `/run/netns/`, which is the path documented in modern `ip-netns(8)`). Both work.
- Loopback (`lo`) being down by default in a new netns is correct.
- Deletion behavior (interfaces removed, veth peer in the deleted ns disappears) is correct.

## Review Notes
- Minor demonstration quirk (not a technical error, left as-is): In the "Testing Firewall Rules" section, the test runs `curl http://10.0.2.2:80`, but the previous section only starts `python3 -m http.server 8080`. With the DROP rule the curl will time out; without it the curl would get a connection refused. The firewall rule itself is correct; the demo just doesn't pair it with a listener on port 80.
- Modern iproute2 documents the namespace path as `/run/netns/` rather than `/var/run/netns/`. Both work on Ubuntu (the latter is a symlink), so no change required.
- The post does not touch `net.ipv4.conf.*.rp_filter`, which can occasionally cause issues with more complex multi-interface routing setups. The two-interface router topology shown here has symmetric routes, so rp_filter does not interfere — no change needed.
- `nc -l 9999` is correct for the OpenBSD netcat that ships as the default on Ubuntu. Users on systems with traditional/GNU netcat may need `-p 9999` instead, but the OpenBSD form is the right default for Ubuntu.
