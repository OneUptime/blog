# Remove Stale Calico State Before Switching to Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Calico, CNI Migration, Route, Troubleshooting

Description: Migrate a node from Calico to Flannel by inventorying and safely removing stale Calico CNI configuration, interfaces, routes, and local IPAM state.

---

## Introduction

Switching from Calico to Flannel is more than applying a second DaemonSet. A Kubernetes node can retain Calico configuration files, local IPAM records, virtual interfaces, routes, and netfilter rules after the Calico pods disappear. The container runtime may continue selecting an old Calico conflist, or packets may follow stale Calico routes instead of Flannel's data plane.

Plan this as a cluster network migration with a maintenance window. Mixed CNIs can assign incompatible pod networks, and existing pods do not have their network namespace rebuilt when a new CNI is installed.

Also account for NetworkPolicy. Plain Flannel provides connectivity; it does not by itself enforce Kubernetes NetworkPolicy. Current Flannel documents a separate, optional network-policy controller. Do not remove Calico policy enforcement without deciding what will replace it.

## Define the Intended End State

Before making changes, record:

- The Kubernetes cluster Pod CIDR and per-node CIDRs.
- Calico's current IP pools and encapsulation mode.
- Flannel's planned `Network`, backend, interface, MTU, and masquerade settings.
- The installed Calico method: operator, manifests, or distribution-managed add-on.
- The runtime's actual CNI config and binary directories.
- The component that will enforce NetworkPolicy after migration.

Kubernetes warns that Pod, Service, and host networks must not overlap. For kubeadm and Flannel, node `.spec.podCIDR` values must be contained by the Flannel network. Reusing the existing Pod CIDR can reduce control-plane changes, but only if it is compatible with the target design.

## Inventory Before Removing Anything

At cluster scope:

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR'
kubectl get pods --all-namespaces -o wide \
  | grep -iE 'calico|tigera|flannel'
kubectl get crd | grep -iE 'calico|tigera'
```

On each candidate node:

```bash
sudo ls -la /etc/cni/net.d
sudo sed -n '1,240p' /etc/cni/net.d/10-calico.conflist
sudo find /var/lib/cni/networks -mindepth 1 -maxdepth 2 -type f -print

ip -details link show
ip -4 route show table main
ip -4 rule show
sudo iptables-save | grep -E 'cali-|KUBE-|FLANNEL' | head -200
sudo nft list ruleset | grep -E 'cali|KUBE|flannel' | head -200
```

Common Calico artifacts include `cali*` veth interfaces, `tunl0`, `vxlan.calico`, routes to workload addresses, `cali-` netfilter chains, and a `10-calico.conflist`. Their exact set depends on the installed Calico version and networking mode. Do not delete an interface based only on its name until the node is drained and the installed mode is understood.

Capture a machine-readable baseline for comparison:

```bash
sudo ip -j address show > /var/tmp/pre-flannel-addresses.json
sudo ip -j route show table all > /var/tmp/pre-flannel-routes.json
sudo iptables-save > /var/tmp/pre-flannel-iptables.save
sudo nft list ruleset > /var/tmp/pre-flannel-nftables.txt
```

These files contain network topology and policy information; store and remove them according to your security policy.

## Remove Calico Through Its Installation Method

Use the uninstall flow that matches the exact Calico deployment. For an operator-managed installation, remove the operator custom resources and operator as documented for that release. For a raw manifest installation, delete using the pinned manifest that originally installed it. Distribution-managed CNIs should be disabled through the distribution, not fought with `kubectl delete`.

Do not begin by deleting Calico CRDs. Custom resources can contain IP pool and policy state needed for diagnosis or rollback, and deleting CRDs cascades their objects.

Wait until Calico controllers and node agents are no longer reconciling before cleaning node-local state. Otherwise they can recreate routes or rules while you remove them.

## Drain and Clean One Node at a Time

```bash
NODE=worker-1

kubectl cordon "$NODE"
kubectl drain "$NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

Review PodDisruptionBudgets and local data before approving the drain. On the target node, stop kubelet to prevent concurrent CNI calls:

```bash
sudo systemctl stop kubelet
sudo cp -a /etc/cni/net.d \
  "/var/tmp/cni-net.d.before-flannel-$(date +%Y%m%d%H%M%S)"
```

List the files again and remove only confirmed Calico configuration:

