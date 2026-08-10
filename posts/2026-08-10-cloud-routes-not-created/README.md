# Why Cloud Routes Are Not Created: `--configure-cloud-routes`, Pod CIDRs, and Provider Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Cloud Routes, Pod CIDR, Networking, Troubleshooting

Description: Diagnose missing Kubernetes cloud routes by tracing controller startup, Node Pod CIDRs, provider interfaces, permissions, and route reconciliation.

---

The Kubernetes cloud route controller does not discover an arbitrary network path for Pods. It reconciles a specific contract: for each Node with `.spec.podCIDRs`, ensure that a cloud provider implementing the Kubernetes `Routes` interface has a managed route that sends those CIDRs to that Node.

When routes are missing, debug that contract in order. A working CCM Pod is not enough, and setting `--configure-cloud-routes=true` cannot compensate for missing Pod CIDRs, an unsupported provider, the wrong CNI network model, or denied cloud API calls.

## First Decide Whether the CCM Should Own Routes

The standard route controller fits a network design where provider route tables carry Node Pod CIDRs. Many clusters use something else:

- an overlay CNI encapsulates Pod traffic;
- a CNI advertises routes through BGP;
- a provider-native CNI assigns directly routable addresses;
- a separate network controller owns route tables; or
- the provider CCM deliberately does not implement `Routes`.

In those designs, cloud routes may be intentionally absent and `--configure-cloud-routes=false` may be correct. Enabling two route owners can cause churn or delete infrastructure one controller does not understand. Confirm the provider and CNI architecture before changing flags.

## Understand the Reconciliation Inputs

The route pipeline has several independent stages:

```text
cluster Pod CIDR policy
        ↓
Node receives .spec.podCIDR / .spec.podCIDRs
        ↓
CCM route controller lists Nodes and provider routes
        ↓
provider Routes implementation creates/deletes routes
        ↓
Node NetworkUnavailable condition is updated for reconciled route actions
```

Kubernetes' shared controller-manager configuration describes `allocateNodeCIDRs` as enabling Pod CIDR allocation and `configureCloudRoutes` as configuring allocated CIDRs on the provider. In the current upstream cloud-provider route implementation, reconciliation itself reads `.spec.podCIDRs`; it skips a Node whose list is empty.

