# How to Configure OSD Topology Labels (Region, Zone, Rack) in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, Topology, CRUSH

Description: Apply region, zone, and rack topology labels to Kubernetes nodes so Rook places Ceph OSDs into the correct CRUSH buckets for fault-domain-aware data replication.

---

## Why Topology Labels Drive OSD Placement

Ceph's CRUSH algorithm replicates data across failure domains. For CRUSH to spread replicas across zones or racks, it must know which failure domain each OSD belongs to. Rook reads Kubernetes node labels and automatically creates corresponding CRUSH buckets - no manual CRUSH map editing required.

## Applying Topology Labels to Nodes

Use the standard Kubernetes topology labels:

```bash
# Region labels
kubectl label node worker-1 topology.kubernetes.io/region=us-east-1
kubectl label node worker-2 topology.kubernetes.io/region=us-east-1
kubectl label node worker-3 topology.kubernetes.io/region=us-east-1

# Zone labels
kubectl label node worker-1 topology.kubernetes.io/zone=us-east-1a
kubectl label node worker-2 topology.kubernetes.io/zone=us-east-1b
kubectl label node worker-3 topology.kubernetes.io/zone=us-east-1c
```

For on-premises clusters, use rack and chassis labels:

```bash
kubectl label node worker-1 topology.rook.io/rack=rack-01
kubectl label node worker-2 topology.rook.io/rack=rack-02
kubectl label node worker-3 topology.rook.io/rack=rack-03
```

## Enabling Topology-Based Placement in CephCluster

Configure the `CephCluster` to use node topology labels for OSD placement:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
    config:
      osdsPerDevice: "1"
  placement:
    osd:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: rook-ceph-osd
```

## Customizing the Topology Key Priority

Rook uses a predefined list of topology keys in priority order. Nodes are placed into CRUSH buckets from broadest to narrowest. The default priority is:

```text
1. topology.kubernetes.io/region
2. topology.kubernetes.io/zone
3. topology.rook.io/datacenter
4. topology.rook.io/room
5. topology.rook.io/pod
6. topology.rook.io/pdu
7. topology.rook.io/row
8. topology.rook.io/rack
9. topology.rook.io/chassis
10. kubernetes.io/hostname (always last)
```

Rook automatically creates CRUSH buckets for whichever labels in this list are present on your nodes - only apply the labels that match your infrastructure.

To configure which topology labels the CSI driver uses for volume provisioning, set `CSI_TOPOLOGY_DOMAIN_LABELS` in the operator ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_TOPOLOGY_DOMAIN_LABELS: "topology.kubernetes.io/region,topology.kubernetes.io/zone,topology.rook.io/rack"
```

## Verifying CRUSH Bucket Creation

After OSDs are provisioned, inspect the CRUSH hierarchy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Correctly labeled nodes produce a hierarchy like:

```text
-1        300.000 root default
-10        100.000     region us-east-1
-11         33.333         zone us-east-1a
 -5         33.333             host worker-1
  0   hdd   33.333                 osd.0
-12         33.333         zone us-east-1b
 -6         33.333             host worker-2
  1   hdd   33.333                 osd.1
-13         33.333         zone us-east-1c
 -7         33.333             host worker-3
  2   hdd   33.333                 osd.2
```

## Creating Zone-Aware Pools

Once OSDs are in zone buckets, create pools with zone-level failure domains:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated zone-rule default zone
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create zone-aware-pool 32 replicated zone-rule
```

## Summary

Topology labels on Kubernetes nodes drive CRUSH bucket assignment in Rook-Ceph. By labeling nodes with region, zone, and rack labels before deploying the cluster, you ensure OSDs land in the correct CRUSH buckets automatically. This enables zone-aware replication rules that guarantee data replicas span failure domains for genuine fault tolerance.
