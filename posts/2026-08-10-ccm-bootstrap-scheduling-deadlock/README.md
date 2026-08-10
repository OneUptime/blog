# Breaking the Cloud Controller Manager Bootstrap Scheduling Deadlock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Bootstrap, Scheduling, Taints, High Availability

Description: Make an external cloud-controller-manager schedulable during cluster bootstrap without bypassing the Node initialization safety boundary.

---

An external cloud-controller-manager (CCM) can create a circular dependency during bootstrap:

1. kubelets using `--cloud-provider=external` add `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` to their Nodes;
2. the scheduler refuses ordinary Pods on those Nodes;
3. the CCM is itself managed as a Pod and lacks a matching toleration;
4. the CCM never starts, so no controller removes the taint.

The right fix is to make the system component schedulable under bootstrap conditions, normally on control-plane Nodes, while preserving the taint for ordinary workloads. Removing the taint from every Node bypasses the safety boundary and can hide missing cloud identity, topology, and addresses.

## Prove It Is a Scheduling Deadlock

Find the CCM workload and inspect one Pending Pod:

```bash
kubectl get deploy,daemonset,pod -A -o wide | grep -i cloud-controller
kubectl describe pod -n kube-system CCM_POD
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

The scheduler event should explicitly mention an untolerated taint, affinity or selector mismatch, insufficient resources, or another scheduling or binding failure. Do not assume the uninitialized taint is the only blocker. Even after that taint is tolerated, the CCM workload can still fail to start because:

- the control-plane selector matches no current label;
- it does not tolerate `node-role.kubernetes.io/control-plane:NoSchedule`;
- required anti-affinity is impossible in a one-node bootstrap cluster;
- credentials for a private image are unavailable, or a required non-optional Secret or ConfigMap cannot be loaded after assignment;
- its ServiceAccount is missing or admission policy rejects Pod creation;
- CPU or memory requests exceed bootstrap capacity; or
- a required PVC cannot bind before topology exists.

If the ServiceAccount is missing or admission rejects creation, no Pod is created; inspect the owning ReplicaSet or DaemonSet events for `FailedCreate`. `FailedScheduling` is emitted by the scheduler for scheduling or binding failures; image-pull, configuration or volume setup, and runtime failures appear after assignment. Follow the event, not the expected story.

## Use the Provider's Maintained Manifest

Provider charts and cluster lifecycle tools should already encode the required RBAC, arguments, scheduling, and credentials. Render and review the exact version before changing it:

```bash
helm template ccm PROVIDER_REPOSITORY/PROVIDER_CHART \
  --version PROVIDER_CHART_VERSION \
  --namespace kube-system -f values.yaml > rendered-ccm.yaml

