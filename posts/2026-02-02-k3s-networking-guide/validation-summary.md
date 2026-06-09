# Validation Summary: How to Handle K3s Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Flannel (CNI plugin with VXLAN, host-gw, WireGuard, IPSec backends)
- CoreDNS (service discovery)
- Traefik (default ingress controller)
- ServiceLB / Klipper-lb (built-in LoadBalancer implementation)
- MetalLB (Layer 2 and BGP modes)
- Kubernetes NetworkPolicy
- Calico and Cilium (alternative CNIs)
- NGINX Ingress (alternative ingress controller)
- iptables / firewalld

## Sources Consulted
- K3s networking documentation: https://docs.k3s.io/networking
- K3s installation options / requirements (firewall ports, default CIDRs): https://docs.k3s.io/installation/requirements and https://docs.k3s.io/cli/server
- K3s helm/HelmChartConfig docs: https://docs.k3s.io/helm
- Flannel backends documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Traefik Kubernetes Ingress provider / annotations: https://doc.traefik.io/traefik/providers/kubernetes-ingress/
- CoreDNS plugin documentation (hosts, forward, cache): https://coredns.io/plugins/
- MetalLB configuration (IPAddressPool, L2Advertisement, BGPPeer, BGPAdvertisement) for v0.14.x: https://metallb.universe.tf/configuration/
- Calico installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s
- Cilium CLI installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/

## Issues Found
- **CoreDNS custom ConfigMap example (Customizing CoreDNS section)**: The post used a `custom.hosts` key in the `coredns-custom` ConfigMap to define static host entries. K3s only merges keys with `*.server` or `*.override` suffixes from the `coredns-custom` ConfigMap into the CoreDNS Corefile, so a `custom.hosts` key would be silently ignored. Fixed by consolidating the static host entries into a single `internal.server` block using CoreDNS's `hosts` plugin with `fallthrough`, alongside the existing `forward` and `cache` directives. Also added a sentence clarifying the `*.server` / `*.override` convention so readers understand how K3s picks up custom config.

## Review Notes
- The post states "K3s deploys Traefik v2 as the default ingress controller." Recent K3s releases (K3s v1.30+) ship Traefik v3. The annotations used (`traefik.ingress.kubernetes.io/router.entrypoints`, `router.tls`, `router.middlewares`) are compatible with both v2 and v3, so the examples remain functionally valid. Worth updating to reference v2/v3 in a future revision.
- The Flannel `ipsec` backend is listed in the best-practices table for "Legacy Systems". It is officially deprecated in current K3s releases (still available but flagged in `--help`). The "Encrypted Legacy" label in the backends diagram already conveys this, but a more explicit deprecation note would help future readers.
- The Traefik HelmChartConfig `ports.metrics.expose: true` syntax matches older Traefik Helm chart values; in the Traefik v3 chart, `expose` is an object (`expose: { default: true }`). Both forms work depending on chart version; not changed because K3s' bundled chart still accepts the boolean form for backward compatibility.
- The post uses `tutum/dnsutils` for DNS testing in the troubleshooting section. This image is unmaintained; `registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3` is the modern equivalent recommended by upstream Kubernetes docs. Not changed since the existing example still functions.
- Default K3s CIDR ranges (10.42.0.0/16 pods, 10.43.0.0/16 services, 10.43.0.10 DNS) are correct.
- Required firewall ports (6443/TCP, 8472/UDP, 10250/TCP, 51820-51821/UDP) match K3s networking requirements. Embedded etcd HA ports (2379-2380/TCP) and the supervisor port (9345/TCP) are not listed but are out of scope for a general multi-node section.
- Versions referenced in install commands (Calico v3.27.0, MetalLB v0.14.3, ingress-nginx controller-v1.9.5, Cilium 1.14.5) are all real, valid releases at the time of writing.
