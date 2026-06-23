# Validation Summary: How to Configure Docker Daemon for Native IPv6 Support

## Status
validated

## Post Type
Tutorial / Guide (in-depth configuration walkthrough)

## Technologies Covered
- Docker Engine (daemon.json configuration)
- Docker networking (bridge, overlay, user-defined networks)
- Docker Compose (IPv6-enabled networks)
- Docker Swarm
- IPv6 networking (ULA, dual-stack, NDP proxy, NAT66)
- ip6tables / iptables / UFW firewalling
- Linux sysctl (IPv6 forwarding, neighbor cache, temp addresses)
- Kubernetes dual-stack (kubeadm)
- Ansible and Terraform (infrastructure as code)

## Sources Consulted
- Docker official docs — Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker daemon configuration reference (daemon.json options): https://docs.docker.com/reference/cli/dockerd/
- RFC 4193 (Unique Local IPv6 Unicast Addresses — fc00::/7, fd00::/8)
- moby/moby issues and community references on `default-address-pools` and `fixed-cidr-v6`
- straz.to "definitive guide to docker's default-address-pools" (config example patterns)

## Issues Found
No technical issues found.

The post's key claims were cross-checked against Docker's official IPv6 documentation and verified accurate:
- `ipv6: true`, `fixed-cidr-v6`, and `ip6tables` daemon.json options are named and described correctly.
- The `fixed-cidr-v6` sizing guidance ("/80 or smaller prefix, /64 recommended") matches Docker's documented requirement that the subnet have a prefix length of at most /80 so an address can end with the container's identifier, with /64 recommended.
- The ULA reference to `fd00::/8` matches Docker's own documentation wording.
- The `default-address-pools` example using `base: "172.17.0.0/12", size: 24` is a valid and commonly used pattern accepted by the daemon.
- Port-publishing syntax (`-p "[::]:80:80"`, `-p "[2001:db8::1]:8080:8080"`), `docker network create --ipv6 --subnet ...`, NDP proxy (`proxy_ndp`, `ip -6 neigh add proxy`), NAT66 `ip6tables -t nat ... MASQUERADE`, and the sysctl keys (`net.ipv6.conf.all.forwarding`, `use_tempaddr`, `neigh.default.gc_thresh*`) are all syntactically correct and current.
- The dual-stack Compose (`enable_ipv6: true` + dual IPAM config) and Kubernetes kubeadm dual-stack examples are accurate.

## Review Notes
- **ip6tables / experimental version caveat:** The production config correctly pairs `"ip6tables": true` with `"experimental": false`, which is right for current Docker (ip6tables became stable and on-by-default in modern releases). However, the post recommends "Docker 20.10+", and on older releases (roughly 20.10 through 26.x) `ip6tables` required `"experimental": true` to take effect. Readers on older daemons should be aware of this. Not an error for current Docker, but a version-specific nuance.
- **"No built-in NAT66" framing:** This was historically accurate and the post's routing-first approach is sound. Recent Docker (27+) added optional IPv6 NAT/masquerading for ULA prefixes, so the absolute "no NAT66" statement is slightly dated, though the post does later cover NAT66 manually via ip6tables. Acceptable as written.
- **`2001:db8::` documentation prefix:** The post consistently uses the RFC 3849 documentation prefix for examples and clearly instructs readers to substitute their real prefix — good practice.
- **Docker-as-Kubernetes-runtime:** The dockershim runtime was removed in Kubernetes 1.24; the section is framed generically and the underlying point (IPv6 is managed by the CNI, not Docker) remains valid, but the "Docker as runtime" framing is somewhat anachronistic for current clusters.