grep -n -A25 -B5 'tolerations:' rendered-ccm.yaml
grep -n -A20 -B5 'affinity:\|nodeSelector:' rendered-ccm.yaml
```

The generic Kubernetes DaemonSet example is a guideline, not a production manifest. It contains provider placeholders and historical image details. Prefer the provider's supported release and installation path.

## Add the Bootstrap Tolerations

A CCM scheduled as a Pod normally needs to tolerate the external-provider taint:

```yaml
spec:
  template:
    spec:
      priorityClassName: system-cluster-critical
      tolerations:
        - key: node.cloudprovider.kubernetes.io/uninitialized
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
```

Some clusters still use the legacy `node-role.kubernetes.io/master` taint, and some provider manifests also tolerate `node.kubernetes.io/not-ready` or short `NoExecute` periods for `not-ready` and `unreachable`. Add only the effects and keys needed for the documented topology. `operator: Exists` is more robust than assuming the uninitialized taint has one particular value.

A toleration permits placement; it does not force placement. Pair it with provider-supported affinity or a selector for control-plane Nodes. Confirm actual labels:

```bash
kubectl get nodes --show-labels
```

Prefer node affinity when supporting clusters whose control-plane labels can vary. Avoid an overly broad selector that places credentialed CCM Pods on untrusted worker nodes.

## Choose Bootstrap-Safe Dependencies

The CCM should have as few circular dependencies as possible:

- It must reach the Kubernetes API before cluster Service networking is necessarily healthy. Some provider manifests use `hostNetwork: true` and control-plane API addressing for this reason; follow the provider design rather than adding it generically.
- Its cloud credentials must be available before Node initialization. If they depend on workload identity, confirm that the identity webhook, projected token, DNS, and provider token endpoint work during bootstrap.
- Avoid a storage-backed volume for essential CCM configuration unless that storage path is independently available before the CCM.
- Use a system priority class so the scheduler ranks the controller ahead of ordinary lower-priority workloads during recovery.
- Ensure the image registry is reachable, or pre-pull the pinned image through the node provisioning process and use a compatible image pull policy.

If the CNI is not ready, ordinary Pod networking may also be unavailable. A DaemonSet receives several automatic tolerations, but it does not automatically receive the cloud-provider uninitialized toleration. Deployment and DaemonSet behavior differ; inspect the rendered Pod template.

## Deployment, DaemonSet, or Static Pod

Use the topology the provider and cluster lifecycle tool support.

A Deployment gives a fixed replica count and flexible zone spreading. A DaemonSet commonly places one replica on each control-plane Node and automatically tracks added control-plane Nodes, but replicas still need explicit cloud and role tolerations. Deployments and DaemonSets both normally require the scheduler to be operational. A static Pod starts directly from a kubelet manifest and can break a scheduler dependency, but makes rollout, secret distribution, and lifecycle management more tightly coupled to node configuration.

Changing workload kind during an incident can leave a second set of CCM processes running. If the old and new workloads do not use the same leader-election lock, both can reconcile concurrently. Prefer a minimal patch to the supported manifest, persist it in the real configuration source, and let the owning tool reconcile it.

## Make High Availability Real

Multiple CCM replicas usually use leader election. Only the leader performs the main reconciliation; additional replicas improve failover rather than throughput. During bootstrap:

- spread replicas across control-plane Nodes or failure zones when the topology supports it;
- use preferred anti-affinity for a cluster that may temporarily have fewer Nodes than replicas;
- do not require three distinct zones in a one-zone development cluster;
- verify all replicas use the same leader-election lock type, namespace, and resource name; and
- grant the ServiceAccount permissions on `coordination.k8s.io` Leases.

```bash
kubectl get leases -A | grep -i cloud
kubectl get lease -n kube-system CCM_LEASE -o yaml
```

A Running standby is healthy. A persistently stale `renewTime`, no holder while replicas are expected to be active, or repeated leadership loss requires API connectivity, RBAC, latency, and process investigation.

## Recover in a Controlled Order

1. Save the Pending Pod events and current manifest.
2. Patch the provider-owned configuration with the missing toleration, compatible placement, or bootstrap-safe dependency fix.
3. Watch one CCM Pod become scheduled and ready.
4. Confirm one replica acquires the Lease and its logs show successful Node initialization.
5. Watch ProviderID, topology, addresses, and the taint on Nodes rather than deleting the taint yourself.
6. Confirm ordinary system and workload Pods start scheduling only after initialization.
7. Persist the change in Helm values, GitOps, Cluster API, machine configuration, or the distribution's source of truth.

```bash
kubectl get pods -n kube-system -w
kubectl get nodes -w -o \
  'custom-columns=NAME:.metadata.name,PROVIDER_ID:.spec.providerID,REGION:.metadata.labels.topology\.kubernetes\.io/region,ZONE:.metadata.labels.topology\.kubernetes\.io/zone,ADDRESSES:.status.addresses,TAINTS:.spec.taints'
```

If emergency access requires a temporary manifest patch, record it and immediately update the declarative owner. Otherwise the next reconciliation or control-plane replacement can restore the deadlock.

## Official Documentation

- [Kubernetes: The Cloud Controller Manager chicken-and-egg problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: DaemonSet tolerations](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#taints-and-tolerations)
- [Kubernetes: Guaranteed Scheduling for Critical Add-On Pods](https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)

## Conclusion

Break the bootstrap deadlock by making the CCM a true bootstrap-critical component: tolerate the uninitialized and control-plane taints, select reachable control-plane Nodes, minimize dependencies on unfinished cluster services, and preserve leader election. Once the elected controller initializes Nodes, it removes the taint through the normal reconciliation path. That solves both scheduling and cloud metadata; deleting the taint solves only the first symptom.
