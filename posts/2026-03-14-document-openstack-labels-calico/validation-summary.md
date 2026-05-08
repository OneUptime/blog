# Validation Summary: How to Document OpenStack Labels with Calico for Operations Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenStack
- Calico OpenStack integration
- Calico WorkloadEndpoint labels
- Calico GlobalNetworkPolicy
- calicoctl
- Bash
- Python JSON processing
- YAML
- Mermaid

## Sources Consulted
- Calico OpenStack endpoint labels and operator policy: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico automatic labels and selector usage: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The Bash operational reference had invalid nested quoting around the inline Python command. I changed the example to quote the Python program with single quotes and use escaped double quotes inside the Python expression, so the generated command is syntactically valid shell.

## Review Notes
Calico's OpenStack integration automatically labels WorkloadEndpoints with OpenStack project, network, security group, and namespace labels. The guide's custom labels such as `environment`, `role`, and `compliance-zone` are reasonable examples for an environment that has an established operator-defined taxonomy, but they are not automatically supplied by Calico OpenStack unless added by the deployment's own workflow. Calico documentation also notes that WorkloadEndpoint lifecycle is generally managed by the orchestrator-specific plugin, so operational procedures should prefer viewing and auditing WorkloadEndpoints unless the deployment explicitly owns manual label updates.
