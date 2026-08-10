# What Happens When cloud-controller-manager Goes Down?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, High Availability, Cloud Provider, Networking, Troubleshooting

Description: Understand which Kubernetes operations stop during a cloud-controller-manager outage, which data planes keep running, and how to recover safely.

---

When `cloud-controller-manager` (CCM) goes down, Kubernetes does not stop all at once. The API server, scheduler, kubelets, workload controllers, and existing network data paths are separate components. What stops is reconciliation that needs the cloud provider API: initializing new Nodes with cloud metadata, checking whether unhealthy Nodes still have backing instances, programming provider routes where that model is used, and managing provider load balancers for Services.

That distinction explains the usual incident pattern: existing workloads may continue serving traffic while new infrastructure and cloud-facing changes stall.

## The Short Version

| Area | During a complete CCM outage |
| --- | --- |
| Existing Pods | Usually continue running; the CCM is not their runtime |
| Deployments and Jobs | Core Kubernetes controllers can still reconcile them, subject to available capacity and networking |
| New cloud Nodes | Register but commonly remain tainted and unschedulable because cloud initialization cannot finish |
| Existing cloud routes | Usually remain in the provider, but the CCM cannot create, update, or remove managed routes |
| New Node Pod CIDR routes | Not programmed by the CCM, so cross-node Pod traffic can fail in route-based clusters |
| Existing load balancers | Usually keep forwarding in the provider data plane, but backend or configuration changes are not reconciled |
| New or changed `LoadBalancer` Services | Stay pending or stale until a service controller can call the provider API |
| Cloud-deleted instances | Their Kubernetes Node objects are not removed by the cloud node lifecycle controller |

“Usually” matters. A provider can package extra controllers, and a CNI or specialized load-balancer controller may own work that the standard CCM would otherwise perform. Check the provider's supported controller set before declaring the blast radius.

## Existing Workloads Do Not Depend on Every CCM Loop

The CCM is a set of control loops, not the Pod data plane. A running container is supervised by the kubelet and container runtime. Service forwarding is handled by kube-proxy or another data-plane implementation. Deployment, ReplicaSet, Job, EndpointSlice, and many other cloud-independent loops live elsewhere in the control plane.

Consequently, stopping the CCM does not itself terminate running Pods or erase already-created provider resources. Existing routes and load balancers normally remain because an unavailable controller cannot ask the provider to delete them. This can make the cluster look healthy until a Node is replaced, a Service changes, or a load balancer must add a new backend.

Do not turn that observation into a guarantee. A provider resource can fail independently, health checks may remove backends, credentials can expire in another component, and an autoscaling event can expose the missing reconciliation.

## New Nodes Commonly Stop at Cloud Initialization

With an external CCM, the kubelet and `kube-controller-manager` are configured for an external cloud provider. A registering kubelet adds this taint:

```text
node.cloudprovider.kubernetes.io/uninitialized=true:NoSchedule
```

The CCM's cloud node controller looks up the backing instance, populates available fields such as `.spec.providerID` and zone and region labels, removes the initialization taint as part of that Node update, and then separately updates any cloud-reported `.status.addresses`. Exactly which fields it populates depends on the provider interfaces and returned metadata. Kubernetes documentation explicitly notes that if the CCM is unavailable, new Nodes remain unschedulable.

Inspect the boundary directly:

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status,PROVIDER_ID:.spec.providerID,TAINTS:.spec.taints'
kubectl describe node <new-node>
```

A Node can be `Ready` from the kubelet's perspective yet still be unschedulable because cloud initialization has not completed. Removing the taint by hand bypasses the safety mechanism; it does not invent the missing provider ID, addresses, or topology labels.

## Cloud Routes Stop Reconciling

The standard CCM route controller iterates over each Node's `.spec.podCIDRs` and asks a provider that implements the Kubernetes `Routes` interface to create an infrastructure route for each CIDR. It also deletes provider-returned managed routes whose destinations fall within its configured cluster CIDR or CIDRs when they are blackholes or no longer match current Node and Pod CIDR state.

During an outage, routes already stored by the provider generally remain. However:

- a newly added Node can have a Pod CIDR but no provider route;
- for providers that opt into address-aware routes, a changed Node address cannot be reconciled; the controller normally handles that change by deleting and recreating the route;
- routes for deleted Nodes can remain; and
- the Node's `NetworkUnavailable` condition can remain stale because the route controller is unavailable to patch it based on route reconciliation.

The symptom is often asymmetric. Pods on the same Node communicate, while traffic to the new Node's Pod CIDR fails. Clusters whose CNI uses an overlay, BGP, or its own provider integration may not use the CCM route controller at all, so prove controller ownership before treating every Pod-network failure as a CCM outage.

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,POD_CIDRS:.spec.podCIDRs,NETWORK_UNAVAILABLE:.status.conditions[?(@.type=="NetworkUnavailable")].status'
```

