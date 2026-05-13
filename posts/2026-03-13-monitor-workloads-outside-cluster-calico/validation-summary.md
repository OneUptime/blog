# Validation Summary: How to Monitor Workloads Outside the Cluster with Calico

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes (kubectl)
- BGP (Border Gateway Protocol)
- BIRD 2 (Internet Routing Daemon)
- Linux iproute2 (`ip route`)
- Debian/Ubuntu network configuration
- Mermaid diagrams

## Sources Consulted
- Calico documentation – external connectivity / advertising service IPs (https://docs.tigera.io/calico/latest/networking/configuring/bgp)
- Calico default AS number (64512) – https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- BIRD 2 user guide – BGP protocol configuration syntax (https://bird.network.cz/?get_doc&v=20&f=bird-6.html)
- Debian package `bird2` (https://packages.debian.org/stable/bird2)
- iproute2 `ip-route(8)` man page
- Debian/Ubuntu `interfaces(5)` man page – persistent route configuration via `post-up`
- RFC 6996 – Autonomous System Reservation for Private Use (AS 64512–65534)
- kubectl reference – `kubectl exec`, `kubectl get -o jsonpath` (https://kubernetes.io/docs/reference/kubectl/)

## Issues Found
- **Persistent static route file**: The original "Make permanent" command appended a route entry to `/etc/network/routes`. This file is not a standard Linux/Debian/Ubuntu configuration file and is not parsed by any default network service, so the route would not persist across reboots. Replaced with the standard Debian/Ubuntu approach of adding a `post-up ip route add ...` directive to `/etc/network/interfaces`, which is the documented persistence mechanism for ifupdown-managed interfaces.

## Review Notes
- The BIRD 2 BGP configuration is valid: `bird2` is the correct package name on modern Debian/Ubuntu; the `protocol bgp { local as ...; neighbor ... as ...; ipv4 { ... }; }` block is valid BIRD 2.x syntax; and AS numbers 64512 (Calico default) and 64514 fall within the private-use range defined in RFC 6996.
- The pod CIDR `10.244.0.0/16` is illustrative (it matches the common Flannel default); readers will need to substitute their cluster's actual `--cluster-cidr` / Calico IP pool.
- The Mermaid diagram uses `\n` for line breaks inside node labels, which is supported by modern Mermaid renderers but `<br/>` is more portable across older versions. Not changed since both render correctly in current Mermaid.
- The post's `Description` frontmatter mentions "probes and flow logs," but the post focuses on connectivity routing rather than flow logs specifically. This is a minor metadata mismatch and not a technical error in the post body, so left as-is.
- On distributions using netplan (recent Ubuntu) or NetworkManager, the persistence step would differ; the fixed example targets the ifupdown-based `/etc/network/interfaces` approach that matches the original intent.
