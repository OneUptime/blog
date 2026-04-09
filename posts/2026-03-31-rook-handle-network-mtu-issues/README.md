# How to Handle Network MTU Issues in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MTU, Networking, Performance, Troubleshooting, Kubernetes

Description: Diagnose and fix MTU mismatches in Rook-Ceph clusters that cause packet fragmentation, slow I/O, and intermittent connectivity failures between Ceph components.

---

## Overview

MTU (Maximum Transmission Unit) mismatches are a subtle but common cause of poor Ceph performance and intermittent failures. When the MTU configured for Kubernetes pods does not match the underlying network infrastructure, large packets get fragmented or dropped, causing slowdowns.

## Symptoms of MTU Issues

- Slow Ceph I/O with small operations performing fine but large transfers degrading
- `SLOW_OPS` warnings in `ceph health detail`
- OSD connectivity issues showing intermittently
- `ceph -w` showing ops getting stuck at 15-30 seconds

## Step 1: Identify Current MTU Settings

Check MTU on the host network interface:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host ip link show eth0
```

Check MTU inside a Ceph pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ip link show eth0
```

Check the CNI-configured MTU (example for Flannel):

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg -o yaml | grep -i mtu
```

Or inspect the CNI config on a node:

```bash
kubectl debug node/worker-1 -it --image=busybox -- \
  chroot /host cat /etc/cni/net.d/*.conflist | grep -i mtu
```

## Step 2: Test for MTU Problems

Test with the `ping` command using different packet sizes:

```bash
# Test from tools pod to monitor pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ping -M do -s 1472 <mon-pod-ip>

# If this fails but smaller sizes work, MTU is the issue
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ping -M do -s 1400 <mon-pod-ip>
```

Test TCP with large payloads:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  iperf3 -c <osd-pod-ip> -l 8k
```

## Step 3: Fix CNI MTU Configuration

For Calico CNI, set the MTU in the FelixConfiguration (use the field matching your tunnel type):

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  vxlanMTU: 1450
  ipipMTU: 1450
```

For Flannel, update the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "MTU": 1450
      }
    }
```

For Cilium:

```bash
helm upgrade cilium cilium/cilium --set routingMode=tunnel --set tunnelProtocol=vxlan --set MTU=1450
```

## Step 4: Configure Rook-Ceph Network MTU

If using host networking, ensure physical NICs have jumbo frames enabled if the network supports it:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host ip link set eth0 mtu 9000
```

Make persistent:

```bash
# In /etc/systemd/network/10-eth0.network
[Link]
MTUBytes=9000
```

## Step 5: Calculate Correct Overlay MTU

For VXLAN overlay networks, MTU should be:
- Physical MTU: 1500
- VXLAN overhead: 50 bytes
- Pod MTU: 1450

For IP-in-IP (Calico):
- Physical MTU: 1500
- IP-in-IP overhead: 20 bytes
- Pod MTU: 1480

```bash
# Verify with path MTU discovery
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  tracepath <osd-pod-ip>
```

## Summary

MTU mismatches in Rook-Ceph cause fragmentation that manifests as slow I/O and intermittent timeouts. Diagnose by testing ping with `do not fragment` flag at varying sizes. Fix by aligning the CNI MTU to physical MTU minus overlay overhead, ensuring consistent settings across all nodes and the overlay network.