That makes the Node object the fastest dividing line:

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,PROVIDER_ID:.spec.providerID,POD_CIDR:.spec.podCIDR,POD_CIDRS:.spec.podCIDRs,ADDRESSES:.status.addresses'
```

If `.spec.podCIDRs` is empty, fix the cluster's Node CIDR allocation or the CNI/provider mechanism that supplies it. If the CIDR is present but no provider route exists, continue into CCM startup, provider support, and cloud API diagnostics.

## Check `--configure-cloud-routes`

In the upstream v0.36 cloud-provider library, controller startup checks `ConfigureCloudRoutes` first. When it is false, the log says that cloud provider routes will not be configured and the route controller does not start.

Inspect the installed workload rather than an example on disk:

```bash
kubectl get deployment,daemonset -n kube-system -o yaml | grep -n -E 'cloud-controller-manager|configure-cloud-routes|allocate-node-cidrs|cluster-cidr|cluster-name'
kubectl get pods -n kube-system -o wide | grep cloud-controller-manager
```

Provider images and charts can choose different defaults or configuration files. Record the actual process arguments from the live Pod. Also inspect `--controllers`: a provider can disable the route controller even while `--configure-cloud-routes` is true.

Do not toggle the flag until ownership is established. If cloud routes are expected, make the setting explicit in the provider-supported manifest so an upgrade does not silently inherit a changed chart default.

## Verify Pod CIDR Allocation and Cluster CIDR

`--allocate-node-cidrs`, `--cluster-cidr`, and `--configure-cloud-routes` describe related but distinct work. At minimum, a route-based cluster needs:

- a cluster CIDR that represents the Pod address space;
- a unique per-Node Pod CIDR inside that range; and
- a route controller configured with a compatible cluster CIDR.

Check uniqueness and containment, including both families in a dual-stack cluster:

```bash
kubectl get nodes -o json | jq -r '.items[] | [.metadata.name, (.spec.podCIDRs // [])[]] | @tsv'
```

Common failures include a missing `--cluster-cidr`, a value that differs between controller components, overlapping per-Node CIDRs, exhausted allocation space, and a single-stack provider route implementation receiving dual-stack Node CIDRs.

The CCM route loop cannot allocate a CIDR retroactively merely because route programming is enabled. Its current implementation skips Nodes without `.spec.podCIDRs`, then derives desired routes from the values that exist.

## Confirm the Provider Implements `Routes`

Kubernetes defines `cloudprovider.Interface.Routes()` to return both a `Routes` implementation and a Boolean indicating support. The interface must provide `ListRoutes`, `CreateRoute`, and `DeleteRoute`.

If `--configure-cloud-routes=true` but the provider returns unsupported, upstream CCM logs this warning and does not start the controller:

```text
--configure-cloud-routes is set, but cloud provider does not support routes. Will not configure cloud provider routes.
```

This is not fixed with broader IAM. It means the installed provider integration has not offered that controller contract. Read the exact provider release documentation for the chosen networking mode and CCM version.

Also verify that the provider binary actually started its expected controller set. In cloud-provider v0.36.0, the canonical controller name is `node-route-controller`, and `route` remains a backward-compatible alias. Downstream provider binaries can register different controller sets, so prefer the provider manifest's documented name over guessing.

## Inspect Events, Conditions, and Logs

The upstream controller records a `FailedToCreateRoute` warning Event against the Node when `CreateRoute` fails. For Nodes it reconciles, having no unresolved create or update action sets `NetworkUnavailable=False` with reason `RouteCreated`; an unresolved create or update action sets `NetworkUnavailable=True` with reason `NoRouteCreated`. A `ListRoutes` failure returns before any condition update, and `DeleteRoute` failures are only logged, so this condition is not a complete signal for every reconciliation failure.

```bash
kubectl describe node <node-name>
kubectl get events --all-namespaces --field-selector involvedObject.kind=Node --sort-by=.lastTimestamp
kubectl logs -n kube-system <ccm-pod> --since=30m | grep -E 'route|Route|CIDR'
```

Look for failures while listing routes as well as creating them. A controller that cannot list its managed routes cannot safely determine which entries to retain or delete.

Useful error categories include:

- provider authentication or token refresh failure;
- denied list/create/delete-route permissions;
- route table, project, VPC, region, or network not found;
- route quota or per-table entry limit reached;
- target instance missing or `.spec.providerID` malformed;
- a Node address not usable by the provider implementation;
- CIDR overlap with an existing route;
- cluster identity or tag filters selecting the wrong route set; and
- provider API throttling or transient timeouts.

Confirm these in cloud audit logs. The Kubernetes Event is the controller's view; the provider audit record proves which API operation and identity were used.

## Check Cluster Identity and Stale Routes

The route interface receives a `clusterName`, and provider implementations use their own tags, names, projects, or route-table selectors to scope resources. A mismatched cluster name or missing ownership tag can make an existing route invisible to `ListRoutes`, or make the controller operate on an unexpected table.

Compare three sets explicitly:

1. desired Node Pod CIDRs from the Kubernetes API;
2. routes returned as managed for this cluster; and
3. all relevant entries visible in the provider console or API.

Do not manually delete every “extra” route without understanding the ownership filter. The route controller only considers routes returned by `ListRoutes(clusterName)`, and it deletes blackhole routes or routes that no longer correspond to Nodes and their Pod CIDRs only when their destinations are in its configured cluster CIDR scope; returned routes outside that scope are ignored.

## Reconciliation Timing in Kubernetes v1.36

The standard controller traditionally reconciles at `--route-reconciliation-period`. Kubernetes v1.35 added the alpha `CloudControllerManagerWatchBasedRoutesReconciliation` feature gate, disabled by default. When enabled, Node addition, deletion, `.spec.podCIDRs` changes, and `.status.addresses` changes enqueue a cluster route reconciliation; an informer resync randomized between `--min-resync-period` and twice that value (12 to 24 hours by default) provides cleanup.

Kubernetes v1.36 adds the alpha counter `route_controller_route_sync_total`, which increments at the start of each route synchronization attempt. It can help distinguish “the loop never starts” from “the loop runs but provider operations fail.” With the watch-based gate disabled, a stable cluster's counter should rise on the fixed interval. With it enabled, the counter is event-driven and can remain unchanged while Nodes are stable.

Treat a rising counter as evidence of attempts, not success. Pair it with warning Events, Node conditions, and provider API metrics.

## A Reliable Troubleshooting Sequence

Use this order to avoid changing several network layers at once:

1. Confirm the CNI/provider design actually expects CCM-managed cloud routes.
2. Confirm every affected Node has the intended, non-overlapping `.spec.podCIDRs`.
3. Inspect the live CCM arguments and enabled controllers.
4. Verify the provider reports `Routes` support for this mode and version.
5. Compare cluster CIDR, address family, cluster identity, region, and route-table selection.
6. Read Node `NetworkUnavailable` conditions and `FailedToCreateRoute` Events.
7. Match CCM errors with provider audit logs, permissions, quota, and rate limits.
8. After fixing the cause, observe reconciliation before manually creating routes.

Manually inserting one route can confirm a provider network hypothesis, but it is not a durable repair. The controller may later replace or delete it, and the next Node will reproduce the failure.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: kube-controller-manager configuration API](https://kubernetes.io/docs/reference/config-api/kube-controller-manager-config.v1alpha1/)
- [Kubernetes v1.35: Watch Based Route Reconciliation in CCM](https://kubernetes.io/blog/2025/12/30/kubernetes-v1-35-watch-based-route-reconciliation-in-ccm/)
- [Kubernetes v1.36: New Metric for Route Sync in CCM](https://kubernetes.io/blog/2026/05/15/ccm-new-metric-route-sync-total/)
- [Kubernetes cloud-provider v0.36.0 route controller startup source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)
- [Kubernetes cloud-provider v0.36.0 route reconciliation source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/route/route_controller.go)
- [Kubernetes cloud-provider v0.36.0 provider interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)

## Conclusion

Missing cloud routes are usually a broken link in a short chain: the wrong network owner, no Node Pod CIDR, a disabled route controller, no provider `Routes` support, incompatible CIDRs, or a rejected provider API call. Begin with `.spec.podCIDRs`, prove that the live CCM started the route loop, then follow its provider identity and target route table. That turns a vague cross-node networking failure into one observable reconciliation boundary.
