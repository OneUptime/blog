# Fix Flannel: Node Pod CIDR Not Assigned

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Kubeadm, Pod CIDR, Node IPAM, Troubleshooting

Description: Fix Flannel's node pod CIDR lease error by restoring Kubernetes node-CIDR allocation and aligning kubeadm, Node objects, and Flannel's network configuration.

---

## Introduction

The error `failed to acquire lease: node ... pod cidr not assigned` is precise. When Flannel runs with `--kube-subnet-mgr`, it requires the node's `.spec.podCIDR` and uses `.spec.podCIDRs` when present; it does not choose a per-node Pod range itself. Kubernetes must populate that range first, normally through the node IPAM controller.

In a kubeadm cluster, supplying `--pod-network-cidr` during `kubeadm init` causes kubeadm to configure the controller manager with node-CIDR allocation. Installing Flannel after initializing kubeadm without that setting is the most common cause of this error.

## Confirm the Failure

```bash
kubectl -n kube-flannel get pods -l app=flannel -o wide
kubectl -n kube-flannel logs -l app=flannel \
  -c kube-flannel --tail=200 --prefix

kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs[*]'
```

Interpret the result carefully:

- Empty CIDRs on every node point to controller-manager configuration.
- An empty CIDR on one new node points to node IPAM reconciliation, CIDR capacity, or a stale/recreated Node object.
- A populated CIDR outside Flannel's configured network is a configuration mismatch, not a missing-CIDR problem.
- Duplicate node CIDRs are unsafe; never silence the error by copying another node's range.

Check Flannel's cluster network:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo
```

For example, `10.244.7.0/24` is contained by `10.244.0.0/16`. A CIDR such as `192.168.7.0/24` is not.

## Fix a New kubeadm Cluster

For a cluster that has just been created and has no state to preserve, initialize kubeadm with the Pod network expected by Flannel:

```bash
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
```

Or use a version-appropriate kubeadm configuration file:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: 10.244.0.0/16
  serviceSubnet: 10.96.0.0/12
```

```bash
sudo kubeadm init --config kubeadm-config.yaml
```

Then apply a pinned Flannel release manifest whose `net-conf.json` contains the same network. The upstream default is `10.244.0.0/16`; download and edit the manifest before applying it if you chose another range.

`kubeadm reset` destroys local cluster state and does not clean every CNI artifact. Use it only when you have explicitly decided to rebuild an empty cluster, have backups where relevant, and are running it on the intended nodes. It is not the repair procedure for a production cluster.

## Inspect the Controller Manager in an Existing Cluster

On a kubeadm control-plane node, check the static Pod manifest:

```bash
sudo grep -E -- \
  '--(allocate-node-cidrs|cluster-cidr|node-cidr-mask-size)' \
  /etc/kubernetes/manifests/kube-controller-manager.yaml
```

The effective configuration needs `--allocate-node-cidrs=true` and a `--cluster-cidr` matching the cluster Pod network. The node mask controls how many addresses each node receives. Current Kubernetes defaults are `/24` for IPv4 and `/64` for IPv6 unless configured otherwise.

Inspect controller logs and recent Node events:

```bash
kubectl -n kube-system get pods -l component=kube-controller-manager -o wide
kubectl -n kube-system logs -l component=kube-controller-manager \
  --tail=300 --prefix | grep -iE 'cidr|range|allocate|node'

kubectl get events --all-namespaces --sort-by=.lastTimestamp \
  | grep -iE 'cidr|CIDRNotAvailable'
```

Editing the `kubeadm-config` ConfigMap alone does not rewrite a running static Pod manifest. In a high-availability control plane, ad hoc edits on one member also create drift. Plan the change through the cluster's kubeadm configuration management, back up manifests, update every control-plane member consistently, and verify the supported procedure for the installed Kubernetes version.

Before expanding or changing a Pod CIDR, check for overlap with node networks, Service CIDRs, LAN routes, VPN routes, and connected clusters. Changing the cluster Pod range after workloads exist is a network migration, not a one-flag fix.

## Handle One Node With No CIDR

First verify capacity and uniqueness across the cluster:

```bash
kubectl get nodes -o json \
  | jq -r '.items[] | [.metadata.name, .spec.podCIDR, (.spec.podCIDRs // [] | join(","))] | @tsv'

kubectl get node worker-3 -o yaml | sed -n '/spec:/,/status:/p'
```

If the controller is configured correctly, inspect its logs for `CIDRNotAvailable`. A `/16` divided into `/24` node ranges has 256 theoretical subnets; reserved or already allocated ranges reduce what is available. Adding nodes after exhausting that pool requires a planned cluster-network expansion or rebuild that the installed Kubernetes and CNI versions support.

For a controlled lab or recovery scenario, Kubernetes allows a missing node CIDR to be patched manually:

```bash
# Only after proving this subnet is inside the cluster Pod CIDR,
# is unused by every other node, and contains no conflicting route.
kubectl patch node worker-3 --type=merge \
  -p '{"spec":{"podCIDR":"10.244.3.0/24","podCIDRs":["10.244.3.0/24"]}}'
```

This is not a substitute for fixing node IPAM. The node subnet must be unique, and dual-stack clusters need correctly ordered IPv4 and IPv6 entries. Prefer allowing the controller manager to allocate it.

## Restart Flannel and Verify the Lease

Once the Node object is correct, restart only the Flannel pod on the affected node:

```bash
NODE=worker-3
FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel delete pod "$FLANNEL_POD"
kubectl -n kube-flannel get pods -l app=flannel -o wide --watch
```

Then confirm the generated subnet state on that host:

```bash
sudo cat /run/flannel/subnet.env
ip -4 route
ip -d link show flannel.1
```

With the default VXLAN backend, `flannel.1` appears after successful backend initialization. Other backends create different interfaces or routes, so do not require `flannel.1` when using `host-gw`, WireGuard, or another backend.

Finally, schedule a test pod on the repaired node and test both a local and a remote Pod IP. ClusterIP testing comes afterward because kube-proxy implements Service VIPs.

## What Not to Do

- Do not manually create `/run/flannel/subnet.env`; Flannel must derive and write it from valid cluster state.
- Do not assign the whole cluster CIDR to one node.
- Do not reuse another node's `/24`.
- Do not change only Flannel's ConfigMap while controller-manager still allocates from a different range.
- Do not delete all CNI state or network routes for a control-plane allocation error.

## Official Documentation

- [Flannel troubleshooting: Kubernetes Pod CIDRs](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#kubernetes-specific)
- [Flannel Kubernetes integration](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [Kubernetes: kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: kube-controller-manager flags](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)

## Conclusion

`node pod cidr not assigned` means Flannel is waiting for a Pod CIDR on the Node, normally allocated by Kubernetes node IPAM. Restore `--allocate-node-cidrs` with the correct cluster CIDR, confirm every node has a unique subnet inside Flannel's network, and then restart the affected Flannel pod. Treat CIDR changes and manual patches as controlled network operations, not routine CNI cleanup.
