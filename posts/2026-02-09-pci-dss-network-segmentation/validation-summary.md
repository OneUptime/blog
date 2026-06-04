# Validation Summary: Configure Kubernetes Network Segmentation for PCI-DSS Cardholder Data Isolation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes namespaces
- PCI DSS network security controls and CDE segmentation
- CiliumNetworkPolicy
- Cilium Hubble metrics and UI
- Helm
- Istio PeerAuthentication and AuthorizationPolicy
- PrometheusRule
- kubectl validation commands

## Sources Consulted
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes namespace labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-metadata-name
- Cilium network policy documentation: https://docs.cilium.io/en/stable/security/policy/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Layer 4 / TLS SNI policy documentation: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- PCI Security Standards Council PCI DSS page: https://www.pcisecuritystandards.org/standards/pci-dss/
- PCI DSS v4.0 SAQ references from PCI SSC, including Requirement 1.3 wording: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf

## Issues Found
- The post described PCI DSS Requirement 1.3 as mandating segmentation and used older sub-requirement wording. Updated the text to current PCI DSS v4.x wording: Requirement 1.3 restricts network access to and from the CDE, while related controls between trusted and untrusted networks are in Requirement 1.4.
- Several NetworkPolicy examples used `namespaceSelector` and `podSelector` as separate list items where the intent was to match pods in a selected namespace. Kubernetes treats separate `from`/`to` entries as OR conditions, so these were combined into single selector entries.
- DNS policies selected `kube-system` with a non-standard `name` label. Updated them to use Kubernetes' standard `kubernetes.io/metadata.name` namespace label.
- The native Kubernetes egress example attempted to represent an external payment gateway with `podSelector: {}`. Updated it to use an `ipBlock` placeholder and clarified that approved payment gateway CIDRs should be used.
- The post implied Kubernetes NetworkPolicies can create explicit deny rules. Updated comments and policy names to reflect that native NetworkPolicies are additive allow lists.
- The DMZ ingress example used `namespaceSelector: {}` for internet ingress, which only selects cluster namespaces. Updated it to use `ipBlock: 0.0.0.0/0`.
- The Cilium policy comment said `toEntities: cluster` denied other external traffic. Updated the comment to explain that it allows in-cluster traffic and other external traffic is denied because it is not otherwise allowed.
- The Cilium Layer 7 example used HTTP rules on a TLS-labeled path without explaining visibility requirements. Added a short comment that HTTP rules require traffic visible to Cilium, such as TLS termination before that hop.
- The Cilium Helm command enabled Hubble but not Hubble Relay, UI, or the metrics used by the Prometheus rules. Added the required Hubble values and metric context options.
- The Prometheus rules used Cilium metric labels that are not available on `cilium_drop_count_total` / `cilium_forward_count_total`. Updated them to Hubble metrics with matching context labels.

## Review Notes
The YAML snippets parse successfully. Local CLI validation with `kubectl`, `helm`, `istioctl`, and `hubble` could not be run because those binaries are not installed in this workspace; command and field validation was performed against official documentation.
