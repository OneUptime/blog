# How to Set Up Macvlan with Whereabouts for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Macvlan, Whereabouts, Networking

Description: Configure Macvlan NetworkAttachmentDefinitions with Whereabouts IPAM for Rook-Ceph to provide stable IP addresses on a dedicated storage network.

---

Macvlan with Whereabouts IPAM is the most common production setup for Rook-Ceph Multus networking. Macvlan creates virtual network interfaces on top of a physical NIC, and Whereabouts provides distributed IPAM (IP Address Management) to assign unique, consistent IPs from a defined range. Together they give Ceph pods dedicated storage network connectivity.

## Prerequisites

Verify both Macvlan CNI and Whereabouts are available:

```bash
# Check Macvlan is available (it's a built-in Linux kernel module)
ls /opt/cni/bin/macvlan

# Check Whereabouts is installed
kubectl -n kube-system get pods | grep whereabouts
```

```text
whereabouts-ds-abc12   1/1     Running   0          5d
```

Whereabouts requires a DaemonSet running on all nodes. Install it if missing:

```bash
git clone https://github.com/k8snetworkplumbingwg/whereabouts && cd whereabouts
kubectl apply \
    -f doc/crds/daemonset-install.yaml \
    -f doc/crds/whereabouts.cni.cncf.io_ippools.yaml \
    -f doc/crds/whereabouts.cni.cncf.io_overlappingrangeipreservations.yaml
```

## Designing the IP Range

Before creating the NAD, plan your IP allocation:

```text
Physical interface: eth1
Storage network CIDR: 192.168.100.0/24
Gateway: 192.168.100.1
Whereabouts range: 192.168.100.10 - 192.168.100.200
Reserved (hosts): 192.168.100.1 - 192.168.100.9
Reserved (future): 192.168.100.201 - 192.168.100.254
```

The range must not overlap with IPs already assigned to the host interfaces.

## Creating the Macvlan NAD with Whereabouts

Create the public network NAD:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: rook-public-network
  namespace: rook-ceph
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "rook-public-network",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "whereabouts",
        "range": "192.168.100.0/24",
        "range_start": "192.168.100.10",
        "range_end": "192.168.100.200",
        "gateway": "192.168.100.1",
        "exclude": [
          "192.168.100.1/32",
          "192.168.100.2/32"
        ]
      }
    }
```

Create the cluster network NAD:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: rook-cluster-network
  namespace: rook-ceph
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "rook-cluster-network",
      "type": "macvlan",
      "master": "eth2",
      "mode": "bridge",
      "ipam": {
        "type": "whereabouts",
        "range": "192.168.200.0/24",
        "range_start": "192.168.200.10",
        "range_end": "192.168.200.200",
        "gateway": "192.168.200.1"
      }
    }
```

Apply both NADs:

```bash
kubectl apply -f rook-public-network-nad.yaml
kubectl apply -f rook-cluster-network-nad.yaml
```

## Verifying Whereabouts IP Allocation

Whereabouts stores IP allocation state in Kubernetes custom resources. Check current allocations:

```bash
kubectl -n kube-system get ippools
kubectl -n kube-system get overlappingrangeipreservations
```

Check for overlapping range reservations:

```bash
kubectl get overlappingrangeipreservations.whereabouts.cni.cncf.io -A -o yaml
```

View allocations in the NAD:

```bash
kubectl -n rook-ceph get network-attachment-definition rook-public-network -o yaml
```

## Testing the NAD with a Test Pod

Before configuring Rook, validate the NAD works with a test pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nad-test
  namespace: rook-ceph
  annotations:
    k8s.v1.cni.cncf.io/networks: rook-public-network
spec:
  containers:
  - name: test
    image: busybox
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f nad-test-pod.yaml
kubectl -n rook-ceph exec nad-test -- ip addr show
```

```text
3: net1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue
    inet 192.168.100.10/24 brd 192.168.100.255 scope global net1
```

If the pod has a `net1` interface with an IP from the Whereabouts range, the NAD is working correctly.

Clean up the test pod:

```bash
kubectl -n rook-ceph delete pod nad-test
```

## Configuring Rook to Use the NADs

With NADs validated, configure the CephCluster:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
      cluster: rook-ceph/rook-cluster-network
```

## Troubleshooting Whereabouts Issues

**IP pool exhaustion:** If Whereabouts runs out of IPs, pod creation will fail with an IP allocation error. Monitor usage:

```bash
kubectl -n rook-ceph get pods | wc -l
# Compare against range size: 192.168.100.10 - 192.168.100.200 = 191 IPs
```

**Stale IP allocations:** If a pod crashes without releasing its IP, Whereabouts may hold the allocation. Check for stale entries:

```bash
kubectl -n kube-system get ippools.whereabouts.cni.cncf.io -o yaml | grep ip
```

**Wrong master interface:** Verify the `master` field in the NAD matches the actual interface name on nodes:

```bash
for node in node-1 node-2 node-3; do
  ssh $node "ip link show eth1 2>/dev/null && echo 'eth1 exists' || echo 'eth1 MISSING'"
done
```

## Summary

Setting up Macvlan with Whereabouts for Rook-Ceph involves installing the Whereabouts DaemonSet, creating NetworkAttachmentDefinitions that specify the physical master interface, CIDR range, and IP allocation bounds for both public and cluster networks, validating with a test pod before configuring Rook, and referencing the NADs in the CephCluster `spec.network.selectors`. Whereabouts provides distributed IPAM that works correctly in multi-node Kubernetes clusters without requiring a central DHCP server.
