# Validation Summary: Using calicoctl label with Practical Examples

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Calico label selectors

## Sources Consulted
- Calico Open Source calicoctl label documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/label
- Calico Open Source calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source Protect Kubernetes nodes documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico Open Source Node resource documentation: https://docs.tigera.io/calico/latest/reference/resources/node

## Issues Found
- The label removal command used Kubernetes-style `tier-` syntax. Changed it to `calicoctl label nodes worker-1 tier --remove`, which matches the documented `calicoctl label` syntax.
- The node segmentation policy labeled Calico Node resources and then used a GlobalNetworkPolicy selector to match those labels. GlobalNetworkPolicy selectors match workload endpoints and host endpoints, not Calico Node resources. Changed the example to label host endpoints and clarified that the policy restricts storage host endpoint access.
- The bulk labeling script used `-o jsonpath`, which is not a documented `calicoctl get` output format. Changed it to the documented `go-template` output format for listing node names.
- The verification example used `calicoctl get nodes -l env=production`, but `calicoctl get` does not document a `-l` label selector flag. Replaced it with direct inspection of a labeled node.
- The introduction implied all listed labels were directly useful for network policy targeting. Adjusted the wording to distinguish endpoint labels used by network policies from Node labels used by Calico node-related configuration.

## Review Notes
The examples assume that the named host endpoints already exist before they are labeled in later sections. In a production guide, it would be useful to include guidance for automatic host endpoint creation or consistently create all host endpoints used in examples.
