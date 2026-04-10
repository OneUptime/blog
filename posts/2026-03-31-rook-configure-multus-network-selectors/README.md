# How to Configure Multus Network Selectors in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multus, Network, Selector

Description: Learn how to configure Multus network selectors in the Rook CephCluster CR to direct public and cluster traffic to specific NetworkAttachmentDefinitions.

---

Rook's Multus integration uses network selectors to map Ceph's public and cluster networks to specific NetworkAttachmentDefinitions (NADs). Network selectors are configured in the CephCluster CR under `spec.network.selectors`. Getting this configuration right is essential for Multus-based networking to function correctly.

## Network Selector Concepts

Ceph uses two distinct networks:
- **Public network**: Communication between clients (applications) and Ceph monitors/OSDs
- **Cluster network**: Internal OSD-to-OSD replication and backfill traffic

Rook maps these to Multus NADs using the `selectors` field. You can configure both networks, only the public network, or only the cluster network depending on your requirements.

## Basic Network Selector Configuration

The minimal Multus configuration specifying both networks:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
      cluster: rook-ceph/rook-cluster-network
```

The selector format is `<namespace>/<nad-name>`. The namespace is almost always `rook-ceph` (where the NADs are created), and the NAD name must exactly match a NetworkAttachmentDefinition in that namespace.

## Public Network Only Configuration

If you only want to isolate client-facing traffic without separating OSD replication:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
```

In this case, OSD replication traffic uses the same public Multus network rather than a separate cluster network.

## Cluster Network Only Configuration

To separate only OSD replication traffic (less common):

```yaml
spec:
  network:
    provider: multus
    selectors:
      cluster: rook-ceph/rook-cluster-network
```

## Verifying Selector Configuration

After applying the CephCluster configuration, verify Rook is using the correct NADs:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph \
  -o jsonpath='{.spec.network}' | python3 -m json.tool
```

```json
{
  "provider": "multus",
  "selectors": {
    "public": "rook-ceph/rook-public-network",
    "cluster": "rook-ceph/rook-cluster-network"
  }
}
```

Check that Ceph pods have Multus annotations:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-osd \
  -o jsonpath='{.items[0].metadata.annotations}' | \
  python3 -m json.tool | grep -A 2 "cni.cncf.io"
```

```json
{
  "k8s.v1.cni.cncf.io/networks": "rook-ceph/rook-public-network, rook-ceph/rook-cluster-network"
}
```

## Checking Network Interface Assignment

After pods are running, verify the secondary network interfaces are attached:

```bash
OSD_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-osd -o name | head -1)
kubectl -n rook-ceph exec $OSD_POD -- ip addr show
```

You should see additional interfaces (typically `net1`, `net2`) beyond the primary `eth0`:

```text
1: lo: <LOOPBACK,UP,LOWER_UP> ...
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
    inet 10.244.0.5/24
3: net1: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
    inet 192.168.100.15/24
4: net2: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
    inet 192.168.200.20/24
```

## Verifying Ceph Uses the Correct IPs

Check that Ceph is binding to the Multus network IPs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump
```

Monitor addresses should show the public network IPs (192.168.100.x), not the Kubernetes pod network IPs:

```text
0: [v2:192.168.100.10:3300/0,v1:192.168.100.10:6789/0] mon.a
1: [v2:192.168.100.11:3300/0,v1:192.168.100.11:6789/0] mon.b
2: [v2:192.168.100.12:3300/0,v1:192.168.100.12:6789/0] mon.c
```

If monitors show pod network IPs instead, the network selector configuration is not being applied correctly.

## Troubleshooting Selector Issues

Common problems with network selectors:

**NAD not found:** The selector references a NAD that does not exist in the specified namespace.

```bash
kubectl -n rook-ceph get network-attachment-definition
```

**Wrong namespace in selector:** Verify the namespace prefix matches where the NAD lives.

**Multus not installed:** Verify the Multus DaemonSet is running:

```bash
kubectl -n kube-system get pods -l app=multus
```

## Summary

Multus network selectors in Rook are configured under `spec.network.selectors` in the CephCluster CR, using the format `<namespace>/<nad-name>` to reference NetworkAttachmentDefinitions. Configure both `public` and `cluster` selectors to fully separate Ceph networking from the Kubernetes pod network. Verify the configuration by checking pod Multus annotations, inspecting network interfaces inside OSD pods, and confirming that Ceph monitor addresses use the dedicated network IPs rather than pod network addresses.
