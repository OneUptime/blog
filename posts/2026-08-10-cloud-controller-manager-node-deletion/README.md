# Can cloud-controller-manager Delete a Kubernetes Node? Understanding Cloud Node Lifecycle Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Node Lifecycle, Cloud Provider, Node Deletion, Troubleshooting

Description: Learn when cloud-controller-manager deletes a Kubernetes Node object, how provider existence checks differ from health monitoring, and how to investigate safely.

---

Yes. A cloud-controller-manager (CCM) built with Kubernetes' cloud node lifecycle controller can delete a Kubernetes `Node` object after the Node is not ready and the cloud provider reports that its backing instance no longer exists.

It does not use this path to delete the virtual machine. The direction is the opposite: it observes the provider reporting that the instance is already gone, then removes the stale representation from the Kubernetes API. That distinction is essential when reading an audit event that says the CCM deleted a Node.

## The Decision in the Current Upstream Controller

The Kubernetes cloud-provider v0.36.0 implementation periodically lists Nodes and evaluates each one:

```text
Node Ready == True
  └─ do not perform an instance-existence check in this loop
     remove the provider shutdown taint if present

Node Ready != True (False or Unknown, including no Ready condition)
  └─ ask the provider whether the instance exists
       ├─ operational provider error: log it and leave the Node alone
       ├─ instance absent: delete the Kubernetes Node object
       └─ instance exists: ask whether it is shut down
            └─ if shut down, add a NoSchedule shutdown taint
```

The default shared configuration sets the cloud node monitor period to five seconds, although provider distributions can change it. Provider API latency, informer timing, retries, and leader availability mean this is not a promise that deletion completes within five seconds.

## Health and Existence Are Different Questions

Kubernetes has cloud-independent Node health management as well as provider-backed lifecycle checks.

In a current external-cloud cluster, kube-controller-manager's `node-lifecycle-controller` observes Node status updates and Node Lease renewals. If neither heartbeat is refreshed within the configured grace period, it can set `Ready=Unknown` and add the `node.kubernetes.io/unreachable` taint; a reported `Ready=False` maps to `node.kubernetes.io/not-ready`. Since Kubernetes 1.29, the separate `taint-eviction-controller` processes these `NoExecute` taints and Pod tolerations to evict Pods according to cluster settings. Neither path needs to know whether the machine still exists.

The provider CCM's `cloud-node-lifecycle-controller` adds a separate fact available only from the infrastructure API: is the server identified by this Node still present? If the answer is authoritatively no, the cloud lifecycle controller deletes the API object. The Kubernetes CCM documentation describes the same behavior: when a Node becomes unresponsive, the cloud node controller checks whether its server has been deactivated, deleted, or terminated and deletes the Node object if the server has been deleted from the cloud.

Therefore:

- `NotReady` alone does not mean the CCM should delete the Node;
- an existing but unreachable VM may remain represented while normal health handling proceeds;
- a powered-off instance can be tainted rather than deleted if the provider reports that state; and
- a deleted VM can leave a stale Node when the CCM, provider API, or lifecycle controller is unavailable.

## What the Provider Must Implement

The standard controller requires an instance interface. External providers can implement `InstancesV2`, whose relevant methods are:

```go
InstanceExists(ctx context.Context, node *v1.Node) (bool, error)
InstanceShutdown(ctx context.Context, node *v1.Node) (bool, error)
```

Providers can instead use the original `Instances` interface and provider-ID-based methods. If neither interface is supported, the upstream cloud node lifecycle controller does not start successfully.

This makes deletion provider-dependent. The provider decides how `.spec.providerID`, Node name, tags, project, region, or other attributes map to an instance and what “exists” means. Some implementations split cloud node initialization and lifecycle into separate controllers, and a provider can choose which controllers its manifest enables.

## Provider ID Is a Safety-Critical Join Key

A Node's `.spec.providerID` is intended to uniquely identify the backing infrastructure instance. Inspect it before assuming that the Node name is sufficient:

```bash
kubectl get node <node-name> -o jsonpath='{.spec.providerID}{"\n"}'
kubectl get node <node-name> -o jsonpath='{.status.conditions}{"\n"}'
kubectl get node <node-name> -o jsonpath='{.metadata.uid}{"\n"}'
```

An empty, malformed, recycled, or wrong provider ID can prevent existence checks or make provider lookup dangerous, depending on implementation. On the legacy `Instances` path, the lifecycle controller attempts to derive a provider ID from the Node name when the field is empty. With `InstancesV2`, it passes the Node directly to `InstanceExists` and `InstanceShutdown`, and the provider owns the fallback lookup semantics. On the legacy empty-ID lookup, an exact `cloudprovider.InstanceNotFound` result is treated as authoritative absence; other provider errors leave the Node unchanged.

Use stable provider IDs and make Node names unique across the lifetime of the cluster. If infrastructure automation quickly replaces a server while reusing a Node name, compare the Node UID and provider ID before attributing events to the replacement.

