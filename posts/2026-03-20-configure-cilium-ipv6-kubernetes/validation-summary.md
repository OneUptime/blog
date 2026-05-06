# Validation Summary: How to Configure Cilium for IPv6 in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- IPv6
- Dual-stack networking
- CiliumNetworkPolicy
- Helm
- eBPF

## Sources Consulted
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Installation using Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Masquerading: https://docs.cilium.io/en/latest/network/concepts/masquerading/
- Kubernetes Host Scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- CRD-Backed by Cilium Cluster-Pool IPAM: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool.html
- Using Kubernetes Constructs In Policy: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Layer 3 Examples: https://docs.cilium.io/en/stable/security/policy/language/
- Command Reference: https://docs.cilium.io/en/latest/cmdref/
- Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Inspecting Network Flows with the CLI: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The post mixed `ipam.mode=kubernetes` with `clusterPoolIPv4PodCIDRList` and `clusterPoolIPv6PodCIDRList`, which are cluster-pool IPAM settings. I changed the install and YAML examples to `ipam.mode=cluster-pool` so the configured IPv4 and IPv6 pod CIDR pools are valid.
- The Cilium CLI install snippet was incomplete compared with the current official install flow. I added architecture detection, checksum verification, and the documented `tar` extraction form.
- The dual-stack Helm snippet set `enableIPv6Masquerade: false` while presenting BPF IPv6 masquerading as enabled. I changed it to `true` so the configuration matches the explanation.
- The kube-proxy replacement and DSR example was incomplete. `loadBalancer.mode=dsr` requires additional configuration, so I added `routingMode: native` and `loadBalancer.dsrDispatch: opt`, and replaced the invalid API server IPv6 literal with an environment-specific host placeholder.
- The verification commands were not ideal for dual-stack validation. I changed the pod IP check to use `status.podIPs[*].ip`, updated the connectivity test to `--ip-families ipv6`, and replaced `ping6` with `ping -6` against a real peer IPv6 address.
- The network policy used an invalid IPv6 CIDR, `2001:db8:client::/48`. I replaced it with the valid documentation-range CIDR `2001:db8:100::/48`.
- The policy verification command used `cilium policy get`, which is not present in the current top-level Cilium CLI command set. I replaced it with `kubectl get ciliumnetworkpolicy ...` to verify the policy resource directly.
- The Hubble CLI install snippet used the old `master` branch path and omitted checksum verification. I updated it to the current `main` branch path and the official install flow.
- The Hubble flow filters were incorrect. `--protocol ipv6` and `--ip-version ipv6` do not match the current documented usage, so I replaced them with `--ipv6`.
- The conclusion claimed “sub-microsecond policy enforcement,” which I could not verify in the official documentation. I changed it to a technically supportable statement about eBPF-based policy enforcement and service load balancing.

## Review Notes
- `k8sServiceHost` must be replaced with the actual Kubernetes API server IP or hostname for the target cluster when kube-proxy replacement is enabled.
- DSR mode has environment-specific prerequisites. The official docs note that `opt` dispatch requires native routing and may not work on fabrics that drop IPv6 extension headers; `geneve` is an alternative in those environments.
- `loadBalancer.algorithm: maglev` is valid, but production deployments should consider setting a cluster-wide `maglev.hashSeed` as recommended by the kube-proxy-free documentation.
