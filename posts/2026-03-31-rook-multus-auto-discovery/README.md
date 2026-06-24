# How to Use Multus Auto-Discovery with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multus, Auto-Discovery, Networking

Description: Learn how to enable and use Multus auto-discovery in Rook-Ceph to automatically detect correct network interfaces for Ceph traffic without manual NAD configuration.

---

When Rook-Ceph uses Multus for networking, it needs to know the CIDR ranges of the public and cluster networks so it can configure Ceph's `public_network` and `cluster_network` settings. Rook provides two approaches: automatic discovery using network canary pods, or manual specification using `addressRanges`.

## How Multus Networking Works in Rook

With Multus, you define NetworkAttachmentDefinitions (NADs) that describe the additional networks Ceph pods should attach to. In the CephCluster spec, you reference these NADs using `selectors`. Rook then needs to determine the CIDR ranges for these networks to configure Ceph properly.

**Auto-discovery (default):** When `addressRanges` is not specified, Rook automatically launches network canary pods attached to the Multus networks. These pods report back the assigned IPs and CIDRs, which Rook uses to configure Ceph's network settings.

**Manual ranges:** When `addressRanges` is specified, Rook skips auto-discovery and passes the provided CIDRs directly to Ceph's configuration.

Auto-discovery is useful when:
- You want Rook to determine the network CIDRs automatically
- The Multus networks are correctly configured and assign IPs as expected
- You prefer fewer manual configuration steps

## Configuring Multus with Auto-Discovery

To use auto-discovery, configure the CephCluster with Multus selectors but omit `addressRanges`. Rook will launch canary pods to discover the network CIDRs automatically:

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

Rook deploys temporary canary pods attached to the specified NADs, reads their assigned IPs from the `k8s.v1.cni.cncf.io/network-status` annotation, and uses the discovered CIDRs to set Ceph's `public_network` and `cluster_network` configuration.

## Using addressRanges to Skip Auto-Discovery

If you already know the network CIDRs, you can specify them manually with `addressRanges` to skip the canary pod auto-discovery step. Note that `selectors` are still required when using `provider: multus`:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
      cluster: rook-ceph/rook-cluster-network
    addressRanges:
      public:
      - 10.10.0.0/16
      cluster:
      - 10.20.0.0/16
```

The `addressRanges` CIDRs are passed directly to Ceph's `public_network` and `cluster_network` configuration. Ceph then binds to the interface that matches the specified ranges on each node. This is useful when auto-discovery is unreliable or you want deterministic configuration.

## Verifying Auto-Discovery Results

After applying the configuration, verify which interfaces Rook has selected:

```bash
# Check operator logs for interface discovery
kubectl -n rook-ceph logs -l app=rook-ceph-operator | grep -i "network\|interface\|discover"
```

Look for log entries related to network configuration, canary pod results, and Ceph network settings being applied.

Check that OSD pods have the correct network annotations:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-osd \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}{"\n"}{end}'
```

## Handling Heterogeneous Nodes

In clusters where different nodes are on different subnets, you can list multiple CIDR ranges in `addressRanges`. Ceph will match whichever range applies to each node:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
      cluster: rook-ceph/rook-cluster-network
    addressRanges:
      public:
      - 192.168.100.0/24
      - 192.168.101.0/24  # Additional subnet for some nodes
      cluster:
      - 192.168.200.0/24
```

Multiple CIDRs are combined into a comma-separated list in Ceph's `public_network` and `cluster_network` settings, so Ceph will bind to any matching interface.

## Checking Discovery Status on Nodes

Verify that nodes have the expected interfaces with IPs in the specified ranges:

```bash
for node in node-1 node-2 node-3; do
  echo "=== $node ==="
  ssh $node "ip addr | grep -E '192\.168\.(100|200)'"
done
```

```text
=== node-1 ===
    inet 192.168.100.10/24 brd 192.168.100.255 scope global eth1
    inet 192.168.200.10/24 brd 192.168.200.255 scope global eth2
=== node-2 ===
    inet 192.168.100.11/24 brd 192.168.100.255 scope global eth1
    inet 192.168.200.11/24 brd 192.168.200.255 scope global eth2
```

## Validating Network Connectivity

After auto-discovery configures the network, validate that Ceph daemons can communicate over the discovered interfaces:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Verify monitor addresses reflect the storage network IPs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump | grep "mon\."
```

If monitors show Kubernetes pod network IPs instead of storage network IPs, auto-discovery did not select the correct interfaces. Review the addressRanges configuration and verify the node interfaces have the expected IPs.

## Running the Multus Validation Tool

Rook includes a built-in Multus validation tool accessible via the `rook` CLI inside the operator pod. This validates that Multus networks are configured correctly:

```bash
# Exec into the Rook operator pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-operator -- rook multus validation run \
  --namespace rook-ceph
```

For more configuration options:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-operator -- rook multus validation run --help
```

## Summary

Rook-Ceph provides two approaches for determining network CIDRs when using Multus: automatic discovery via canary pods (the default when `addressRanges` is omitted) and manual specification using `addressRanges`. Both approaches require `selectors` referencing valid NetworkAttachmentDefinitions. When `addressRanges` is provided, the CIDRs are passed directly to Ceph's `public_network` and `cluster_network` configuration. Verify the setup by checking operator logs and confirming Ceph monitor addresses use the storage network IPs.
