# Validation Summary: How to Cilium IPv6 Network Policies

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- IPv6
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Hubble
- `kubectl`
- Cilium CLI

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Layer 3 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 4 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The post used `CiliumClusterWideNetworkPolicy`, but the official CRD kind is `CiliumClusterwideNetworkPolicy`. I corrected the resource name in the description, introduction, and conclusion.
- The prerequisite section used host-level IPv6 checks and unrelated Python and JavaScript package installs instead of Kubernetes and Cilium prerequisites. I replaced them with verified `kubectl` and `cilium status --wait` commands that check IPv6 or dual-stack readiness and confirm the required CRDs exist.
- The "Core Implementation" section used Python subnet-checking code instead of a real `CiliumNetworkPolicy`, and it included invalid IPv6 examples such as `2001:db8:trusted::/48`. I replaced it with a valid namespace-scoped `CiliumNetworkPolicy` that uses `fromCIDRSet` and `toPorts`, and I switched the sample range to the RFC 3849 documentation prefix.
- The configuration snippet was not a valid Cilium policy schema and used invented fields such as `ipv6.enabled`, `networks`, and `action`. I replaced it with a valid `CiliumClusterwideNetworkPolicy` manifest that allows DNS and HTTPS egress to an IPv6 CIDR.
- The apply and verify step referenced a nonexistent `configure.py` workflow and unrelated Python `ipaddress` checks. I replaced those with valid `kubectl apply`, `kubectl get`, and `kubectl exec ... curl -6` commands.
- The monitoring section used custom Python logging rather than Cilium observability tooling. I replaced it with Hubble and `kubectl describe` commands that reflect the supported Cilium workflow.
- The conclusion incorrectly suggested Python module-based validation was part of implementing Cilium IPv6 policies. I rewrote it to explain actual Cilium policy behavior, including CIDR selector usage and default-deny semantics.

## Review Notes
- The CIDR-based examples are correct for external or otherwise unmanaged IPv6 peers. For Cilium-managed pod-to-pod traffic, label selectors such as `fromEndpoints` and `toEndpoints` are the correct mechanism.
- The DNS allow rule uses the standard `kube-system` and `k8s-app: kube-dns` labels shown in Cilium's documentation. Clusters with different DNS pod labels may need to adjust that selector.
- The post was validated against current official documentation on 2026-05-06. No live Kubernetes cluster was available in this workspace to execute the manifests end-to-end.
