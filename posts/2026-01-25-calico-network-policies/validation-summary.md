# Validation Summary: How to Configure Network Policies with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico Open Source
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico Enterprise / Calico Cloud DNS policy
- Calico application layer policy with Istio
- calicoctl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Kubernetes NetworkPolicy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico domain-based policy documentation: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico application layer policy with Istio documentation: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico iptables logs documentation: https://docs.tigera.io/calico-cloud/observability/iptables
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Project Calico v3.32.0 release manifests on GitHub: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/

## Issues Found
- The post said standard Kubernetes NetworkPolicy works with any CNI. Kubernetes requires a network plugin that implements NetworkPolicy enforcement, so the wording was corrected.
- The installation commands were pinned to Calico v3.26.4. Updated them to current Calico v3.32.0 manifests and added the Project Calico CRD manifest required by the current operator installation instructions.
- The post presented DNS domain rules as a general Calico Open Source feature. Domain-based egress policy is documented for Calico Enterprise / Calico Cloud, so the section title and surrounding wording were corrected.
- The application layer policy prerequisite said only "Envoy sidecar." Calico's documented setup uses Istio sidecars plus Calico application layer policy components, so the prerequisite wording was corrected.
- The namespace isolation GlobalNetworkPolicy used `namespaceSelector: all()` in rules described as "same namespace," which would allow traffic across all selected namespaces. Replaced it with a namespaced Calico NetworkPolicy where same-namespace selectors have the intended scope.
- The policy log command tailed Calico node pod logs, but Calico `Log` action packet logs are emitted through node syslog/kernel logging. Replaced it with a `journalctl` command that follows kernel logs for the Calico packet prefix.
- The FelixConfiguration flow-log example used fields that are not available in the Calico Open Source v3.26 API. Replaced that example with a valid Calico NetworkPolicy using `Log` actions for packet visibility.

## Review Notes
- YAML snippets were parsed successfully with PyYAML after the fixes.
- Several Kubernetes NetworkPolicy examples assume namespaces are labeled with `name: <namespace>`. That pattern is valid if teams apply those labels, but future improvements could use the automatic `kubernetes.io/metadata.name` namespace label for portability.
