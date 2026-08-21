# Remove Stale Calico State Before Switching to Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Calico, CNI Migration, Route, Troubleshooting

Description: Migrate a node from Calico to Flannel by inventorying and safely removing stale Calico CNI configuration, interfaces, routes, and local IPAM state.

---

## Introduction

Switching from Calico to Flannel is more than applying a second DaemonSet. A Kubernetes node can retain Calico configuration files, host-local IPAM records when that plugin was configured, virtual interfaces, routes, and netfilter rules after the Calico pods disappear. The container runtime may continue selecting an old Calico conflist, or packets may follow stale Calico routes instead of Flannel's data plane.

Plan this as a cluster network migration with a maintenance window. Mixed CNIs can assign incompatible pod networks, and existing pods do not have their network namespace rebuilt when a new CNI is installed.

The node-local commands below assume Linux, IPv4, and Calico's non-eBPF iptables or nftables data plane. If Calico uses eBPF, first follow Tigera's documented reverse process to switch back to the standard data plane and restore `kube-proxy`; plain Flannel does not replace the Kubernetes Service proxy. VPP, Windows, and IPv6 or dual-stack migrations require their mode-specific removal and inventory steps instead of these IPv4 commands.

This generic maintenance sequence is a full-cluster outage, not a live rolling migration. "One node at a time" refers to destructive cleanup and validation after old-CNI workloads have been drained. Drain those workloads while the Calico CNI, its credentials, and its datastore access still work; removing them first can make CNI `DEL` calls fail and leave more stale state. If the cluster must remain available, use a documented migration workflow that gates the old and new CNI on each node.

Also account for NetworkPolicy. Plain Flannel provides connectivity; it does not by itself enforce Kubernetes NetworkPolicy. Current Flannel documents a separate, optional network-policy controller. Do not remove Calico policy enforcement without deciding what will replace it.

## Define the Intended End State

Before making changes, record:

- The Kubernetes cluster Pod CIDR and per-node CIDRs.
- Calico's current IPAM plugin, IP pools, encapsulation mode, and data plane.
- Flannel's planned `Network`, backend, interface, MTU, and masquerade settings.
- The installed Calico method: operator, manifests, or distribution-managed add-on.
- The runtime's actual CNI config and binary directories.
- The components that will enforce NetworkPolicy and implement Kubernetes Services after migration.

Kubernetes warns that Pod, Service, and host networks must not overlap. For Flannel's Kubernetes subnet manager, every node must have a defined, non-overlapping `.spec.podCIDR` contained by the Flannel network. Default `calico-ipam` does not use these per-node allocations, so confirm that the controller manager allocates them before switching. Reusing the existing Pod CIDR can reduce control-plane changes, but only if it is compatible with the target design.

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

`iptables-save` follows the host's selected xtables backend. If that selection may have changed, separately inventory `iptables-legacy-save`, `iptables-nft-save`, and `ipset save` when those commands exist; native nftables state is still inspected with `nft list ruleset`.

Common Calico artifacts include workload veth interfaces using Felix's configured prefix (default `cali*`), `vxlan.calico`, a configured WireGuard interface (default `wireguard.cali`) with its policy rule and dedicated route table, Calico-programmed addresses and routes on the kernel's `tunl0` device, routes to workload addresses, `cali-` netfilter chains, and a `10-calico.conflist`. Their exact set depends on the installed Calico version and networking mode. Do not delete an interface based only on its name until the node is drained and the installed mode is understood.

Capture a machine-readable baseline for comparison:

```bash
sudo ip -j address show > /var/tmp/pre-flannel-addresses.json
sudo ip -j route show table all > /var/tmp/pre-flannel-routes.json
sudo iptables-save > /var/tmp/pre-flannel-iptables.save
sudo nft list ruleset > /var/tmp/pre-flannel-nftables.txt
```

These files contain network topology and policy information; store and remove them according to your security policy.

## Remove Calico Through Its Installation Method

Identify the uninstall flow that matches the exact Calico deployment, but do not execute it until ordinary old-CNI workloads have been drained and every remaining non-host-network sandbox using Calico has been stopped. For an operator-managed installation, delete the operator custom resources after the drain and wait for their finalizers and managed components to finish before removing the operator as documented for that release. For a raw manifest installation, use the pinned manifest to identify the installed components and follow that release's removal procedure; do not run `kubectl delete -f` against a monolithic manifest if it includes CRDs that must be preserved. Distribution-managed CNIs should be disabled through the distribution, not fought with `kubectl delete`.

Do not begin by deleting Calico CRDs. Custom resources can contain IP pool and policy state needed for diagnosis or rollback, and deleting CRDs cascades their objects.

