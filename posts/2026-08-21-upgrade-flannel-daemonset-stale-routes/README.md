# Upgrade Flannel Without Leaving Stale Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, DaemonSet, Upgrade, Route, Node Drain

Description: Upgrade the Flannel DaemonSet one node at a time, verify host CNI artifacts and routes, and avoid combining a safe binary upgrade with a disruptive backend migration.

---

## Introduction

Flannel runs a control plane in each DaemonSet pod while most non-UDP backends use a kernel data path. Flannel documents that these daemons can usually restart during an upgrade without interrupting established flows. Its running guide still advises completing VXLAN restarts within a few seconds, although current VXLAN releases install permanent neighbor and FDB entries; keep the interval short when upgrading older or customized deployments. The UDP backend is different because its userspace daemon participates in the data path.

This guide assumes Flannel uses the Kubernetes subnet manager (`--kube-subnet-mgr`), as the upstream Kubernetes manifest does. For etcd-backed deployments, validate subnet ownership against the current Flannel leases in etcd instead of Kubernetes Node objects and annotations.

A safe upgrade keeps the cluster Pod network and data-plane configuration—including the backend, VNI and port, interface and public-IP selection, MTU, and node CIDRs—unchanged, rolls one node at a time, and verifies peer routes against current Kubernetes Node objects and Flannel annotations. Treat changes to any of those settings as separate network work, not part of a routine image update.

## Freeze the Upgrade Scope

Record the current deployment and configuration:

```bash
umask 077

kubectl -n kube-flannel get daemonset kube-flannel-ds -o yaml \
  > /var/tmp/kube-flannel-ds-before-upgrade.yaml
kubectl -n kube-flannel get configmap kube-flannel-cfg -o yaml \
  > /var/tmp/kube-flannel-cfg-before-upgrade.yaml

kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{range .spec.template.spec.initContainers[*]}{.name}{"\t"}{.image}{"\n"}{end}{range .spec.template.spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'

kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo
```

The snapshots are operational artifacts and may expose topology. Protect and remove them under the cluster's retention procedure.

Read every release note between the installed and target Flannel versions, including the separate release notes for any `flannel-cni-plugin` version change. Inspect changes to:

- `flanneld` image and arguments.
- Flannel CNI plugin image and executable.
- CNI configuration install behavior.
- RBAC, capabilities, Pod Security labels, hostPaths, and health probes.
- Backend fields, supported kernels, and architecture images.

Download a version-pinned release manifest and compare it locally:

```bash
kubectl diff -f kube-flannel-target.yml
```

Do not apply `releases/latest` directly during a production change.

## Verify Capacity and Pod Disruption Budgets

```bash
kubectl get nodes
kubectl get poddisruptionbudgets --all-namespaces
kubectl -n kube-flannel get pods -l app=flannel -o wide
```

Ensure workloads can move off one node and that control-plane access does not depend on a single path through that node. Pre-pull or mirror every target image for every node architecture so an image registry delay does not unnecessarily extend the per-node maintenance window.

The current upstream manifest has two relevant image families: `flannel` and `flannel-cni-plugin`. Updating only the main container can leave an old host CNI binary.

## Record a Route Baseline

On each canary node, these commands assume Linux with IPv4 VXLAN and the default VNI 1:

```bash
ip -d link show flannel.1
ip -4 route show table main
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
sudo cat /run/flannel/subnet.env
sudo sha256sum /opt/cni/bin/flannel
```

For a custom VXLAN VNI, use `flannel.<VNI>`; for current dual-stack VXLAN, also inspect IPv6 routes and the `flannel-v6.<VNI>` device. For `host-gw`, expect direct remote-subnet routes and no VXLAN device. For WireGuard and other backends, use their documented interfaces. Save the mapping of remote Pod CIDRs to current Kubernetes Nodes:

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs'
```

That is the authoritative set against which to judge “stale” routes.

## Use OnDelete for a Manually Gated Rollout

A normal DaemonSet `RollingUpdate` is suitable for many clusters and supports `maxUnavailable`, but it chooses the rollout sequence. For an upgrade that must be paired with drain and per-node validation, use `OnDelete` in the managed target manifest:

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

Set `OnDelete` before changing the pod template, and ensure the target manifest retains it. Applying the new manifest then updates the template without automatically replacing existing pods. `OnDelete` gates only DaemonSet pod replacement; ConfigMaps, RBAC, Namespace metadata, and other objects in the applied manifest update immediately. Confirm:

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{.spec.updateStrategy.type}{"\n"}'
kubectl -n kube-flannel get pods -l app=flannel \
  -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,IMAGE:.spec.containers[0].image'
```

If automatic rolling updates are preferred, set a conservative `maxUnavailable`, watch the rollout continuously, and retain enough healthy nodes for the workloads. Do not run two independent rollout mechanisms at once.

## Upgrade One Drained Node

```bash
NODE=worker-1

kubectl cordon "$NODE"
kubectl drain "$NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

Review local-storage consequences and PodDisruptionBudgets before accepting drain options. Continue only if `kubectl drain` exits successfully; a timeout or rejected eviction can leave the node partially drained. `kubectl drain --ignore-daemonsets` deliberately leaves the Flannel pod running; that preserves networking while workload CNI DEL operations complete.

Select and delete only that node's Flannel pod:

```bash
OLD_FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel delete pod "$OLD_FLANNEL_POD"

