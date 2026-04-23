# Validation Summary: How to Recover from Rancher HA Node Failure - Recover Node Failure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- RKE2
- K3s
- etcd / etcdctl
- Kubernetes / `kubectl`
- AWS CLI / Amazon EC2

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- etcd: How to Add and Remove Members: https://etcd.io/docs/v3.5/tutorials/how-to-deal-with-membership/
- etcd: How to check Cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Rancher Nodes and Machine Pools: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher Removing Kubernetes Components from Nodes: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- AWS CLI `run-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html

## Issues Found
1. **RKE2-specific examples were presented without clearly scoping them.** The post referenced both RKE2 and K3s, but the cert paths and service behavior shown were RKE2-specific. I added a short clarification in the introduction that the examples use RKE2 paths/service names and that K3s uses its own `/var/lib/rancher/k3s/...` paths and `k3s` services.

2. **The Rancher cleanup command using `kubectl delete machine -n fleet-default ...` was not a generally correct node-removal procedure.** Rancher’s current docs describe deleting defective nodes through Rancher’s node-management flow, and the exact backing resources vary by cluster type. I replaced the command with Rancher UI guidance and a note to use Rancher’s delete action for machine-pool nodes instead of deleting `Machine` resources directly with `kubectl`.

3. **The replacement-node join example hard-coded a single server endpoint and applied `node-taint` unconditionally.** Official RKE2 HA guidance recommends a stable registration address in front of server nodes, and taints are optional and cluster-specific. I updated the example to prefer the stable registration address/load balancer and made `node-taint` explicitly conditional.

4. **The etcd verification step only checked the local endpoint.** `endpoint health` without `--cluster` validates only the configured endpoint, not all members. I updated the verification commands to use `endpoint status --cluster -w table` and `endpoint health --cluster`.

5. **The EC2 AMI placeholder was not in a realistic AMI ID format.** I changed it to a syntactically plausible placeholder (`ami-0123456789abcdef0`) while keeping the example illustrative.

## Review Notes
- The guide assumes a three-server embedded-etcd Rancher HA deployment where quorum is still intact after one permanent server failure. If quorum is already lost or the cluster uses an external datastore instead of embedded etcd, the recovery path is different.
- The post still focuses operational examples on RKE2. That is acceptable after the scoping clarification, but a future revision could add a parallel K3s join example for completeness.
