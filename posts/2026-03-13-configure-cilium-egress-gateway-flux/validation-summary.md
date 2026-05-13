# Validation Summary: How to Configure Cilium Egress Gateway with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Egress Gateway
- CiliumEgressGatewayPolicy
- Kubernetes
- Flux CD v2
- Flux HelmRelease and Kustomization
- Hubble
- eBPF masquerading

## Sources Consulted
- Cilium Egress Gateway documentation: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg bpf egress list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_egress_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile/

## Issues Found
- The Cilium Helm values enabled only `egressGateway.enabled`. Cilium documentation states that Egress Gateway also requires BPF masquerading and kube-proxy replacement. Added `bpf.masquerade: true` and `kubeProxyReplacement: true`.
- The gateway node labels and policies used a broad `egress-gateway: "true"` selector while specifying different `egressIP` values. Cilium selects the first matching gateway node in lexical order for a single `egressGateway.nodeSelector`, so the selected node may not own the configured `egressIP`. Added per-IP labels and updated each policy selector to match the node that owns the configured IP.
- The example comment implied Cilium would use the node's primary interface IP. Cilium uses the explicitly configured `egressIP`, the configured interface's first address, or the default-route interface address when neither is set. Updated the comment to describe the explicit `egressIP` behavior.
- The Kustomize `kustomization.yaml` and Flux `Kustomization` examples were shown as one multi-document YAML snippet even though they represent separate files. Split the snippet into two code blocks to avoid an invalid Kustomize file.
- The troubleshooting command used `cilium bpf egress list`. Current Cilium documentation uses `cilium-dbg bpf egress list` for listing egress policy entries. Updated the command.
- The prerequisites and best practices did not clearly state that the `egressIP` must be assigned to the selected node's network interface. Clarified that requirement.

## Review Notes
- The Flux commands and Kustomization fields are valid for Flux v2. The `dependsOn` example assumes there is a Flux Kustomization named `cilium`; if Cilium is managed differently, that dependency name should match the actual Flux Kustomization object.
- The examples use documentation/test IP ranges such as `203.0.113.10`, which are appropriate placeholders but must be replaced with real addresses assigned to the gateway nodes.
