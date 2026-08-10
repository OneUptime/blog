# Can cloud-controller-manager Delete a Kubernetes Node? Understanding Cloud Node Lifecycle Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Node Lifecycle, Cloud Provider, Node Deletion, Troubleshooting

Description: Learn when cloud-controller-manager deletes a Kubernetes Node object, how provider existence checks differ from health monitoring, and how to investigate safely.

---

Yes. A cloud-controller-manager (CCM) built with Kubernetes' cloud node lifecycle controller can delete a Kubernetes `Node` object after the Node is not ready and the cloud provider reports that its backing instance no longer exists.

It does not use this path to delete the virtual machine. The direction is the opposite: it observes that the provider instance is already gone, then removes the stale representation from the Kubernetes API. That distinction is essential when reading an audit event that says the CCM deleted a Node.

## The Decision in the Current Upstream Controller

The Kubernetes cloud-provider v0.36.0 implementation periodically lists Nodes and evaluates each one:

```text
Node Ready == True
  └─ do not perform an instance-existence check in this loop
     remove the provider shutdown taint if present

Node Ready != True (False or Unknown, including no Ready condition)
  └─ ask the provider whether the instance exists
       ├─ provider error: log it and leave the Node alone
       ├─ instance absent: delete the Kubernetes Node object
       └─ instance exists: ask whether it is shut down
            └─ if shut down, add a NoSchedule shutdown taint
```

The default shared configuration sets the cloud node monitor period to five seconds, although provider distributions can change it. Provider API latency, informer timing, retries, and leader availability mean this is not a promise that deletion completes within five seconds.

## Health and Existence Are Different Questions

Kubernetes has cloud-independent Node health management as well as provider-backed lifecycle checks.

The core node lifecycle logic observes kubelet heartbeats and Node status. When heartbeats stop, it can set `Ready=Unknown`, add `node.kubernetes.io/unreachable` or `node.kubernetes.io/not-ready` taints, and eventually initiate Pod eviction according to cluster settings. It does not need to know whether the machine still exists.

The CCM adds a separate fact available only from the infrastructure API: is the server identified by this Node still present? If the answer is authoritatively no, the cloud lifecycle controller deletes the API object. The Kubernetes Node documentation summarizes the same behavior: for an unhealthy Node in a cloud environment, the node controller asks the cloud provider whether the VM is still available and deletes the Node if it is not.

Therefore:

- `NotReady` alone does not mean the CCM should delete the Node;
- an existing but unreachable VM may remain represented while normal health handling proceeds;
- a powered-off instance can be tainted rather than deleted if the provider reports that state; and
- a deleted VM can leave a stale Node when the CCM, provider API, or lifecycle controller is unavailable.

## What the Provider Must Implement

The standard controller requires an instance interface. External providers normally implement `InstancesV2`, whose relevant methods are:

```go
InstanceExists(ctx context.Context, node *v1.Node) (bool, error)
InstanceShutdown(ctx context.Context, node *v1.Node) (bool, error)
```

Older implementations can use the original `Instances` interface and provider-ID-based methods. If neither interface is supported, the upstream cloud node lifecycle controller does not start successfully.

This makes deletion provider-dependent. The provider decides how `.spec.providerID`, Node name, tags, project, region, or other attributes map to an instance and what “exists” means. Some implementations split cloud node initialization and lifecycle into separate controllers, and a provider can choose which controllers its manifest enables.

## Provider ID Is a Safety-Critical Join Key

A Node's `.spec.providerID` is intended to uniquely identify the backing infrastructure instance. Inspect it before assuming that the Node name is sufficient:

```bash
kubectl get node <node-name> -o jsonpath='{.spec.providerID}{"\n"}'
kubectl get node <node-name> -o jsonpath='{.status.conditions}{"\n"}'
kubectl get node <node-name> -o jsonpath='{.metadata.uid}{"\n"}'
```

An empty, malformed, recycled, or wrong provider ID can prevent existence checks or make provider lookup dangerous, depending on implementation. The upstream controller attempts to obtain a provider ID when the field is empty, but the provider still owns the mapping semantics.

Use stable provider IDs and make Node names unique across the lifetime of the cluster. If infrastructure automation quickly replaces a server while reusing a Node name, compare the Node UID and provider ID before attributing events to the replacement.

## Deletion and Shutdown Produce Different Effects

When `InstanceExists` returns false without an error for a non-ready Node, the upstream controller emits a normal Event with reason `DeletingNode`, then calls the Kubernetes Node delete API. If that API call fails, it emits a warning Event with reason `DeletingNodeFailed`.

When the instance exists but `InstanceShutdown` returns true, the controller adds:

```text
node.cloudprovider.kubernetes.io/shutdown:NoSchedule
```

That taint prevents new scheduling but does not delete the Node. If the Node later becomes `Ready=True`, the lifecycle loop removes the shutdown taint. Providers that return `NotImplemented` for the legacy shutdown check are treated as not reporting shutdown through that method.

Deletion of the Node object then interacts with other Kubernetes controllers and garbage collection. It is not a graceful drain of the machine and should not be used as a substitute for planned maintenance. Drain workloads before intentionally terminating a Node whenever the failure model permits.

## Why a Deleted VM Can Leave a Node Behind

If the infrastructure instance is gone but the Node object persists, check each prerequisite:

1. Has the Node actually become `Ready=False` or `Ready=Unknown`? The upstream lifecycle loop skips existence checks while it is `Ready=True`.
2. Is a CCM replica healthy, able to reach the API server, and holding the leader Lease?
3. Is the provider's cloud node lifecycle controller enabled and implemented?
4. Does `.spec.providerID` identify the deleted instance in the expected project, account, and region?
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

Provider labels and Lease names vary. Also inspect cloud audit records for the exact lookup and response. A connectivity timeout or permission denial is not an “instance absent” answer; the upstream controller logs the error and continues without deleting the Node.

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
- Treat provider ID population as a readiness signal for cloud initialization.
- Test scale-down and instance replacement in a non-production cluster after CCM upgrades.
- Drain before planned termination; the absence-check path is failure cleanup, not maintenance orchestration.
- Preserve API and cloud audit records long enough to correlate a Node UID with its infrastructure instance.
- Run replicated CCM candidates with leader election so a single process failure does not pause lifecycle checks.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Nodes and the node controller](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes cloud-provider v0.36.0 node lifecycle controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller.go)
- [Kubernetes cloud-provider v0.36.0 provider interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes cloud-provider v0.36.0 well-known taints](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/api/well_known_taints.go)
- [Kubernetes cloud-provider v0.36.0 lifecycle controller startup](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)

## Conclusion

The CCM can delete a Kubernetes Node object, but only as provider-backed cleanup in the standard lifecycle path: the Node is not ready, the provider lookup succeeds, and the instance is reported absent. It does not terminate the VM, and provider errors do not count as absence. Separate heartbeat health from cloud existence, verify the provider-ID mapping, and correlate Kubernetes and cloud audit evidence before changing lifecycle behavior.