If Calico WireGuard encryption is enabled, disable it through the installed Calico configuration while Felix still runs. Before removing the node agents, verify that Felix removed the configured interface, policy rule, and dedicated route table; their names and numbers are configurable.

After the drains and remaining sandbox deletions, execute the removal flow. Wait until Calico controllers and node agents are no longer reconciling before cleaning node-local state. Otherwise they can recreate routes or rules while you remove them.

## Drain All Nodes, Then Clean One at a Time

```bash
NODE=worker-1

kubectl cordon "$NODE"
kubectl drain "$NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

Review PodDisruptionBudgets and local data before approving the drain. Repeat the cordon and drain for every node that hosts old-CNI workloads, and keep the nodes cordoned. Because `--ignore-daemonsets` leaves DaemonSet pods, inspect every node while kubelet and Calico's CNI credentials and datastore access still work:

```bash
kubectl get pods --all-namespaces \
  --field-selector "spec.nodeName=${NODE}" \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,OWNER:.metadata.ownerReferences[0].kind,HOSTNETWORK:.spec.hostNetwork,PHASE:.status.phase'
sudo crictl pods
```

For every remaining non-host-network sandbox that uses the old CNI, first disable, delete, or gate its owning DaemonSet or static workload, then wait for the pod and runtime sandbox to disappear. This lets its CNI `DEL` call run before Calico is removed. Do not stop a static or host-network control-plane sandbox merely because it appears in the inventory.

Complete this check on every node, handle WireGuard as described above when enabled, then execute the Calico removal flow and wait for its agents to stop reconciling. On the target node, stop kubelet to prevent concurrent CNI calls:

```bash
sudo systemctl stop kubelet
sudo cp -a /etc/cni/net.d \
  "/var/tmp/cni-net.d.before-flannel-$(date +%Y%m%d%H%M%S)"
sudo crictl pods
```

The final `crictl pods` inventory is a safety check: stopping kubelet does not stop containers already managed by the runtime. Do not remove CNI state if it still shows a non-host-network sandbox that uses the old network.

List the files again and remove only confirmed Calico configuration:

```bash
# Destructive but tightly scoped: verify these exact files are Calico-owned first.
sudo rm -f /etc/cni/net.d/10-calico.conflist
sudo rm -f /etc/cni/net.d/calico-kubeconfig
```

Do not remove all files in `/etc/cni/net.d`. Multus or another intentional chained CNI may also be present.

Preserve the old host-local network state with a scoped move. Host-local stores state under `<dataDir>/<network-name>`; `dataDir` defaults to `/var/lib/cni/networks`, and the network name comes from the old conflist's `name` field. Confirm both values because `dataDir` can be overridden and the name is only often `k8s-pod-network`:

```bash
# Run only after the node is drained and no live sandbox uses this network.
# Default dataDir example; use the old IPAM configuration's dataDir if it differs.
STAMP=$(date +%Y%m%d%H%M%S)
sudo mv /var/lib/cni/networks/k8s-pod-network \
  "/var/lib/cni/networks/k8s-pod-network.calico-${STAMP}"
```

Skip the command if that exact directory is not Calico's network state. Moving it is preferable to `rm -rf /var/lib/cni`, which can erase allocations belonging to other networks.

## Remove Interfaces and Routes in Dependency Order

After the node is drained and Calico is no longer running, deleting a Calico-created tunnel interface also removes routes attached to that device:

```bash
ip link show vxlan.calico
# Substitute Felix's configured WireGuard interface name if it is not the default.
ip link show wireguard.cali
ip -4 address show dev tunl0
ip -4 route show dev tunl0

