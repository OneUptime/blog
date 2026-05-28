# Validation Summary: How to Debug GKE Network Policy Blocking Pod-to-Pod Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes NetworkPolicy
- GKE Dataplane V2
- Calico network policy enforcement
- kubectl
- gcloud CLI
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- GKE network policy enforcement documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The post said any NetworkPolicy selecting a pod denies all traffic to that pod by default. Kubernetes isolation is direction-specific, so I changed this to ingress-specific wording in the ingress explanation and diagram.
- The GKE prerequisite section implied GKE does not enforce network policies by default in all cases and used a cluster describe check. I updated it to distinguish Standard Calico enforcement from GKE Dataplane V2, and used the official troubleshooting checks for Cilium and Calico enforcement.
- The selector helper only printed `matchLabels`, which could hide policies using `matchExpressions`. I changed it to print the full `podSelector`.
- The egress example relied on a custom namespace label named `name=target-namespace`. I changed it to use the automatic `kubernetes.io/metadata.name` namespace label and made the DNS namespace selector explicit for `kube-system`.
- The namespace labeling example included a manual `name=kube-system` label that was no longer needed after switching the DNS policy to the automatic namespace-name label, so I removed that command.

## Review Notes
The remaining examples use current `networking.k8s.io/v1` NetworkPolicy syntax and the AND/OR selector explanation matches Kubernetes documentation. The permissive policy example is technically correct because NetworkPolicy rules are additive.