Compare those CIDRs with provider route tables and the CCM's last successful reconciliation logs.

## Load Balancer Changes Stop Converging

The CCM service controller watches Services and calls the provider load-balancer interface. It creates or updates provider infrastructure and writes the result to `.status.loadBalancer`.

If every CCM replica is unavailable, an existing provider load balancer commonly continues forwarding with its last configuration. The control-plane gap appears when desired state changes:

- a new `type: LoadBalancer` Service can remain with a pending external address;
- new Nodes might not be registered as backends;
- changed ports, annotations, `.spec.externalTrafficPolicy`, or `.spec.loadBalancerSourceRanges` may remain unapplied; and
- deleting a Service may leave provider infrastructure until reconciliation resumes.

Inspect the Kubernetes side without assuming that a populated status is current:

```bash
kubectl describe service -n <namespace> <service>
kubectl get service -n <namespace> <service> -o yaml
kubectl get endpointslice -n <namespace> -l kubernetes.io/service-name=<service>
```

Then compare the provider's actual listeners, targets, and health checks. If `spec.loadBalancerClass` or provider documentation delegates the Service to another controller, inspect that controller instead.

## Node Health Monitoring Partly Continues

Two mechanisms are easy to confuse. Kubernetes' cloud-independent node lifecycle logic observes Node status and heartbeats, marks an unreachable Node's `Ready` condition `Unknown`, adds health-related taints, and can initiate Pod eviction. That logic does not need the cloud API.

The CCM's cloud node lifecycle controller performs an additional check for a non-ready Node: does its backing instance still exist? If the provider says it does not, the controller can delete the Kubernetes Node object. It can also apply a shutdown taint when an instance exists but is powered off. Those provider-backed checks stop when the CCM is down.

The result can be a lingering `NotReady` Node after its VM was deleted. Pod movement may still occur through normal node-health behavior, but provider-confirmed Node-object cleanup waits for the cloud lifecycle controller.

## High Availability Changes the Duration, Not the Semantics

Upstream CCM leader election is enabled by default. Multiple replicas compete for a Kubernetes Lease; one leader starts the controller loops and the others wait. If only the leader fails and a healthy standby can reach the API server, another replica takes leadership after the election timing permits. If all replicas are unschedulable, crash-looping, partitioned from the API server, or unable to renew the Lease, reconciliation stops.

Check both replica health and the active Lease:

```bash
kubectl get pods -n kube-system -l component=cloud-controller-manager -o wide
kubectl get lease -n kube-system cloud-controller-manager -o yaml
kubectl get events -n kube-system --sort-by=.lastTimestamp
```

Provider manifests use different labels and sometimes a different Lease name, so adjust selectors to the installed integration.

## Recovery and Backlog Safety

After a leader is healthy again, controllers compare current Kubernetes objects with current provider state and reconcile the difference. Recovery is not necessarily instantaneous: a long outage can create a backlog, cloud APIs can throttle bursts, and provider operations can take time.

Use this sequence:

1. Restore at least one correctly configured replica; preserve logs from the failed leader first.
2. Confirm it acquires leadership and starts the expected node, lifecycle, route, and service controllers.
3. Watch new Nodes lose only the `uninitialized` taint, and independently confirm the provider fields expected from the installed integration.
4. Compare Node Pod CIDRs with provider routes if the cluster uses cloud routes.
5. Compare `LoadBalancer` Service status with actual provider resources and backends.
6. Watch warning Events, provider API rate limits, and authentication errors until the queue drains.

Avoid manually deleting or recreating all cloud resources at once. That can race the recovering controller and obscure which desired-state edge is still failing.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Nodes and the node controller](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes cloud-provider v0.36.0 controller startup source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)
- [Kubernetes cloud-provider v0.36.0 route controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/route/route_controller.go)
- [Kubernetes cloud-provider v0.36.0 cloud node lifecycle source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller.go)

## Conclusion

A CCM outage is a cloud-integration control-plane outage, not an immediate shutdown of Kubernetes. Existing Pods and provider data planes often keep working, while new Nodes remain uninitialized, route changes stop, load-balancer desired state becomes stale, and cloud-confirmed Node deletion pauses. Diagnose each controller boundary separately, restore leader election and provider access, and let reconciliation converge while watching for throttling and stale infrastructure.