# Destructive and node-local: run each command only after confirming the device is
# an unused Calico-owned artifact.
sudo ip link delete vxlan.calico
sudo ip link delete wireguard.cali
```

Either Calico-owned device may be absent in a mode that did not use it. If WireGuard could not be disabled before Felix stopped, compare the configured interface, policy rule, and route table with the saved rule and route inventory, then remove only exact confirmed remnants; deleting its interface alone does not remove a separate policy rule or table routes. `tunl0` is the Linux IPIP fallback device, not a Calico-owned interface, and the kernel may create it automatically. Do not expect `ip link delete tunl0` to remove it. Instead, remove only exact Calico addresses and routes verified against the saved baseline, or use the drained-node reboot in Tigera's applicable reverse-migration procedure.

Enumerate remaining interfaces that use the configured Felix workload prefix and map them to stopped sandboxes before deleting them one by one. This example uses the default `cali` prefix and strips the peer suffix that `ip -o link` can display:

```bash
ip -o link show | awk -F': ' '$2 ~ /^cali/ {sub(/@.*/, "", $2); print $2}'
```

`crictl pods` is only a sandbox inventory; it does not map a host veth name to a pod. Use preserved Calico WorkloadEndpoint data when available, or inspect the sandbox's network namespace before deleting an interface.

Avoid `ip route flush`, a wildcard route-deletion loop, or flushing the main table. Before deleting a remaining workload interface, inspect its attached routes. Deleting the interface removes those routes, so a separate route deletion is normally unnecessary. If an exact stale route must be removed independently, do so while its device still exists, for example:

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
- Binaries referenced by the chosen config exist; the upstream default uses `bridge`, `host-local`, and `portmap`, and the runtime must provide loopback internally or through the `loopback` plugin.
- VXLAN's configured UDP port is allowed between node underlay addresses.
- `br_netfilter` and forwarding sysctls are configured.

An ungated Flannel DaemonSet will run on every kubelet-active node even when the nodes are cordoned. For this outage sequence, keep kubelet stopped on every uncleaned node before applying Flannel, or add an explicit per-node selector gate and advance it only after each node is clean.

After applying Flannel, start kubelet and wait for the target node's host-network Flannel pod to be created, install the CNI files, and report Ready. The namespace and label below match the upstream manifest; adjust them for the pinned deployment. The repeated `--for` syntax requires kubectl 1.36 or later and avoids racing asynchronous DaemonSet pod creation:

```bash
sudo systemctl start kubelet
kubectl -n kube-flannel wait \
  --for=create \
  --for=condition=Ready pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=5m
```

With an older kubectl client, first wait or retry until the selected pod exists, then run a separate `kubectl wait --for=condition=Ready` for it.

Then verify that exactly one intended primary conflist is active:

```bash
sudo ls -la /etc/cni/net.d
sudo sed -n '1,220p' /etc/cni/net.d/10-flannel.conflist
sudo cat /run/flannel/subnet.env

# These checks assume Linux IPv4 VXLAN with the default VNI 1.
ip -d link show flannel.1
ip -4 route show
bridge fdb show dev flannel.1
```

`flannel.1` is the default IPv4 Linux VXLAN device when the VNI is 1; a custom VNI uses `flannel.<VNI>`. For `host-gw`, expect routes rather than a VXLAN interface. WireGuard uses `flannel-wg` and `flannel-wg-v6`; consult the backend reference for other modes.

## Recreate Workloads and Validate

```bash
kubectl run flannel-migration-test --image=busybox:1.36 --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"${NODE}\"}}" \
  --command -- sleep 3600
kubectl run flannel-migration-peer --image=busybox:1.36 --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"${NODE}\"}}" \
  --command -- sleep 3600
kubectl wait --for=condition=Ready \
  pod/flannel-migration-test pod/flannel-migration-peer \
  --timeout=2m
kubectl get pod flannel-migration-test flannel-migration-peer -o wide
```

From one test pod, test the peer's same-node Pod IP. Once at least two cleaned nodes run Flannel, also create or identify a temporary Pod on another cleaned node and test its Pod IP. Remove that additional target after the cross-node test.

Delete both local test pods before reusing their names on the next node. Pod deletion triggers CNI `DEL`, but `--wait=true` only waits for the API objects and their finalizers to disappear:

```bash
kubectl delete pod \
  flannel-migration-test flannel-migration-peer \
  --wait=true
```

Check kubelet and runtime logs, and confirm that the sandboxes, host veths, and relevant Flannel host-local allocations are gone before declaring the deletion path healthy. Keep the cleaned node cordoned, and repeat the cleanup and direct-bound tests for the next node.

Only after every node is Flannel-ready and has passed the direct traffic and deletion checks should you uncordon the nodes during controlled cluster restoration:

```bash
# Repeat with NODE set to each cleaned node.
kubectl uncordon "$NODE"
```

Wait for DNS and the chosen Service proxy's required components to be recreated or report Ready on Flannel nodes. Then use a restored workload or a new test pod to test DNS and a ClusterIP. If direct Pod IPs work but the ClusterIP does not, troubleshoot kube-proxy or the chosen Service proxy rather than removing more CNI state.

Keep the scoped backups until rollback is no longer required, then remove them under an approved retention procedure.

## Official Documentation

- [Flannel Kubernetes installation and CNI requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel CNI plugin delegation](https://github.com/flannel-io/cni-plugin)
- [Calico: Revert a migration-controller Flannel-to-Calico migration](https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel#revert-migration)
- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)

## Conclusion

A safe Calico-to-Flannel migration removes ownership in layers: drain old-CNI workloads while Calico's CNI still works, stop Calico reconciliation, remove only Calico's CNI config and verified local state, delete confirmed Calico interfaces and exact stale routes, then let Flannel build its own data plane. Preserve backups, avoid broad route or netfilter flushes, and verify Pod IP traffic before testing Services or returning the node to service.