kubectl -n kube-flannel wait --for=create pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s

kubectl -n kube-flannel wait --for=condition=Ready pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s
```

Treat `Ready` only as a container-start gate unless the reviewed target manifest defines Flannel's `/readyz` readiness probe. The host-state and traffic checks below are the network-readiness gates.

Under `OnDelete`, the replacement uses the new pod template. Verify its exact images and all init-container results:

```bash
NEW_FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel describe pod "$NEW_FLANNEL_POD"
kubectl -n kube-flannel logs "$NEW_FLANNEL_POD" -c install-cni-plugin
kubectl -n kube-flannel logs "$NEW_FLANNEL_POD" -c install-cni
kubectl -n kube-flannel logs "$NEW_FLANNEL_POD" -c kube-flannel --tail=300
```

## Verify Host State Before Uncordoning

On the upgraded node, repeat the backend-appropriate baseline checks. For the default IPv4 VXLAN configuration:

```bash
sudo cat /run/flannel/subnet.env
sudo sha256sum /opt/cni/bin/flannel
sudo sed -n '1,220p' /etc/cni/net.d/10-flannel.conflist

ip -d link show flannel.1
ip -4 route show table main
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
```

Draining removes ordinary pod sandboxes but does not remove the Flannel DaemonSet or its remote-subnet routes. Those routes are expected while the node remains a cluster member. A truly stale route targets a Pod CIDR no longer owned by any current Node or, for a direct route, uses an obsolete next hop. With VXLAN, an obsolete underlay peer address appears in the matching FDB entry.

Do not flush route tables, delete `flannel.1`, or clear the whole FDB after a normal upgrade. A restarted daemon installs or replaces entries for current leases, but it removes VXLAN neighbor, FDB, and route entries only when it observes a lease-removal event; startup does not necessarily discover a deletion missed while it was down. Preserve logs and compare the route to Node CIDRs and Flannel annotations before cleanup.

Create a test pod on the node before returning general workloads. Because the node is cordoned, bind the test Pod explicitly with `spec.nodeName` or use another narrowly scoped method that can target an unschedulable node. Keep the node cordoned until these checks pass:

- New CNI ADD succeeds and assigns an IP in the unchanged Node CIDR.
- Same-node and cross-node Pod IP traffic works.
- Large packets respect the expected MTU.
- ClusterIP access works through kube-proxy or its replacement.
- Pod egress has the intended source NAT behavior.

Then:

```bash
kubectl uncordon "$NODE"
```

Repeat one node at a time.

## Handle Stale Peer Routes Correctly

If a node is only drained for maintenance, keep its Node object and subnet ownership. If it is permanently decommissioned, stop workloads and Flannel, remove it through the cluster's node-decommission process, and verify peers observe the Node deletion and withdraw the route.

An apparently stale route to an old node usually indicates one of these:

- The Kubernetes Node object still exists.
- Flannel cannot watch the API or its event queue/cache did not synchronize.
- Flannel was stopped when the Node was deleted and did not observe the removal event.
- A stale Flannel public-IP annotation points to an old address.
- NetworkManager or a host script installed a static copy of a Flannel route.
- The upgrade also changed backend or Pod CIDR, which requires migration cleanup.

Fix the owning state when it still exists. If no owner remains and Flannel missed the removal event, preserve the evidence and delete only the confirmed orphaned route and its matching neighbor or FDB entries. Broad cleanup hides the cause and can disrupt valid peers. Never run `ip route flush table main`.

## Roll Back Without Mixing Versions Indefinitely

With `OnDelete`, keep `OnDelete`, restore the previous reviewed DaemonSet pod template and any ConfigMap or other manifest resources changed by the target, and delete only the failed node's Flannel pod again. Verify that its init containers restore the matching CNI executable and conflist. Once that rollback passes, roll back every previously upgraded node one at a time; `OnDelete` does not replace those pods automatically. With `RollingUpdate`, a DaemonSet revision can be inspected and rolled back using Kubernetes' supported rollout commands, but the revision restores only the pod template, so restore separate version-coupled resources independently.

Pause on the first failed node. Do not continue a heterogeneous rollout until the target or rollback passes direct Pod IP tests.

After every node is upgraded and validated, decide whether to keep `OnDelete` for future gated maintenance or restore a reviewed `RollingUpdate` policy.

## Official Documentation

- [Flannel release notes](https://github.com/flannel-io/flannel/releases)
- [Flannel CNI plugin release notes](https://github.com/flannel-io/cni-plugin/releases)
- [Flannel restart behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/running.md#zero-downtime-restarts)
- [Flannel backend reference and runtime-change warning](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel VXLAN implementation](https://github.com/flannel-io/flannel/blob/master/pkg/backend/vxlan/vxlan.go)
- [Kubernetes: Perform a rolling update on a DaemonSet](https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes DaemonSet concepts](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes Node API](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes: `kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)

## Conclusion

Upgrade Flannel as a pinned DaemonSet and CNI pair while keeping its data-plane configuration constant. A manually gated `OnDelete` rollout lets you drain, replace, inspect, test, and uncordon one node at a time. Treat remote-subnet routes as expected while nodes remain members, repair stale lease or annotation ownership when it exists, and remove only proved orphans instead of flushing kernel state.
