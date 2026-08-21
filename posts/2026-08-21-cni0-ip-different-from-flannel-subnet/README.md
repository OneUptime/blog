# Fix a `cni0` Address That Differs From the Flannel Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, CNI, CNI Bridge, Host-Local IPAM, Troubleshooting

Description: Safely repair a stale cni0 bridge whose gateway address no longer matches the subnet assigned to a Flannel node.

---

## Introduction

The error `cni0 already has an IP address different from ...` comes from the local CNI bridge setup. The bridge already exists with a gateway address from one subnet, while the Flannel CNI plugin is now asking the delegated `bridge` plugin to use another subnet from `/run/flannel/subnet.env`.

This frequently follows a Pod CIDR change, a rebuilt cluster on reused hosts, a CNI migration, or a Node object recreation that received a new per-node CIDR. It is local stale state; deleting and reapplying the Flannel DaemonSet alone does not necessarily remove it.

Do not delete `cni0` while pods are attached. First prove the mismatch, then cordon and drain the one affected node.

## Compare the Three Sources of Truth

```bash
NODE=worker-2

kubectl get node "$NODE" \
  -o jsonpath='{.metadata.name}{"\t"}{.spec.podCIDR}{"\t"}{.spec.podCIDRs}{"\n"}'

kubectl get pods --all-namespaces \
  --field-selector "spec.nodeName=${NODE}" -o wide
```

On the node, inspect Flannel's file, the bridge, and local routes:

```bash
sudo cat /run/flannel/subnet.env
ip -4 address show dev cni0
ip -4 route show
```

For a node assigned `10.244.2.0/24`, a normal upstream-style setup typically writes `FLANNEL_SUBNET=10.244.2.1/24`, and `cni0` uses that gateway address after the first ordinary pod is created. The exact prefix and address family depend on your configuration.

Also verify that the cluster network agrees:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo
```

If the Node CIDR itself is wrong or overlaps another node, stop here. Fix control-plane allocation before touching the bridge.

## Establish Whether cni0 Is Stale

Check what is attached to the bridge:

```bash
ip link show master cni0
bridge link show master cni0
sudo find /var/lib/cni/networks -mindepth 1 -maxdepth 2 -type f -print
```

Do not infer that every veth is orphaned just because its name is unfamiliar. Match pod sandboxes through the container runtime:

```bash
sudo crictl pods
sudo crictl ps -a
```

Use the runtime endpoint configured on that node if `crictl` cannot auto-detect it. If live workload sandboxes still use `cni0`, deleting the bridge will break their networking.

The local `host-local` plugin maintains allocated addresses on disk. In the upstream Flannel conflist the network name is commonly `cbr0`, so its state is commonly under `/var/lib/cni/networks/cbr0`; custom configurations can use a different name. Read the `name` field instead of assuming the directory.

```bash
sudo jq -r '.name' /etc/cni/net.d/10-flannel.conflist
sudo ls -la /var/lib/cni/networks/cbr0
```

## Perform a Controlled Node Repair

Cordon and drain the affected node from a management host:

```bash
kubectl cordon "$NODE"
kubectl drain "$NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

Review disruption budgets and local-storage consequences before accepting drain options. Do not force-delete pods merely to get past an unsafe drain.

On the drained node, stop kubelet so it cannot issue a CNI ADD while the state is being repaired:

```bash
sudo systemctl stop kubelet

# Record the exact state before changing it.
sudo crictl pods
sudo ip -d address show dev cni0
sudo ip link show master cni0
sudo ip -4 route show
sudo find /var/lib/cni/networks -mindepth 1 -maxdepth 2 -type f -print
```

`kubectl drain --ignore-daemonsets` can leave non-host-network DaemonSet or static-pod sandboxes on the node. Correlate every remaining runtime sandbox and interface enslaved to `cni0`. Handle any live attachment through its controller or runtime's supported lifecycle, then repeat both checks. Do not delete the bridge while a live sandbox still uses it.

Delete only the confirmed stale bridge:

```bash
# Destructive and network-disrupting: run only on the drained target node.
sudo ip link delete cni0
```

Deleting the bridge usually removes routes attached to it. Do not run `ip route flush` or delete `flannel.1`; Flannel owns the cross-node backend and will reconcile it.

If the local host-local database refers only to drained, nonexistent sandboxes, preserve it as a backup instead of recursively deleting all CNI state:

```bash
# Replace cbr0 if the conflist's name is different.
# This moves one verified network directory and is recoverable.
STAMP=$(date +%Y%m%d%H%M%S)
sudo mv /var/lib/cni/networks/cbr0 \
  "/var/lib/cni/networks/cbr0.stale-${STAMP}"
```

Skip that step if the directory is absent or if any listed allocation still belongs to a live sandbox. Never remove the entire `/var/lib/cni` tree as a generic fix.

## Recreate and Test the Bridge

Start kubelet and ensure Flannel is healthy:

```bash
sudo systemctl start kubelet

kubectl -n kube-flannel get pods -l app=flannel -o wide
kubectl get node "$NODE"
```

`cni0` may remain absent until the next non-host-network pod is added. Create a small test pod pinned to the repaired node:

```bash
kubectl run cni0-test --image=busybox:1.36 --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"${NODE}\"}}" -- sleep 3600

kubectl get pod cni0-test -o wide
kubectl describe pod cni0-test
```

On the node:

```bash
ip -4 address show dev cni0
sudo cat /run/flannel/subnet.env
```

The bridge address and `FLANNEL_SUBNET` should now agree. Test a remote Pod IP before uncordoning:

```bash
kubectl exec cni0-test -- ping -c 3 <remote-pod-ip>
kubectl uncordon "$NODE"
```

## If the Mismatch Returns

A returning mismatch means something upstream keeps changing the requested subnet. Check for:

- Node deletion and recreation with a new CIDR while old node-local state remains.
- Multiple primary CNI conflists selected in filename order.
- A Flannel `Network` value different from the controller-manager cluster CIDR.
- Automation restoring an old CNI configuration after boot.
- A cloned machine image containing `/var/lib/cni` state.
- Duplicate node names or duplicate Node CIDRs.

Fix that source rather than scheduling repeated bridge deletion.

## Official Documentation

- [Flannel CNI plugin operation and delegate fields](https://github.com/flannel-io/cni-plugin)
- [CNI bridge plugin documentation](https://www.cni.dev/plugins/current/main/bridge/)
- [CNI host-local IPAM documentation](https://www.cni.dev/plugins/current/ipam/host-local/)
- [Flannel Kubernetes integration](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)

## Conclusion

The `cni0` mismatch is resolved by making the Node CIDR, Flannel subnet file, and local bridge agree. Validate the authoritative CIDR first, drain the node, delete only the stale bridge, and move only the confirmed host-local network state if necessary. A fresh pod should recreate `cni0` with the correct gateway.
