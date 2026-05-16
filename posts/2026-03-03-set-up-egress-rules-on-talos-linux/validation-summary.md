# Validation Summary: How to Set Up Egress Rules on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes NetworkPolicy
- Kubernetes EndpointSlice
- Cilium CNI
- Cilium CLI and cilium-dbg
- kubectl
- talosctl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes accessing the API from a pod documentation: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- Sidero Labs Talos Cilium deployment documentation: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Sidero Labs Talos ingress firewall documentation: https://docs.siderolabs.com/talos/v1.12/networking/ingress-firewall/
- Sidero Labs talosctl CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium cilium-dbg monitor reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium cilium-dbg endpoint list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html

## Issues Found
- The post said Talos users cannot fall back on host-level firewall rules because the OS is immutable. Talos does provide an ingress firewall for host services, but that is not a substitute for pod egress control. Updated the wording to distinguish host firewalling from CNI-enforced workload network policies.
- The Cilium install example used an old generic `cilium install --version 1.15.0` command. Updated it to a current Cilium version and Talos-specific Cilium CLI settings from the Talos documentation, including Kubernetes IPAM, Cilium capabilities without `SYS_MODULE`, and Talos cgroup settings.
- The external HTTPS example only excluded RFC1918 private ranges while discussing internal and metadata protection. Added carrier-grade NAT and link-local ranges, including `169.254.0.0/16`, and updated the explanation.
- The Kubernetes API egress example allowed the `kubernetes` Service ClusterIP on port 443 via `ipBlock`. Kubernetes documents that `ipBlock` behavior with service rewriting is implementation-dependent, so the example now uses the actual API endpoint or load balancer IP on port 6443 and shows how to inspect EndpointSlices.
- The testing commands used `curl` against PostgreSQL and arbitrary TCP ports. Replaced those checks with `nc -vz -w 3`, which is a more appropriate TCP connectivity test.
- The Cilium debugging commands used older or non-current command forms. Updated them to run `cilium-dbg monitor` and `cilium-dbg endpoint list` inside the Cilium agent pod.
- The Talos kernel-log debugging command used `talosctl logs -k`; updated it to `talosctl dmesg`, which is the documented command for kernel logs.

## Review Notes
All YAML snippets parsed successfully after the edits. The examples still assume conventional labels such as `k8s-app: kube-dns`; clusters using NodeLocal DNSCache or non-default DNS labels may need to adjust the DNS policy selector.
