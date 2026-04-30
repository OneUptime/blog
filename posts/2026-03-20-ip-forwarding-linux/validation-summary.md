# Validation Summary: How to Set Up IP Forwarding on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel networking
- `sysctl` and `/proc/sys`
- IPv4 forwarding
- IPv6 forwarding
- `iptables` NAT and forwarding rules
- Docker networking
- Kubernetes node networking
- WireGuard

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel Ethernet Bridging documentation: https://docs.kernel.org/6.15/networking/bridge.html
- `sysctl(8)` manual page and local `sysctl --help` output: https://man7.org/linux/man-pages/man8/sysctl.8.html
- Docker packet filtering and firewalls documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Kubernetes container runtime prerequisites (`Enable IPv4 packet forwarding`): https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- `wg-quick(8)` manual page: https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The post said IP forwarding is required for "Bridge setups." Linux bridging operates at Layer 2 and forwards Ethernet frames by MAC address, so IP forwarding is not inherently required. I removed that bullet.
- The per-interface forwarding note was incorrect. `net.ipv4.conf.<if>.forwarding` is an interface-specific control for whether packets received on that interface can be forwarded; it is not limited to the case where `net.ipv4.ip_forward=0`. I rewrote that explanation.
- The packet-capture verification example filtered on `CLIENT_IP` on both interfaces. On the egress interface, that filter can fail in common NAT scenarios because source NAT changes the packet headers before transmission. I changed the example to verify ingress on `eth0` and observe egress traffic on `eth1`.
- The Docker/Kubernetes section overstated auto-configuration. Docker may enable IP forwarding for its default bridge networking on Linux, but behavior varies by firewall backend, and Kubernetes networking depends on the cluster network implementation. I corrected the explanation and changed the apply command to `sysctl --system`, which matches the Kubernetes documentation for `/etc/sysctl.d/k8s.conf`.

## Review Notes
- The NAT example uses the legacy `-m state --state RELATED,ESTABLISHED` match, which remains supported. Newer examples often use `-m conntrack --ctstate ...`, but the current rule is still valid.
- Internal related-reading links point to existing post directories in the repository.
