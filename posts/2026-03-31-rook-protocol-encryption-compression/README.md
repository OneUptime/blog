# How to Track Protocol Encryption and Compression Status in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Compression, Network

Description: Monitor and configure Ceph Messenger v2 protocol encryption and compression settings for in-transit data protection in Rook-managed clusters.

---

Ceph Messenger v2 (msgr2) introduced support for protocol-level encryption and compression for data in transit between all Ceph daemons and clients. Configuring and verifying these settings ensures your cluster communications are secure and optionally compressed.

## Protocol Security Modes

Ceph msgr2 supports two security modes:

| Mode | Description |
|---|---|
| `crc` | CRC32C integrity checking only, no encryption |
| `secure` | AES-128-GCM encryption with integrity |

## Check Current Encryption Mode

For cluster-to-cluster (OSD-to-OSD, OSD-to-MON) traffic:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config get osd ms_cluster_mode
```

For client-to-cluster traffic:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config get osd ms_service_mode
```

## Enable Encryption for All Traffic

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Encrypt cluster traffic (OSD-OSD, OSD-MON)
  ceph config set global ms_cluster_mode secure

  # Encrypt client traffic
  ceph config set global ms_service_mode secure

  # Encrypt monitor traffic
  ceph config set global ms_mon_cluster_mode secure
"
```

Verify the change took effect:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph config get osd ms_cluster_mode
  ceph config get osd ms_service_mode
  ceph config get mon ms_mon_cluster_mode
"
```

## Configure via Rook ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    ms_cluster_mode = secure
    ms_service_mode = secure
    ms_mon_cluster_mode = secure
```

## Enable Protocol Compression

Msgr2 supports optional on-wire compression for OSD-to-OSD communication to reduce network bandwidth:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Enable compression for OSD-to-OSD traffic
  ceph config set osd ms_osd_compress_mode force

  # Set compression algorithm (snappy, zlib, zstd)
  ceph config set osd ms_osd_compression_algorithm snappy

  # Set minimum message size eligible for compression (default 1024)
  ceph config set osd ms_osd_compress_min_size 1024

  # Allow compression when encryption (secure mode) is also enabled
  ceph config set osd ms_compress_secure true
"
```

## Verify Connection Security at Runtime

Use `ceph tell` to query connection details from the tools pod:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 messenger dump
```

This returns a JSON structure under the `messenger` key showing all active connections, including the negotiated protocol mode (`con_mode`) and crypto details for each peer.

## Check Msgr2 Binding Status

Ensure all daemons are listening on msgr2 ports:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon dump | grep "v2:"
```

Addresses starting with `v2:` use the modern msgr2 protocol.

## Check OSD Msgr2 Addresses

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd dump | grep "osd.0" | grep -o "v2:[0-9.]*:[0-9]*"
```

## Impact on Performance

Encryption adds CPU overhead (typically 5-15% depending on hardware). Modern x86-64 processors support AES-NI hardware acceleration, which minimizes this overhead. Verify AES-NI availability:

```bash
grep -o 'aes' /proc/cpuinfo | head -1 && echo "AES-NI supported"
```

## Summary

Ceph msgr2 protocol encryption is configured via `ms_cluster_mode`, `ms_service_mode`, and `ms_mon_cluster_mode` settings. Set these to `secure` for AES-128-GCM encryption of all inter-daemon and client traffic. Configure persistent settings in Rook via the `rook-config-override` ConfigMap. Verify active connection modes using admin socket `dump_connections` and confirm that all daemons advertise v2 addresses in `ceph mon dump` and `ceph osd dump`.
