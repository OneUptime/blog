# How to Set Mon IP Annotations with Multus in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Multus, Annotation

Description: Learn how to use Rook's mon IP annotations to specify which Multus network interface addresses Ceph monitors should advertise for cluster communication.

---

When using Multus with Rook-Ceph, the Multus network attachment definition (NAD) is attached to monitor pods, allowing them to communicate with other Ceph daemons over the dedicated storage network. However, monitors have a specific networking behavior with Multus: they continue to use Kubernetes Service ClusterIPs for their advertised endpoints while using the Multus interface for outbound cluster communication.

## The Problem with Multi-Network Pods

When a pod has multiple network interfaces (primary Kubernetes network + Multus secondary network), it is important to understand which IP each daemon advertises. With Rook's Multus support, daemons that rely on Kubernetes Service IPs - including monitors, managers, and Rados Gateways - do not listen on the Multus NAD interface. Instead, they listen on the default pod network and are accessed via Service ClusterIPs. The Multus NAD is attached to the pod so the daemon can communicate with other daemons (like OSDs) over the storage network.

This is documented in the Rook network providers documentation:

> "Daemons leveraging Kubernetes service IPs (Monitors, Managers, Rados Gateways) are not listening on the NAD specified in the selectors. Instead the daemon listens on the default network, however the NAD is attached to the container, allowing the daemon to communicate with the rest of the cluster."

Check what IPs your monitors are currently using:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump
```

```text
0: [v2:10.96.0.15:3300/0,v1:10.96.0.15:6789/0] mon.a
```

With Multus, you will see Kubernetes Service ClusterIPs (e.g., `10.96.x.x`) in the monitor map. This is expected - monitors are reached via Service IPs while they use the Multus interface for outbound communication to OSDs and other daemons.

## Configuring Multus in the CephCluster Spec

To enable Multus networking in Rook, configure the network section of the CephCluster spec with the Multus network attachment definitions:

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
  mon:
    count: 3
```

The `public` selector specifies the NAD for client-facing traffic, and the `cluster` selector specifies the NAD for internal Ceph replication traffic. Rook attaches these network interfaces to all Ceph daemon pods, including monitors.

If you need monitors to bind to specific non-default IPs (with host networking, not Multus), you can use the `network.rook.io/mon-ip` annotation on Kubernetes nodes:

```bash
kubectl annotate node node-1 network.rook.io/mon-ip=192.168.100.10
```

This node annotation works with `provider: host` and tells the monitor running on that node which IP to bind to.

## Understanding the Mon Endpoints ConfigMap

Rook maintains a ConfigMap called `rook-ceph-mon-endpoints` that tracks monitor endpoint information. This ConfigMap is managed by the Rook operator and should not be manually edited under normal circumstances:

```bash
kubectl -n rook-ceph get configmap rook-ceph-mon-endpoints -o yaml
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-mon-endpoints
  namespace: rook-ceph
data:
  data: "a=10.96.0.10:6789,b=10.96.0.11:6789,c=10.96.0.12:6789"
  mapping: '{"node":{"a":{"Name":"node-1","Hostname":"node-1","Address":"10.0.0.1"},"b":{"Name":"node-2","Hostname":"node-2","Address":"10.0.0.2"},"c":{"Name":"node-3","Hostname":"node-3","Address":"10.0.0.3"}}}'
  maxMonId: "2"
```

The `data` field contains the monitor endpoints (Service ClusterIPs with Multus, or node IPs with host networking), and the `mapping` field maps each monitor to its node. The `Address` in the mapping refers to the node address, not the Multus IP. Do not manually edit this ConfigMap - the Rook operator manages it and manual changes may be overwritten or cause inconsistencies.

## Checking Multus Interfaces on Monitor Pods

To verify that the Multus network interface is properly attached to a monitor pod:

```bash
# Get the mon pod name
MON_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-mon,ceph_daemon_id=a -o name)

# Check that the Multus interface (typically net1) is present
kubectl -n rook-ceph exec $MON_POD -- ip addr show net1

# Get the Multus-assigned IP
MULTUS_IP=$(kubectl -n rook-ceph exec $MON_POD -- ip addr show net1 | \
  grep "inet " | awk '{print $2}' | cut -d'/' -f1)

echo "Mon-a Multus IP: $MULTUS_IP"
```

The Multus IP is used by the monitor for outbound communication to other Ceph daemons, even though the monitor's advertised endpoint in the mon map uses the Kubernetes Service ClusterIP.

## Verifying Monitor Addresses

After configuring Multus, verify the monitor map to see the endpoints monitors are advertising:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump
```

Expected output with Multus configured:

```text
epoch 12
fsid xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
min_mon_release 17 (quincy)
0: [v2:10.96.0.10:3300/0,v1:10.96.0.10:6789/0] mon.a
1: [v2:10.96.0.11:3300/0,v1:10.96.0.11:6789/0] mon.b
2: [v2:10.96.0.12:3300/0,v1:10.96.0.12:6789/0] mon.c
```

These are Kubernetes Service ClusterIPs. All pods within the Kubernetes cluster can reach monitors via these IPs. The Multus storage network is used for daemon-to-daemon communication (e.g., monitor to OSD).

## Handling Mon Pod Restarts

If a monitor pod needs to be restarted (for example, after a configuration change), you can delete the pod and the Rook operator will recreate it:

```bash
# Delete the mon pod - Rook will recreate it
kubectl -n rook-ceph delete pod $(kubectl -n rook-ceph get pod \
  -l app=rook-ceph-mon,ceph_daemon_id=a -o name | head -1 | xargs basename)

# Watch the new pod start
kubectl -n rook-ceph get pod -l app=rook-ceph-mon -w
```

After restart, verify the mon map is intact:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump | grep "mon.a"
```

## Configuring Ceph Client Access

With Multus configured cluster-wide, Rook automatically attaches the Multus network to all Ceph-related pods including the toolbox and CSI driver:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
```

Ceph clients connect to monitors via their Kubernetes Service ClusterIPs, so they do not need the Multus network specifically to reach monitors. However, the Multus network is needed for direct communication with OSDs, which is why the toolbox and CSI driver also get the Multus interface attached.

## Summary

When using Multus with Rook, monitors continue to use Kubernetes Service ClusterIPs for their advertised endpoints while the Multus network interface is attached for outbound communication with other Ceph daemons like OSDs. The `rook-ceph-mon-endpoints` ConfigMap tracks monitor endpoints and is managed by the Rook operator. To verify the setup, use `ceph mon dump` to check monitor addresses and `ip addr show net1` to confirm Multus interfaces are attached to monitor pods. If you need monitors to bind to specific network IPs instead of Service ClusterIPs, consider using host networking with the `network.rook.io/mon-ip` node annotation.
