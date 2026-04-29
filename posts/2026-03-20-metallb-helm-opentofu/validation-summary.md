# Validation Summary: How to Deploy MetalLB on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- OpenTofu
- Helm
- BGP
- Layer 2 networking
- Terraform-compatible Kubernetes and Helm providers

## Sources Consulted
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/index.html
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- HashiCorp tutorial on managing Kubernetes resources and custom resources with Terraform: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Helm provider `helm_release` resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Kubernetes provider `kubernetes_manifest` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Kubernetes provider `kubernetes_service` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- RFC 4271 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The post pinned MetalLB chart `0.14.3`, which was outdated. I updated it to `0.15.3`, the latest official MetalLB release listed at review time.
- The Helm values placed `frr.enabled` under `speaker`, but the MetalLB chart defines `frr` as a top-level values key. I moved the block so the Helm configuration matches the chart schema.
- The post implied the MetalLB Helm release and the MetalLB custom resources could be applied together with `kubernetes_manifest`. I added a note to apply the Helm release first and then run a second `tofu apply`, because the Kubernetes provider validates custom-resource schemas during planning and the CRDs must already exist.
- The Layer 2 example used `192.168.10.200/28`, which is not a canonical `/28` network boundary. I corrected it to `192.168.10.208/28`.
- The Layer 2 example used `node-role.kubernetes.io/worker=true` as if it were a standard selector. I replaced it with a `kubernetes.io/hostname` example, which matches the form shown in the MetalLB L2 documentation.
- The BGP advertisement example set `localPref` while the peer example used different ASNs (`64512` and `64513`), which makes the session eBGP. I removed `localPref` because RFC 4271 says `LOCAL_PREF` is not sent to external peers.
- The reserved ingress IP overlapped the general `production-pool`, so the address was not actually dedicated. I moved the reserved IP to a non-overlapping address.
- The service annotations used the deprecated `metallb.universe.tf/*` prefix. I replaced them with the current `metallb.io/*` annotations documented by MetalLB.
- The sample service used the common name `ingress-nginx-controller`, which can collide with the controller Service created by typical ingress-nginx installs. I renamed the example service to avoid that conflict.
- The summary overstated Layer 2 behavior. I corrected it to match MetalLB's documented traffic flow: in Layer 2 mode, one node at a time attracts traffic for each service IP.

## Review Notes
- As of 2026-04-29, the official MetalLB release notes list `0.15.3` as the current release.
- The staged-apply note is important for this post's OpenTofu flow. `kubernetes_manifest` works well for MetalLB CRs, but only after the MetalLB CRDs are already present in the cluster.
- The post is now technically correct, but readers should still choose Layer 2 vs. BGP with `externalTrafficPolicy` behavior in mind, since MetalLB's traffic distribution differs between `Cluster` and `Local` modes.
