# How to Include Control-Plane Nodes in Cloud Load Balancer Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud, Load Balancing, Networking, Troubleshooting

Description: Make an intentional control-plane node eligible for cloud load balancer backends by checking exclusion labels, provider filters, scheduling, and local endpoint health.

---

A small Kubernetes cluster may run its application on a control-plane node yet have no usable external load balancer backend. One common reason is the node's `node.kubernetes.io/exclude-from-external-load-balancers` label.

Removing that exclusion can make the node eligible, but load balancer membership and pod scheduling are different decisions. A control-plane scheduling taint, a provider-specific node selector, or a lack of local ready endpoints can still prevent the intended traffic path from working.

## Decide which node should carry application traffic

Including control-plane nodes is a reasonable deliberate choice for some labs, edge deployments, and small clusters. It also places application ingress traffic on machines running API server or etcd workloads. Confirm that this matches the cluster's intended capacity and exposure model before making a broad label change.

Choose one node initially and inspect its state:

```bash
kubectl get nodes -o wide
kubectl get node control-1 -o json | jq '{
  labels: .metadata.labels,
  taints: .spec.taints,
  providerID: .spec.providerID,
  addresses: .status.addresses,
  conditions: .status.conditions
}'
```

Check that the node is ready, has the correct provider identity and routable address, and is not being removed by an autoscaler. An exclusion label is only one of the standard service controller's eligibility checks.

The [Kubernetes label reference](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-kubernetes-io-exclude-from-external-load-balancers) documents the external load balancer exclusion. The [OCCM Service guide](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md) also calls out removing this label for a single-control-plane test environment.

## Remove the explicit exclusion on the selected node

If the label is present and inclusion is intended, remove it:

```bash
kubectl label node control-1 \
  node.kubernetes.io/exclude-from-external-load-balancers-
```

The trailing hyphen removes the key. This is a more portable inclusion operation than setting its value to `false`: older Kubernetes service-controller implementations treat the presence of the label as exclusion, while v1.34 introduced boolean-value handling.

Because an external CCM bundles Kubernetes cloud-provider code, check the controller image's implementation when depending on that version-specific behavior. Upgrading only the API server does not necessarily change how an older CCM binary interprets the label.

Re-read the node to confirm removal and inspect whether your cluster provisioning system restores it. Persist the intended setting in the node bootstrap or cluster-management configuration if necessary.

## Check provider-specific filters

A provider can narrow the node list further. For example, OCCM uses `loadbalancer.openstack.org/node-selector`, and HCCM uses `load-balancer.hetzner.cloud/node-selector`.

Read the Service annotations:

```bash
kubectl -n production get service web -o json | jq '{
  annotations: .metadata.annotations,
  trafficPolicy: .spec.externalTrafficPolicy,
  ports: .spec.ports,
  status: .status.loadBalancer
}'
```

If the Service selects an ingress node group, either include the chosen control-plane node in that group or change the intended selection rule. For example:

```bash
kubectl label node control-1 ingress-pool=public --overwrite
```

Only use that label if it actually matches your provider configuration. The provider selectors differ in syntax and capabilities; consult the exact controller's annotation reference rather than assuming they are interchangeable.

Changing a custom node label may not by itself trigger all controller implementations to refresh membership. If necessary, update a harmless Service annotation to request a focused reconciliation, then inspect Service events and the cloud target list.

## Handle scheduling separately

If the application needs to run on the control-plane node, inspect whether the pod has the required toleration. A focused pod-template fragment for the standard control-plane taint is:

```yaml
spec:
  template:
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      nodeSelector:
        ingress-pool: public
```

Merge this into the intended workload. The toleration permits scheduling past that taint; it does not force placement. The node selector narrows placement to the labeled pool. Account for any other taints, resource requests, affinity rules, and topology requirements.

Do not remove all control-plane taints from all nodes merely to troubleshoot external load balancing. Taints control workload placement, while the exclusion label controls backend eligibility. Keeping those decisions separate produces a smaller and clearer change.

## Verify local endpoints and cloud health

For `externalTrafficPolicy: Cluster`, the node can normally forward Service traffic to ready endpoints elsewhere, subject to the cluster's networking implementation. With `externalTrafficPolicy: Local`, traffic is intended for local endpoints, so backend health depends on where ready pods actually run.

```bash
kubectl -n production get pods -l app=web -o wide
kubectl -n production get endpointslices \
  -l kubernetes.io/service-name=web -o yaml
kubectl -n production describe service web
```

Inspect the provider's load balancer target or member list. Confirm that the control-plane node's correct address or server identity appears, that the destination port matches the Service NodePort behavior, and that health checks pass.

Test application requests from outside the cluster. Watch control-plane CPU, memory, network load, and application latency during a representative traffic period. Membership alone does not establish that the node can safely sustain the workload.

To reverse the membership decision, restore the exclusion label with `true` and verify that the controller removes the backend while traffic continues through remaining healthy nodes.

## Conclusion

Include a control-plane node by removing its load balancer exclusion, satisfying provider filters, and verifying the endpoint and health-check path. Treat scheduling permissions and control-plane capacity as separate parts of the same intentional deployment decision.

## Official Documentation

- [Kubernetes external load balancer exclusion label](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-kubernetes-io-exclude-from-external-load-balancers)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes Service external traffic policy](https://kubernetes.io/docs/concepts/services-networking/service/#external-traffic-policy)
- [OCCM node selection and single-node note](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