```bash
# Destructive but tightly scoped: verify these exact files are Calico-owned first.
sudo rm -f /etc/cni/net.d/10-calico.conflist
sudo rm -f /etc/cni/net.d/calico-kubeconfig
```

Do not remove all files in `/etc/cni/net.d`. Multus or another intentional chained CNI may also be present.

Preserve the old host-local network state with a scoped move. The directory name comes from the old conflist's `name` field and is often `k8s-pod-network`, but confirm it:

```bash
# Run only after the node is drained and no live sandbox uses this network.
STAMP=$(date +%Y%m%d%H%M%S)
sudo mv /var/lib/cni/networks/k8s-pod-network \
  "/var/lib/cni/networks/k8s-pod-network.calico-${STAMP}"
```

Skip the command if that exact directory is not Calico's network state. Moving it is preferable to `rm -rf /var/lib/cni`, which can erase allocations belonging to other networks.

## Remove Interfaces and Routes in Dependency Order

After the node is drained and Calico is no longer running, deleting a Calico tunnel interface also removes routes attached to that device:

```bash
ip link show vxlan.calico
ip link show tunl0

# Destructive and node-local: run only for interfaces confirmed to be unused Calico artifacts.
sudo ip link delete vxlan.calico
sudo ip link delete tunl0
```

One or both commands may report that the device does not exist; that is normal for a mode that did not use it. Enumerate remaining `cali*` interfaces and map them to stopped sandboxes before deleting them one by one:

```bash
ip -o link show | awk -F': ' '$2 ~ /^cali/ {print $2}'
sudo crictl pods
```

Avoid `ip route flush`, a wildcard route-deletion loop, or flushing the main table. After tunnel and workload interfaces are gone, inspect remaining routes and delete only an exact, verified stale route, for example:

```bash
ip route show 10.244.7.23/32

# Example only: verify destination, device, and next hop against the saved baseline.
sudo ip route delete 10.244.7.23/32 dev cali01234567890
```

Netfilter cleanup is version- and mode-dependent. Prefer the Calico release's supported cleanup/uninstall mechanism. Do not flush `iptables`, delete every `cali-*` chain blindly, or reload firewalld mid-migration: kube-proxy, the container runtime, and other software share those rule sets.

## Install Flannel With One Authoritative Config

Use a version-pinned Flannel release manifest. Confirm before applying it that:

- `net-conf.json` matches the Kubernetes cluster Pod CIDR.
- The chosen backend is supported by the node kernel and underlay.
- The CNI binary and config hostPaths match the runtime.
- Required reference plugins such as `bridge`, `host-local`, `loopback`, and `portmap` exist.
- VXLAN's configured UDP port is allowed between node underlay addresses.
- `br_netfilter` and forwarding sysctls are configured.

After applying Flannel, verify that exactly one intended primary conflist is active:

```bash
sudo ls -la /etc/cni/net.d
sudo sed -n '1,220p' /etc/cni/net.d/10-flannel.conflist
sudo cat /run/flannel/subnet.env

ip -d link show flannel.1
ip -4 route show
bridge fdb show dev flannel.1
```

`flannel.1` is specific to the Linux VXLAN backend. For `host-gw`, expect routes rather than a VXLAN interface; WireGuard and other backends have their own devices.

## Recreate Workloads and Validate

```bash
sudo systemctl start kubelet

kubectl run flannel-migration-test --image=busybox:1.36 --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"${NODE}\"}}" -- sleep 3600
kubectl get pod flannel-migration-test -o wide
```

Test a same-node Pod IP, a remote-node Pod IP, DNS, and a ClusterIP. If direct Pod IPs work but the ClusterIP does not, troubleshoot kube-proxy rather than removing more CNI state.

Only after the node passes tests should you uncordon it and move to the next node:

```bash
kubectl uncordon "$NODE"
```

Keep the scoped backups until rollback is no longer required, then remove them under an approved retention procedure.

## Official Documentation

- [Flannel Kubernetes installation and CNI requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel CNI plugin delegation](https://github.com/flannel-io/cni-plugin)
- [Calico: Revert migrated nodes from Calico back to Flannel](https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel#revert-from-calico-to-flannel)
- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)

## Conclusion

A safe Calico-to-Flannel migration removes ownership in layers: stop Calico reconciliation, drain a node, remove only Calico's CNI config and verified local state, delete confirmed Calico interfaces and exact stale routes, then let Flannel build its own data plane. Preserve backups, avoid broad route or netfilter flushes, and verify Pod IP traffic before testing Services or returning the node to service.
