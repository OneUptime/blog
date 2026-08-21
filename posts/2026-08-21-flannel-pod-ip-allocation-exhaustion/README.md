# Diagnose Flannel Pod IP Exhaustion and Duplicate Node CIDRs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, IPAM, Pod CIDR, Host-Local IPAM, Troubleshooting

Description: Separate Kubernetes node-CIDR exhaustion from node-local CNI IP exhaustion, find duplicate subnets and orphaned allocations, and recover without deleting live state.

---

## Introduction

“Flannel stopped allocating IPs” can describe two different allocators in a standard Kubernetes installation:

- Kubernetes' node IPAM controller allocates one `.spec.podCIDR` or `.spec.podCIDRs` range to each Node. Flannel's Kubernetes subnet manager consumes that assignment as its node lease.
- The delegated CNI `host-local` plugin allocates individual pod addresses from that node range and records them on the node filesystem.

Flannel itself does not allocate individual Pod IPs in this design. Diagnose the exact error before changing leases or deleting state.

## Classify the Error

Inspect the stuck pod and recent events:

```bash
NS=default
POD=<stuck-pod>

kubectl -n "$NS" describe pod "$POD"
kubectl get events --all-namespaces --sort-by=.lastTimestamp \
  | grep -iE 'CIDRNotAvailable|no IP addresses|failed.*sandbox|pod cidr|cni'
```

Then read Flannel logs:

```bash
kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  -c kube-flannel --tail=300 --prefix
```

Common branches are:

- `node ... pod cidr not assigned`: node IPAM did not assign a node subnet.
- `CIDRNotAvailable` in controller-manager events/logs: the cluster pool cannot provide another node subnet or allocation state conflicts.
- `no IP addresses available in network: cbr0`: the node's `host-local` pool appears full.
- An address-already-in-use error: duplicate local state, duplicate Node CIDR, or a stale bridge can be involved.
- Flannel cannot acquire or watch its Kubernetes lease: API, RBAC, Node identity, or subnet configuration problem.

