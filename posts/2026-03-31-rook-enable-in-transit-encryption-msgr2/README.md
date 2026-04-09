# How to Enable In-Transit Encryption with Msgr2 in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Msgr2, Security, Kubernetes

Description: Learn how to enable Msgr2 in-transit encryption in Ceph to protect data moving between clients and daemons from eavesdropping and tampering.

---

Ceph Messenger v2 (Msgr2) is the modern wire protocol for Ceph that supports encryption of data in transit. Enabling Msgr2 encryption ensures that all communication between Ceph clients, OSDs, Monitors, and MDSs is protected against interception.

## What is Msgr2?

Msgr2 (introduced in Nautilus) replaces the older Msgr1 protocol with:
- Support for encryption (using AES-GCM)
- A cleaner connection setup handshake
- Better multiplexing of connections

Msgr2 operates in two modes:
- `crc` - Integrity checking only (no encryption, but header/payload checksums)
- `secure` - Full AES-GCM encryption of all messages

## Checking Current Messenger Protocol

```bash
# Verify which messenger version daemons use
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon ms_bind_msgr2

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon ms_cluster_mode
```

## Enabling Msgr2 Encryption

Configure the cluster to use Msgr2 in secure mode via the Rook ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    # Enable Msgr2 binding on port 3300
    ms_bind_msgr2 = true
    # Set encryption mode for cluster-internal traffic
    ms_cluster_mode = secure
    # Set encryption mode for client-to-service traffic
    ms_service_mode = secure
    # Disable legacy Msgr1 to force encrypted connections
    ms_bind_msgr1 = false
```

Apply and restart daemons:

```bash
kubectl apply -f rook-config-override.yaml

# Restart monitors first, then OSDs
kubectl -n rook-ceph rollout restart deployment -l app=rook-ceph-mon
kubectl -n rook-ceph rollout restart deployment -l app=rook-ceph-osd
```

## Verifying Encryption is Active

After restart, verify connections are using secure mode:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mon.a config show | grep ms_

# Check active connections
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | grep msgr
```

Also inspect the cluster connectivity status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep -i "mon\|osd"
```

## Configuring Client-Side Msgr2

Clients connecting to the cluster also need Msgr2 configured. For RBD or CephFS clients in pods, mount the ConfigMap with the correct settings:

```ini
# Client config (for apps using librados)
[client]
ms_bind_msgr2 = true
ms_client_mode = secure
```

For Kubernetes CSI drivers managed by Rook, the operator automatically handles client-side configuration when the cluster is set to Msgr2 mode.

## Performance Considerations

AES-GCM encryption is hardware-accelerated on modern CPUs (AES-NI). Verify support:

```bash
# Check for AES-NI support on a node
kubectl debug node/<node-name> -it --image=busybox -- \
  grep aes /proc/cpuinfo | head -1
```

On CPUs without AES-NI, the performance overhead can be 15-30%. Benchmark before enabling in production:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p mypool 30 write --no-cleanup
```

## Summary

Msgr2 encryption in Ceph provides AES-GCM-based in-transit encryption for all cluster communications. It is enabled by setting `ms_cluster_mode` and `ms_service_mode` to `secure` in the Rook ConfigMap override and optionally disabling the legacy Msgr1 port. Verify activation by inspecting daemon configuration and checking cluster status after rolling restarts of monitors and OSDs.