## Deletion and Shutdown Produce Different Effects

When `InstanceExists` (or the legacy `InstanceExistsByProviderID`) returns false without an error for a non-ready Node, the upstream controller emits a normal Event with reason `DeletingNode`, then calls the Kubernetes Node delete API. If that API call fails, it emits a warning Event with reason `DeletingNodeFailed`.

When the instance exists but `InstanceShutdown` (or the legacy `InstanceShutdownByProviderID`) returns true without an error, the controller adds:

```text
node.cloudprovider.kubernetes.io/shutdown:NoSchedule
```

That taint prevents new scheduling for Pods that do not tolerate it but does not delete the Node. If the Node later becomes `Ready=True`, the lifecycle loop removes the shutdown taint. Providers that return `NotImplemented` for the legacy shutdown check are treated as not reporting shutdown through that method.

Deletion of the Node object then interacts with other Kubernetes controllers and garbage collection. It is not a graceful drain of the machine and should not be used as a substitute for planned maintenance. Drain workloads before intentionally terminating a Node whenever the failure model permits.

## Why a Deleted VM Can Leave a Node Behind

If the infrastructure instance is gone but the Node object persists, check each prerequisite:

1. Is the Node's `Ready` condition anything other than `True` (`False`, `Unknown`, or absent)? The upstream lifecycle loop skips existence checks only while it is `Ready=True`.
2. Is a CCM replica healthy, able to reach the API server, and, when leader election is enabled, holding the leader Lease?
3. Is the provider's cloud node lifecycle controller enabled and implemented?
4. Does the provider's configured lookup key (`.spec.providerID` or Node name, depending on the interface and implementation) resolve the deleted instance in the expected project, account, and region?
5. Can the CCM call the provider's instance-existence API?
6. Does its Kubernetes identity have permission to delete Nodes?
7. Are provider API errors or throttling causing the controller to leave the Node unchanged?

Use Events and logs together:

```bash
kubectl describe node <node-name>
kubectl get events --all-namespaces \
  --field-selector involvedObject.kind=Node,involvedObject.name=<node-name> \
  --sort-by=.lastTimestamp
kubectl logs -n kube-system <ccm-pod> --since=30m | grep -E '<node-name>|DeletingNode|cloud provider'
kubectl get lease -n kube-system cloud-controller-manager -o yaml
```

Provider labels vary, and when leader election is enabled, Lease names can vary. Also inspect cloud audit records for the exact lookup and response. A connectivity timeout or permission denial is not an “instance absent” answer; the upstream controller logs the error and continues without deleting the Node.

## Why a Node Might Be Deleted Unexpectedly

An unexpected Node deletion deserves investigation because several identities are being joined:

- the Kubernetes Node name and UID;
- `.spec.providerID`;
- the cloud account, project, subscription, or tenancy;
- provider region or zone; and
- the instance returned by the provider integration.

Capture Kubernetes audit logs for the Node delete request, the `DeletingNode` Event, CCM logs from the active leader, and provider API audit logs. Confirm whether the backing instance existed at that time and whether autoscaling or infrastructure automation had already removed it.

Do not immediately disable all lifecycle handling or recreate a Node object with copied status. First determine whether the provider returned a false negative, the CCM used the wrong cloud configuration, or automation deleted the instance earlier than expected. If containment is required, follow the provider's documented method for disabling only the affected lifecycle controller and understand that stale Nodes will then require another cleanup path.

## Safe Operational Practices

- Alert on repeated provider lookup errors, `DeletingNodeFailed` Events, and stale non-ready Nodes.
- Keep provider credentials scoped but sufficient for instance reads and Kubernetes RBAC sufficient for the controller's documented Node operations.
- For providers that support provider IDs, treat expected provider ID population as a readiness signal for cloud initialization.
- Test scale-down and instance replacement in a non-production cluster after CCM upgrades.
- Drain before planned termination; the absence-check path is failure cleanup, not maintenance orchestration.
- Preserve API and cloud audit records long enough to correlate a Node UID with its infrastructure instance.
- Run replicated CCM candidates with leader election to limit the interruption to lifecycle checks if one process fails.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Nodes and the node controller](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes cloud-provider v0.36.0 node lifecycle controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller.go)
- [Kubernetes cloud-provider v0.36.0 provider interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes cloud-provider v0.36.0 well-known taints](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/api/well_known_taints.go)
- [Kubernetes cloud-provider v0.36.0 lifecycle controller startup](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)

## Conclusion

The CCM can delete a Kubernetes Node object, but only as provider-backed cleanup in the standard lifecycle path: the Node is not ready and the provider reports the instance absent through a recognized absence result. It does not terminate the VM. Connectivity, authorization, and other operational provider errors do not count as absence; the legacy `InstanceNotFound` result described above does. Separate heartbeat health from cloud existence, verify the provider-ID mapping, and correlate Kubernetes and cloud audit evidence before changing lifecycle behavior.
