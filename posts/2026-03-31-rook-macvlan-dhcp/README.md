# How to Configure Macvlan with DHCP for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Macvlan, DHCP, Networking

Description: Configure Macvlan NetworkAttachmentDefinitions with DHCP-based IPAM for Rook-Ceph when you have an existing DHCP server on the storage network.

---

When your storage network already has a DHCP server managing IP allocation, using DHCP-based IPAM for Rook-Ceph's Multus NADs is simpler than deploying Whereabouts. This approach delegates IP management to your existing infrastructure, but requires careful planning to ensure Ceph daemons receive consistent IPs after pod restarts.

## Considerations Before Using DHCP

DHCP is convenient but has trade-offs for Ceph:
- **IP consistency:** Ceph monitors must have stable, predictable IPs. If a mon pod gets a different IP after restart, it breaks the monitor map and can cause quorum loss.
- **DHCP reservations:** For monitors especially, configure DHCP reservations based on MAC address to ensure consistent IPs.
- **DHCP daemon requirement:** The CNI DHCP plugin requires a DHCP daemon running on each node.

For OSDs (which do not require static IPs in the same way monitors do), DHCP is more suitable.

## Setting Up the DHCP CNI Daemon

The DHCP IPAM plugin requires a DHCP daemon running as a DaemonSet on all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: dhcp-cni-daemon
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: dhcp-cni-daemon
  template:
    metadata:
      labels:
        app: dhcp-cni-daemon
    spec:
      hostPID: true
      hostNetwork: true
      tolerations:
      - operator: Exists
      volumes:
      - name: cni-bin
        hostPath:
          path: /opt/cni/bin
      - name: cni-socket
        hostPath:
          path: /run/cni
      initContainers:
      - name: install-cni
        image: ghcr.io/k8snetworkplumbingwg/cni-plugins:latest
        command: ["/bin/sh", "-c", "cp /usr/bin/dhcp /opt/cni/bin/dhcp"]
        volumeMounts:
        - name: cni-bin
          mountPath: /opt/cni/bin
      containers:
      - name: dhcp
        image: ghcr.io/k8snetworkplumbingwg/cni-plugins:latest
        command: ["/usr/bin/dhcp", "daemon"]
        volumeMounts:
        - name: cni-socket
          mountPath: /run/cni
```

Apply and verify:

```bash
kubectl apply -f dhcp-cni-daemon.yaml
kubectl -n kube-system rollout status daemonset dhcp-cni-daemon
```

## Creating Macvlan NAD with DHCP IPAM

Create the public network NAD using DHCP:

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
        "type": "dhcp"
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
        "type": "dhcp"
      }
    }
```

Apply both:

```bash
kubectl apply -f rook-public-network-dhcp.yaml
kubectl apply -f rook-cluster-network-dhcp.yaml
```

## Configuring DHCP Reservations for Monitors

The critical step for DHCP-based setups is reserving IPs for monitor pods. Get the MAC addresses of existing mon pods:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-mon \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'

# Get the Multus interface MAC from inside the pod
kubectl -n rook-ceph exec rook-ceph-mon-a-xxx -- \
  ip link show net1 | grep ether
```

```text
    link/ether 02:42:c0:a8:64:0a brd ff:ff:ff:ff:ff:ff
```

Configure your DHCP server to reserve specific IPs for these MAC addresses. The exact configuration depends on your DHCP server (ISC DHCP, dnsmasq, etc.):

**ISC DHCP example:**

```text
host rook-mon-a {
  hardware ethernet 02:42:c0:a8:64:0a;
  fixed-address 192.168.100.10;
}
```

## Testing the DHCP NAD

Test with a pod before configuring Rook:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dhcp-test
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
kubectl apply -f dhcp-test-pod.yaml

# Wait for pod to get IP
kubectl -n rook-ceph exec dhcp-test -- ip addr show net1
```

```text
3: net1: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.100.50/24 brd 192.168.100.255 scope global net1
```

Clean up:

```bash
kubectl -n rook-ceph delete pod dhcp-test
```

## Configuring Rook with DHCP NADs

Reference the NADs in the CephCluster:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network
      cluster: rook-ceph/rook-cluster-network
```

## Monitoring DHCP Lease Health

Monitor DHCP lease usage to ensure the pool does not exhaust:

```bash
# On your DHCP server
# ISC DHCP
cat /var/lib/dhcpd/dhcpd.leases | grep -c "binding state active"
```

Set up alerts when lease utilization exceeds 80%.

## Summary

Configuring Macvlan with DHCP for Rook-Ceph requires deploying the DHCP CNI daemon as a DaemonSet on all nodes, creating NADs with `"type": "dhcp"` in the IPAM configuration, and critically configuring DHCP reservations for monitor pods to ensure stable IPs across pod restarts. DHCP is suitable for OSD pods where IP consistency is less critical, but monitor pods must have stable IPs to maintain a valid monitor map. Always test the NAD with a test pod before deploying Rook, and monitor DHCP lease pool utilization to prevent exhaustion.
