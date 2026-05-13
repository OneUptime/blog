# Validation Summary: Manage Egress Network Policies with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy
- Cilium Hubble
- Flux CD Kustomization
- AWS public IP ranges
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Cilium DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium DNS-based policy guide: https://docs.cilium.io/en/latest/security/dns/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- AWS IP address ranges documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- AWS public IP range feed: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The Cilium FQDN policy only allowed `toFQDNs` and HTTPS, but Cilium requires DNS visibility through the DNS proxy and an L7 DNS policy to associate domain names with IP addresses. Added the kube-dns `toEndpoints` rule with `rules.dns` and `matchPattern: "*"` to the CiliumNetworkPolicy example.
- The planning example said "AWS services via VPC endpoints" while the later NetworkPolicy example uses public AWS IP ranges. Updated the wording to cover published AWS IP ranges or VPC endpoints.
- The AWS CIDR example included `54.239.0.0/17`, which is not a current published AWS us-east-1 API Gateway prefix. Replaced the example CIDRs with current us-east-1 API Gateway prefixes from AWS's official IP range feed.
- The Cilium verification command used `cilium monitor --type drop --related-to-endpoint myapp-pod-name`; current Cilium documentation exposes this as `cilium-dbg monitor`, and `--related-to` expects an endpoint ID rather than a pod name. Replaced the example with `hubble observe --pod myapp/myapp-pod-name --verdict DROPPED`, matching Cilium's Hubble CLI examples.

## Review Notes
- The Kubernetes NetworkPolicy manifests use stable `networking.k8s.io/v1` APIs and the Flux Kustomization uses the current `kustomize.toolkit.fluxcd.io/v1` API.
- The DNS NetworkPolicy intentionally allows port 53 to any destination. That is valid Kubernetes NetworkPolicy syntax, but production clusters often restrict DNS egress to kube-dns/CoreDNS pods or node-local DNS.
- AWS public IP ranges change over time, so examples using AWS CIDRs should be treated as illustrative and refreshed from AWS's `ip-ranges.json` before production use.