## Audit Node CIDRs for Missing and Duplicate Values

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs[*]'
```

Find duplicate nonempty IPv4 primary CIDRs:

```bash
kubectl get nodes -o json | jq '
  [.items[] | {node: .metadata.name, cidr: (.spec.podCIDR // "")}] 
  | group_by(.cidr)[]
  | select(.[0].cidr != "" and length > 1)'
```

For dual-stack, group each family in `.spec.podCIDRs` separately. Every node range must be unique and contained by Flannel's configured networks:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo
```

Duplicate CIDRs make two nodes advertise the same destination. Do not pick a winner by adding route metrics. Cordon and drain affected nodes, fix controller-manager allocation, and rebuild or rejoin the wrongly assigned node through the cluster's supported process. Changing `.spec.podCIDR` under running pods leaves `subnet.env`, `cni0`, local IPAM files, and routes inconsistent.

## Check Cluster-Level Node CIDR Capacity

On a kubeadm control-plane node:

```bash
sudo grep -E -- \
  '--(allocate-node-cidrs|cluster-cidr|node-cidr-mask-size)' \
  /etc/kubernetes/manifests/kube-controller-manager.yaml

kubectl -n kube-system logs -l component=kube-controller-manager \
  --tail=500 --prefix | grep -iE 'cidr|allocate|range'
```

The current Kubernetes default IPv4 node mask is `/24`. A `/16` split into `/24` ranges has 256 theoretical node prefixes. Dual-stack defaults and customized mask sizes differ. Existing allocations and controller behavior determine usable capacity.

If the cluster has exhausted node ranges, adding space is a control-plane and network migration. It can require controller-manager reconfiguration, Flannel network changes, new Node CIDRs, route updates, and workload recreation. Do not expand only Flannel's ConfigMap or assign the entire cluster range to one node.

For a newly built cluster, choose a sufficiently large non-overlapping `podSubnet` and an intentional node mask. For an established cluster, follow the installed Kubernetes version's supported reconfiguration path or plan a rebuild.

## Measure the Per-Node host-local Pool

Find the affected node and its subnet:

```bash
NODE=$(kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.nodeName}')
kubectl get node "$NODE" -o jsonpath='{.spec.podCIDR}{"\n"}'
kubectl get pods --all-namespaces \
  --field-selector "spec.nodeName=${NODE}" -o wide
```

On that node, read the installed network name:

```bash
NETWORK_NAME=$(sudo jq -r '.name' /etc/cni/net.d/10-flannel.conflist)
STATE_DIR="/var/lib/cni/networks/${NETWORK_NAME}"

echo "$STATE_DIR"
sudo find "$STATE_DIR" -mindepth 1 -maxdepth 1 -type f -printf '%f\n' \
  | sort -V
```

Official `host-local` documentation says allocations are stored as files in `/var/lib/cni/networks/$NETWORK_NAME` unless `dataDir` overrides it. The directory also contains allocator metadata such as a last-reserved address; count IP-named files, not every file blindly.

For a default IPv4 `/24`, `host-local` normally allocates from `.2` through `.254` and uses `.1` as the gateway, subject to configured `rangeStart`, `rangeEnd`, and reserved values. Kubernetes' kubelet `maxPods` is often lower than that address capacity. A full `/24` with far fewer live pods strongly suggests leaked local records.

## Match Allocation Files to Live Sandboxes

Inspect a small sample:

```bash
sudo sed -n '1,5p' "${STATE_DIR}/<allocated-pod-ip>"
sudo crictl pods
sudo crictl ps -a
```

The IP file records a container identity. Correlate it with runtime sandboxes and Kubernetes pods. Account for recently terminated pods and in-progress CNI DEL operations before declaring it orphaned.

Causes of leaked state include:

- A runtime or node crash between CNI ADD and DEL.
- Restoring `/var/lib/cni` from a machine image or backup.
- Reusing a host for a new cluster without decommissioning it.
- A runtime endpoint change that hides old sandboxes.
- Manual deletion of network namespaces or containers outside the CRI.

## Recover Orphaned Local Allocations Safely

First let normal lifecycle clean up:

```bash
kubectl cordon "$NODE"
kubectl drain "$NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

Review disruption budgets and local storage before accepting drain options. After a successful drain, stop kubelet to prevent a concurrent CNI ADD while auditing:

```bash
sudo systemctl stop kubelet
sudo crictl pods
```

Back up the exact network directory:

```bash
RECOVERY_DIR="/var/lib/cni/recovery-${NETWORK_NAME}-$(date +%Y%m%d%H%M%S)"
sudo install -d -m 0700 "$RECOVERY_DIR"
sudo cp -a "$STATE_DIR" "$RECOVERY_DIR/"
```

For each IP file proven to have no live or recoverable sandbox, move that one file rather than clearing the directory:

```bash
# Destructive to one allocation record: replace with a verified orphaned IP.
sudo mv "${STATE_DIR}/10.244.3.27" "$RECOVERY_DIR/"
```

Do not delete the `last_reserved_ip.*` files or the whole `/var/lib/cni` tree as a generic fix. Other CNI networks and live allocations can share that parent.

Restart kubelet, then use a controlled scheduling method for one test pod while the node remains cordoned. If that is not available, briefly uncordon only after the test controller is ready, and re-cordon immediately if the test fails. Once the test receives an address in the correct Node CIDR and connectivity succeeds, return the node to service:

```bash
sudo systemctl start kubelet
kubectl uncordon "$NODE"
```

If live demand truly exceeds the node pool, distribute pods across more nodes or design larger per-node ranges. Changing the node mask does not enlarge CIDRs already assigned to active nodes.

## Distinguish Kubernetes and etcd Subnet Modes

The upstream Kubernetes manifest runs `--kube-subnet-mgr`; its Flannel leases reflect Kubernetes Node Pod CIDRs. Standalone Flannel can instead allocate subnet leases in etcd, with lease expiration and `--subnet-lease-renew-margin` behavior documented separately.

Check the running arguments before applying etcd lease commands:

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="kube-flannel")].args}'
echo
```

Do not delete etcd lease keys in Kubernetes subnet-manager mode, and do not assume Node `.spec.podCIDR` is authoritative in a standalone etcd deployment.

## Prevent Recurrence

- Alert on node Pod CIDR allocation events and CNI sandbox failures.
- Compare live pods, CRI sandboxes, and host-local IP files periodically without mutating them.
- Do not bake `/var/lib/cni` or `/run/flannel` into node images.
- Decommission nodes through Kubernetes and runtime lifecycle before reuse.
- Capacity-plan both cluster node prefixes and per-node pod addresses.
- Reject duplicate CIDRs in provisioning checks.

## Official Documentation

- [Flannel troubleshooting: Node Pod CIDRs](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#kubernetes-specific)
- [Flannel running and etcd subnet lease behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/running.md)
- [Flannel configuration and lease renewal](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [CNI host-local IPAM and allocation files](https://www.cni.dev/plugins/current/ipam/host-local/)
- [Kubernetes controller-manager CIDR flags](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)

## Conclusion

In Kubernetes mode, separate node subnet allocation from individual Pod IP allocation. Kubernetes assigns Node CIDRs, Flannel turns them into network state, and `host-local` records pod addresses on each host. Audit missing or duplicate Node CIDRs first, then compare local IP files with live CRI sandboxes. Recover only confirmed orphan files on a drained node and treat real capacity changes as planned network reconfiguration.
