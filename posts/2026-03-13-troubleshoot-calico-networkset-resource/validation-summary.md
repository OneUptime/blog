# Validation Summary: Troubleshoot Calico NetworkSet Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkSet and GlobalNetworkSet
- Calico NetworkPolicy and GlobalNetworkPolicy selectors
- Calico Felix dataplane programming
- Linux ipset
- Kubernetes kubectl
- Python ipaddress module

## Sources Consulted
- Calico Open Source NetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico Open Source GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico Open Source NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix ipsets package documentation: https://pkg.go.dev/github.com/projectcalico/felix/ipsets
- Kubernetes kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl delete documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Python ipaddress module documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The kernel ipset inspection example assumed a Calico ipset named `cali-s:blocked-ips`. Felix uses generated internal names for dataplane ipsets, so the command could fail even when the NetworkSet is programmed correctly. Updated the example to search Calico selector ipsets and report the set containing the target IP.
- The policy matching section referred generically to the policy selector. In Calico, NetworkSets are matched by rule `source.selector` or `destination.selector`, while the top-level policy selector selects the endpoints the policy applies to. Updated the comments and inspection command to focus on source/destination rule selectors.
- The namespace scoping section said a namespaced NetworkSet cannot be used in a GlobalNetworkPolicy. Calico's policy docs describe entity rule selectors as able to match namespaced or global network sets, with selector scope depending on policy type and namespace selectors. Updated the wording to avoid the incorrect absolute claim and to recommend GlobalNetworkSet for cluster-wide use.

## Review Notes
The remaining commands and examples are technically plausible for current Calico and Kubernetes CLIs. The Felix pod restart command is operationally disruptive because it deletes a `calico-node` pod on the selected node; future revisions could add a caution to run it only during an approved maintenance window.
