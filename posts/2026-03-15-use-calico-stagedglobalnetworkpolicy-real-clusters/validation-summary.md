# Validation Summary: How to Use the Calico StagedGlobalNetworkPolicy Resource in Real Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise
- StagedGlobalNetworkPolicy
- GlobalNetworkPolicy
- Kubernetes
- calicoctl
- Calico Enterprise Manager
- Calico flow logs
- FelixConfiguration

## Sources Consulted
- Calico Enterprise StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Enterprise staged policy workflow: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico Enterprise calicoctl get command reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico Enterprise calicoctl user reference and resource aliases: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/overview
- Calico Enterprise flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Enterprise FelixConfiguration and flow log settings: https://docs.tigera.io/calico-enterprise/latest/reference/resources/felixconfig

## Issues Found
- The post said to review flow logs in Calico Enterprise Manager to see which connections would be denied. I clarified that users should use policy preview or inspect staged policy fields in flow logs, because the official workflow describes previewing staged policy impact and flow logs expose pending policy information.
- The egress example was described as allowing all cluster-internal traffic and specific external services. The actual YAML only allows `10.0.0.0/8` and UDP destination port 53 before denying other egress. I changed the explanation to describe exactly what the policy allows and noted that the CIDR must be adjusted to the cluster's real Pod, Service, or private network ranges.
- The CI/CD script told users to review before "committing." I changed this to "before enforcing" to match Calico's staged policy workflow.
- The troubleshooting section said to delete the StagedGlobalNetworkPolicy if a staged policy was accidentally committed. In Calico Enterprise, enforcing a staged policy creates or updates the enforced policy and deletes the staged policy. I changed the guidance to update or delete the resulting GlobalNetworkPolicy, or apply a corrective GlobalNetworkPolicy with the appropriate tier and order.

## Review Notes
The YAML examples use the documented `projectcalico.org/v3` API, `StagedGlobalNetworkPolicy` kind, policy `types`, rule `action`, `protocol`, `destination.nets`, and `destination.ports` fields. The `calicoctl apply` and `calicoctl get stagedglobalnetworkpolicies -o wide` commands are supported by the official calicoctl resource and output references.
