# How to Make Cluster Autoscaler React to Affinity and Topology Blockers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Scheduling, Troubleshooting

Description: Diagnose autoscaler no-scale-up decisions by comparing pending pod constraints with node-group templates, topology domains, and scale-from-zero metadata.

---

Cluster Autoscaler does not add arbitrary nodes whenever a pod is pending. It evaluates whether expanding a supported node group could make the pod schedulable. If every available group would produce a node with the wrong labels, zone, or taints, adding capacity would not help.

The fix is to make an expandable node group satisfy the pod's real requirements, or correct a requirement that was unintended. Increasing every group's maximum size does not repair a placement mismatch.

## Establish whether scale-up was rejected or failed

Start with the pod and its controller:

```bash
ns=production
pod=checkout-7ddcb6d688-abcde
kubectl describe pod "$pod" -n "$ns"
kubectl get pod "$pod" -n "$ns" -o json | jq '.spec | {
  schedulerName, nodeSelector, affinity, tolerations,
  topologySpreadConstraints, resources, containers, initContainers, overhead
}'
```

For a self-managed autoscaler installed as `deployment/cluster-autoscaler`, inspect its recent logs:

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler --since=15m
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

Installation names and status availability vary. Managed services may expose autoscaler decisions only through provider logs. Distinguish “no matching expansion option” from “selected a group but the cloud rejected node creation.” The latter needs quota, capacity, permission, or bootstrap diagnosis.

For GKE, [scale-up troubleshooting](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/cluster-autoscaler-scale-up) documents rejected node groups and failing predicates such as `NodeAffinity`, separately from cloud quota and capacity failures.

## Compare requirements with future nodes

Build a small worksheet for each expandable group:

| Property | Pending pod requires | Node group would create |
| --- | --- | --- |
| Pool label | `workload=payments` | Does the provisioning template set it? |
| Zone | `zone-b` | Can this group create there? |
| Taints | Matching tolerations | Are all hard taints covered? |
| Resources | Effective pod requests | Allocatable after system and DaemonSet demand |
| Storage | Compatible PVC/PV topology | Matching CSI and zone support |
| Growth | Another suitable node | Below group and cluster limits? |

A label added manually to one existing node may not describe the next node. Put labels and taints in the group's supported provisioning configuration, and ensure the autoscaler can infer them during simulation.

The upstream [Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md) states that node selectors and required node affinity affect expansion candidates, while preferred node affinity does not select which group expands. A soft preference alone is therefore not a reliable trigger to add a preferred pool while the pod can run elsewhere.

## Make scale-from-zero metadata accurate

With an empty group, there may be no live node from which to infer custom labels or taints. Use the provider's supported node-template mechanism.

For the AWS integration, the [official autoscaler provider README](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md) documents Auto Scaling group tags such as:

```text
k8s.io/cluster-autoscaler/node-template/label/workload = payments
k8s.io/cluster-autoscaler/node-template/taint/dedicated = payments:NoSchedule
```

These describe the group's simulated nodes. They must agree with labels and taints actually installed during node bootstrap. They are additional to the discovery configuration that makes the group visible to Cluster Autoscaler.

Check the documentation for your deployed autoscaler release and provider integration. Managed node groups may expose this information through provider APIs instead of requiring the same tags in every situation.

## Reason about the missing topology domain

Required hostname anti-affinity can often be satisfied by adding another matching node: the new hostname creates another separation domain. Required zone separation is different. Adding five nodes in an already excluded zone creates no new zone.

For topology spread, inspect both the pod selector and the topology labels on eligible nodes:

```bash
kubectl get nodes -L workload,topology.kubernetes.io/zone
kubectl get pods -n production -l app=checkout -o wide
```

Write the current matching-pod counts per zone and identify where another pod is allowed. If only zone-b can satisfy a hard skew rule, verify that an expandable group can actually produce a suitable node there.

An entirely empty zone also needs attention. The [topology spread documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/) notes that domains without nodes may be invisible to the scheduler. Autoscaler awareness of the full domain set and the specific spread features matters; do not assume `minDomains` alone causes a provider to create the missing zone.

## Test the complete path

Use a controlled staging workload with the same requests and placement rules. Make it pending through representative capacity pressure, then observe a sequence: scheduler rejection, autoscaler expansion decision, cloud node creation, node registration with expected metadata, and pod assignment.

If the group expands but the new pod remains pending, compare the actual node against the worksheet. A mismatch between simulated and real labels, taints, resources, or volume topology is more actionable than repeatedly restarting the autoscaler.

Finally, verify the replacement path from zero nodes if production depends on it. Record the autoscaler version, provider configuration, group limits, and observed placement. That confirms the pool can respond to the constraint under the conditions that previously blocked it.
