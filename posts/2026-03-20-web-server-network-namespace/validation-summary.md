# Validation Summary: How to Run a Web Server Inside a Network Namespace

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip link`, `ip addr`)
- veth (virtual Ethernet) pairs
- Python's built-in `http.server` module
- Nginx (configuration and invocation)
- iptables (NAT / DNAT / FORWARD rules)
- Bash scripting

## Sources Consulted
- `ip-netns(8)` man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 `ip netns help` subcommand output (verified locally)
- Python `http.server` docs: https://docs.python.org/3/library/http.server.html
- Nginx CLI docs: https://nginx.org/en/docs/switches.html
- Nginx `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- iptables(8) man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- Linux network namespaces overview: https://man7.org/linux/man-pages/man7/network_namespaces.7.html

## Issues Found
No technical issues found.

All commands verified against the `ip-netns` man page and `ip netns help` output:
- `ip netns add`, `ip netns exec`, `ip netns pids`, `ip netns delete` — all valid
- `ip link add ... type veth peer name ...` — correct veth creation syntax
- `ip link set <iface> netns <ns>` — correct syntax for moving an interface into a namespace
- `python3 -m http.server 8080` — valid invocation (binds 0.0.0.0:8080 by default)
- `nginx -c /path/to/nginx.conf` and `-s stop` — valid nginx CLI flags
- `listen 10.1.0.2:80;` — valid nginx listen directive syntax
- iptables DNAT/FORWARD rule syntax is correct
- Deleting one end of a veth pair (`ip link delete veth-host`) correctly removes both ends

## Review Notes
- The iptables port-forwarding example requires `sysctl -w net.ipv4.ip_forward=1` on the host for DNAT'd traffic to be routed into the namespace. The post does not mention this prerequisite, but this is a reasonable simplification for a tutorial scoped to namespace basics.
- In the "Stop the Web Server" section, `kill $(ip netns pids webns)` kills all processes in the namespace, so the subsequent `nginx ... -s stop` would only apply if nginx (not Python) had been the running server. The two commands are presented as alternatives rather than a sequence, which is reasonable but could be clarified.
- The Python HTTP server binds to `0.0.0.0:8080` by default; inside the namespace this is effectively only the namespace's interfaces, which is the intended behavior here.
- Depending on the default policy of the FORWARD chain and whether a host firewall is active, additional rules (e.g., allowing return traffic with `conntrack --ctstate ESTABLISHED,RELATED`) may be needed in real-world deployments. Not a correctness issue for the tutorial as written.
