# Upgrade Flannel Without Leaving Stale Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, DaemonSet, Upgrade, Route, Node Drain

Description: Upgrade the Flannel DaemonSet one node at a time, verify host CNI artifacts and routes, and avoid combining a safe binary upgrade with a disruptive backend migration.

---

## Introduction

Flannel runs a control plane in each DaemonSet pod while most non-UDP backends use a kernel data path. Flannel documents that these daemons can usually restart during an upgrade without interrupting established flows, but VXLAN peer entries can age if a restart lasts too long. The UDP backend is different because its userspace daemon participates in the data path.

A safe upgrade keeps the cluster Pod network and backend unchanged, rolls one node at a time, and verifies that Flannel reconciles routes from current Node leases. Changing `Network`, switching VXLAN to `host-gw`, or altering node CIDRs is a network migration, not a routine image update.

## Freeze the Upgrade Scope

Record the current deployment and configuration:

```bash
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

Read every release note between the installed and target Flannel versions. Inspect changes to:

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

Ensure workloads can move off one node and that control-plane access does not depend on a single path through that node. Pre-pull or mirror every target image on all architectures so an image registry delay does not outlast VXLAN neighbor state.

The current upstream manifest has two relevant image families: `flannel` and `flannel-cni-plugin`. Updating only the main container can leave an old host CNI binary.

## Record a Route Baseline

On each canary node:

```bash
ip -d link show flannel.1
ip -4 route show table main
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
sudo cat /run/flannel/subnet.env
sudo sha256sum /opt/cni/bin/flannel
```

For `host-gw`, expect direct remote-subnet routes and no `flannel.1`. For WireGuard and other backends, use their documented interfaces. Save the mapping of remote Pod CIDRs to current Kubernetes Nodes:

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR'
```

That is the authoritative set against which to judge “stale” routes.

## Use OnDelete for a Manually Gated Rollout

A normal DaemonSet `RollingUpdate` is suitable for many clusters and supports `maxUnavailable`, but it chooses the rollout sequence. For an upgrade that must be paired with drain and per-node validation, use `OnDelete` in the managed target manifest:

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

Set `OnDelete` before changing the pod template, and ensure the target manifest retains it. Applying the new manifest then updates the template without automatically replacing existing pods. Confirm:

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds -o yaml \
  | sed -n '/updateStrategy:/,/template:/p'
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

Review local-storage consequences and PodDisruptionBudgets before accepting drain options. `kubectl drain --ignore-daemonsets` deliberately leaves the Flannel pod running; that preserves networking while workload CNI DEL operations complete.

Select and delete only that node's Flannel pod:

```bash
OLD_FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel delete pod "$OLD_FLANNEL_POD"

kubectl -n kube-flannel wait --for=condition=Ready pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s
```

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

On the upgraded node:

```bash
sudo cat /run/flannel/subnet.env
sudo sha256sum /opt/cni/bin/flannel
sudo sed -n '1,220p' /etc/cni/net.d/10-flannel.conflist

ip -d link show flannel.1
ip -4 route show table main
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
```

Draining removes ordinary pod sandboxes but does not remove the Flannel DaemonSet or its remote-subnet routes. Those routes are expected while the node remains a cluster member. A truly stale route points to a Pod CIDR no longer owned by any current Node or an obsolete peer address.

Do not flush routes, delete `flannel.1`, or clear the FDB after a normal upgrade. The new daemon should reconcile state. If it does not, preserve logs and compare the route to Node CIDRs and Flannel annotations; manual deletion hides the control-plane defect.

Create a test pod on the node before returning general workloads. Because the node is cordoned, use a temporary controlled scheduling method or briefly uncordon only when the test controller is ready, then verify:

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

A route to an old node usually indicates one of these:

- The Kubernetes Node object still exists.
- Flannel cannot watch the API or its event queue/cache did not synchronize.
- A stale Flannel public-IP annotation points to an old address.
- NetworkManager or a host script installed a static copy of a Flannel route.
- The upgrade also changed backend or Pod CIDR, which requires migration cleanup.

Fix the owning state. Never run `ip route flush table main`.

## Roll Back Without Mixing Versions Indefinitely

With `OnDelete`, restore the previous reviewed pod template and delete only the failed node's Flannel pod again. Verify that its init containers restore the matching CNI executable and conflist. With `RollingUpdate`, a DaemonSet revision can be inspected and rolled back using Kubernetes' supported rollout commands.

Pause on the first failed node. Do not continue a heterogeneous rollout until the target or rollback passes direct Pod IP tests.

After every node is upgraded and validated, decide whether to keep `OnDelete` for future gated maintenance or restore a reviewed `RollingUpdate` policy.

## Official Documentation

- [Flannel release notes](https://github.com/flannel-io/flannel/releases)
- [Flannel restart behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/running.md#zero-downtime-restarts)
- [Flannel backend reference and runtime-change warning](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Kubernetes: Perform a rolling update on a DaemonSet](https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes DaemonSet concepts](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Conclusion

Upgrade Flannel as a pinned DaemonSet and CNI pair while keeping its network and backend constant. A manually gated `OnDelete` rollout lets you drain, replace, inspect, test, and uncordon one node at a time. Treat remote-subnet routes as expected while nodes remain members, and repair stale lease or annotation ownership instead of flushing kernel state.
