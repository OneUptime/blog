# Validation Summary: How to Configure Network Policies for Flux Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes NetworkPolicy
- Kubernetes CLI (`kubectl`)
- Flux CLI
- Kubernetes CNI policy enforcement

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes default deny NetworkPolicy example: https://raw.githubusercontent.com/kubernetes/website/main/content/en/examples/service/networking/network-policy-default-deny-all.yaml
- Flux installation network policies documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux webhook receivers documentation: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux latest install manifest, controller labels, services, ports, and default NetworkPolicies: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- kubectl `run` command source/help definitions: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/run/run.go

## Issues Found
- The prerequisites implied that checking the NetworkPolicy API verifies enforcement. Updated the text and command comment to clarify that the API check only confirms the resource is available; enforcement depends on the CNI plugin.
- The DNS policy said it allowed egress to the `kube-dns` service but only selected the entire `kube-system` namespace on port 53. Updated the wording to "DNS pods" and added a `podSelector` for the common `k8s-app: kube-dns` label.
- The API server policy comment said it allowed traffic to the API server, but the rule has no destination selector and allows common API server ports to any destination. Updated the comment to accurately describe the broad port-based rule while preserving the existing best-practice note to replace it with API server CIDRs.
- The source-controller artifact examples used port `8080`, which is Flux's Prometheus metrics port in the current install manifest, not the artifact HTTP service port. Replaced it with port `80` alongside target container port `9090`.
- The notification-controller API server egress rule allowed only port `6443`. Added port `443` to match the rest of the guide and common Kubernetes API server endpoints.
- The BusyBox troubleshooting command used `wget --timeout=5`. Updated it to `wget -T 5`, which is the BusyBox-compatible timeout form.
- The introduction said the guide covered each Flux CD controller, but it covers a common subset. Updated the wording to avoid overclaiming coverage.

## Review Notes
- Flux's default installation already includes NetworkPolicies that allow all egress and restrict ingress. In clusters installed with those defaults, adding a separate default-deny policy will not override an existing allow-all egress policy because Kubernetes NetworkPolicy rules are additive.
- The guide remains intentionally generic. Production clusters should replace broad egress rules with API server CIDRs, registry/repository destinations, or CNI-specific FQDN policies where supported.
- Clusters using NodeLocal DNSCache or nonstandard CoreDNS labels may need DNS policy adjustments.
