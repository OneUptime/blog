# Validation Summary: How to Create a Kubernetes NetworkPolicy for IPv4 Egress CIDRs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- ipBlock CIDR matching (egress rules with `cidr` and `except`)
- RFC 1918 private address ranges
- kubectl
- Cilium Hubble (`hubble observe`)
- DNS / CoreDNS (kube-system)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NetworkPolicy API reference (v1): https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Automatic `kubernetes.io/metadata.name` namespace label (K8s 1.22+): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
- RFC 1918 — Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- Cilium Hubble CLI reference: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Hubble GitHub: https://github.com/cilium/hubble

## Issues Found
- **Invalid Hubble `--type` value.** The original command used `hubble observe --namespace production --verdict DROPPED --type l4`. `l4` is not a valid value for the `--type` flag — Hubble accepts event types such as `trace`, `drop`, `capture`, `debug`, `l7`, `policy-verdict`, `trace-sock`, and `agent`. L3/L4 is the default category for `trace`/`drop` events and is not selectable via `--type`. Changed `--type l4` to `--type drop` to explicitly filter the drop event type, which matches the author's intent of seeing blocked connections.

## Review Notes
- All NetworkPolicy YAML examples use the current stable API (`networking.k8s.io/v1`) and valid spec fields (`podSelector`, `policyTypes`, `egress`, `to`, `ipBlock`, `cidr`, `except`, `ports`).
- The DNS rule using `namespaceSelector` with `kubernetes.io/metadata.name: kube-system` relies on the automatic namespace name label, which has been added by default since Kubernetes 1.22 (NamespaceDefaultLabelName GA in 1.22). Clusters older than 1.22 would need the label applied manually — minor caveat, but accurate for any supported Kubernetes version today.
- RFC 1918 CIDRs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are correct.
- The example IPs `203.0.113.0/24` and `198.51.100.0/24` are TEST-NET ranges from RFC 5737 — appropriate placeholders for documentation.
- The unrestricted DNS rule (`- ports: ... port: 53` with no `to:`) in the "Allow Egress to External API + Internal Services" example permits DNS to any destination. This is valid and works as intended, though scoping it to `kube-system` (as in the first example) would be a tighter best practice. Not a technical error.
- NetworkPolicy enforcement requires a CNI plugin that supports egress policies (Calico, Cilium, Antrea, etc.). Worth noting but not technically incorrect.
