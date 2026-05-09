# Validation Summary: Troubleshoot Calico Networking on IBM Cloud

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IBM Cloud Kubernetes Service
- IBM Cloud VPC
- Calico
- Kubernetes network policies
- IBM Cloud CLI
- calicoctl

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies, https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: VPC security group rules, https://cloud.ibm.com/docs/vpc?topic=vpc-security-groups-rules
- IBM Cloud CLI reference: VPC security group commands, https://cloud.ibm.com/docs/cli?topic=cli-vpc-reference
- Calico documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl IPAM commands, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview

## Issues Found
- The post described IBM-managed Calico policies as IKS-wide GlobalNetworkPolicies with fixed example order values such as `allow-ibm-ports` at order 1000 and `allow-all-outbound` at order 2000. IBM documentation describes default Calico host policies for classic clusters, including `allow-all-outbound`, `allow-all-private-default`, `allow-node-port-dnat`, and `allow-sys-mgmt`, and states that default policies are recreated during master refreshes or updates. I updated the wording and policy examples.
- The post recommended using custom policy orders above 3000 to avoid conflicts. Calico evaluates lower order values first, and IBM documentation says lower order policies can be used to further restrict default private traffic. I changed the guidance to explain lower-order precedence, selector targeting, and validation of IBM management and service traffic.
- The diff command in the upgrade section had the operands reversed for the intended comparison. I changed it to `diff -u pre-upgrade-backup.yaml <(calicoctl get globalnetworkpolicies -o yaml)`.
- The Classic Infrastructure section asserted that `ipipMode` should always be `Always`. That was too absolute without version- or cluster-specific context, so I changed it to verify the encapsulation mode instead.
- The IPAM example used both `ipipMode` and `vxlanMode` in a new IPPool and did not warn about CIDR safety. Calico documents `vxlanMode` and `ipipMode` as mutually exclusive encapsulation fields, and IPPool CIDRs must be valid and non-overlapping. I removed `ipipMode: Never` and added a note to use only a reserved, non-overlapping CIDR that is valid for the cluster.
- The calicoctl authentication section used outdated `ibmcloud ks cluster config --admin --network` and `calicoctl.cfg` guidance. Current IBM docs configure calicoctl with the generated kubeconfig and `DATASTORE_TYPE=kubernetes`, so I updated the command sequence and path.

## Review Notes
The VPC security group commands and UDP 4789 VXLAN guidance are syntactically consistent with IBM Cloud CLI and Calico VXLAN documentation for self-managed Calico clusters. The post remains a troubleshooting guide rather than a complete runbook; production changes to IP pools and managed cluster networking should still be tested in a non-production cluster first.
