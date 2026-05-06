# Validation Summary: How to Configure Cilium CNI for IPv6 in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- IPv6
- Dual-stack networking
- Cilium CNI
- Hubble
- Helm
- eBPF
- CiliumNetworkPolicy

## Sources Consulted
- Cilium installation with Helm: https://docs.cilium.io/en/latest/installation/k8s-install-helm/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium chart values: https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/values.yaml
- Cilium Kubernetes host-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium kube-proxy replacement: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free.html
- Cilium masquerading: https://docs.cilium.io/en/latest/network/concepts/masquerading/
- Cilium Layer 3 policy docs: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg bpf lb list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- cilium-dbg bpf nat list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Kubernetes dual-stack networking: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Verified current official CLI behavior with the latest release binaries for `cilium install --help` and `hubble observe --help`

## Issues Found
- The install command derived `k8sServiceHost` from the first node address, which is not the same thing as the Kubernetes API endpoint required by Cilium when `kubeProxyReplacement=true`. I changed the snippet to derive `k8sServiceHost` and `k8sServicePort` from the current kubeconfig server URL instead.
- The install and Helm examples used `tunnel: vxlan`, but the current chart uses `routingMode: tunnel` and `tunnelProtocol: vxlan`. I updated both examples to the current chart keys.
- The install example enabled `hostServices.enabled`, `externalIPs.enabled`, `nodePort.enabled`, and `hostPort.enabled`. Those settings are no longer the current way to express this configuration in the chart, and kube-proxy replacement already covers the NodePort / externalIPs / hostPort behavior described in the post. I removed those flags and kept the configuration aligned with current Cilium docs.
- The Helm values file used `ipv6NativeRoutingCIDR` as if it enabled IPv6 masquerading. That setting is for native routing and SNAT exclusion, not for turning masquerading on. I replaced it with `enableIPv6Masquerade: true` and kept `bpf.masquerade: true`.
- The CiliumNetworkPolicy example used `toCIDR` with the cluster Pod CIDR. Cilium CIDR rules are intended for peers not managed by Cilium, and do not apply to traffic where both sides are Cilium-managed endpoints. I replaced that with an example external IPv6 CIDR from the documentation prefix space.
- The Hubble examples used `--ip-version ipv6`, but the current CLI accepts `--ip-version v6` or `--ipv6`. I updated the commands to use `--ipv6`.
- The Hubble CLI install snippet used `.../hubble/master/stable.txt`; the current official docs use the `main` branch. I updated the download path accordingly.
- The post did not state that the Kubernetes cluster itself must already be configured for IPv6 or dual-stack Pod and Service CIDRs. I added that prerequisite because the Cilium settings alone are not sufficient to create a working IPv6 or dual-stack cluster.

## Review Notes
- The download snippets are still Linux `amd64` examples. They are technically valid, but users on `arm64` should use the matching archive names from the official Cilium and Hubble install docs.
- `cilium connectivity test` exercises both IP families by default on a dual-stack cluster. If a future revision wants IPv6-only validation, it could mention `--ip-families ipv6`, but the current command is still valid.
- The corrected chart keys and behavior were checked against current official Cilium sources as of 2026-05-06, so older blog drafts or older Cilium versions may still show the deprecated patterns that were removed here.
