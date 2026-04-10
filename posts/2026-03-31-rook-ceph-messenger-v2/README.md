# How to Set Up Messenger v2 Protocol in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Messenger, Security, Network, Protocol

Description: Learn how to configure Ceph's Messenger v2 (msgr2) protocol for improved security with encryption and compression, and how to migrate from v1.

---

## What Is Messenger v2

Messenger v2 (msgr2) is the second generation network protocol for Ceph, introduced in Ceph Nautilus. It provides:
- **Better security**: Optional encryption of all wire traffic using AES-GCM
- **Authentication improvements**: Auth before payload, preventing data injection
- **Compression**: Optional on-wire compression to reduce bandwidth usage
- **Better performance**: Improved framing and connection handling

The previous msgr1 protocol lacked wire encryption and had authentication timing vulnerabilities. Ceph Quincy and later deprecate msgr1 and recommend msgr2.

## Checking Current Protocol

Monitor addresses show which protocols are advertised:

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- ceph mon dump
```

Msgr2-capable monitors show v2 addresses alongside v1:

```text
mon.a
  addrs: [v2:192.168.1.10:3300/0,v1:192.168.1.10:6789/0]
```

Port 3300 is the msgr2 port; port 6789 is the legacy msgr1 port.

## Enabling Msgr2 in Rook

In the CephCluster CRD, enable the msgr2 protocol:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    connections:
      encryption:
        enabled: true
      compression:
        enabled: false
      requireMsgr2: true
```

Setting `requireMsgr2: true` forces all connections to use msgr2 and disables fallback to v1.

## Configuring Msgr2 via ceph.conf

```ini
[global]
; Enable msgr2 binding on port 3300
ms_bind_msgr2 = true

; Enable msgr1 binding (set false to disable legacy)
ms_bind_msgr1 = true

; Enable encryption on msgr2 connections
ms_cluster_mode = secure
ms_service_mode = secure
ms_client_mode = secure
```

Mode options:
- `crc` - CRC checksum only (no encryption, fastest)
- `secure` - AES-128-GCM encrypted (more CPU, more secure)

## Enforcing Secure Mode

Require encryption for all connections:

```bash
# Require secure mode for all connections
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
ceph config set global ms_client_mode secure

# Verify settings
ceph config get mon ms_cluster_mode
```

## Requiring Msgr2 Only

After all clients support msgr2, disable msgr1 to prevent fallback:

```bash
# Disable msgr1
ceph config set global ms_bind_msgr1 false

# Or per daemon type
ceph config set mon ms_bind_msgr1 false
ceph config set osd ms_bind_msgr1 false
```

Check that no clients are still using msgr1:

```bash
ceph tell mon.* sessions | grep v1
```

## Compression Configuration

Enable compression on the cluster network to save bandwidth:

```bash
# Enable compression for OSD cluster traffic when encryption is also enabled
ceph config set osd ms_compress_secure true

# Enable compression mode for OSD messenger (none, force)
ceph config set osd ms_osd_compress_mode force
```

## Verifying Msgr2 Connections

```bash
# Check messenger stats on a running OSD
kubectl exec -it rook-ceph-tools -n rook-ceph -- \
  ceph tell osd.0 perf dump | python3 -m json.tool | grep -A 5 msgr

# Monitor connection types
ceph -w | grep msgr
```

## Summary

Messenger v2 provides significant security and protocol improvements over the legacy msgr1 protocol. Enabling msgr2 with `secure` mode encrypts all Ceph wire traffic using AES-GCM, protecting data in transit on untrusted networks. Rook supports msgr2 configuration through the CephCluster CRD's `network.connections` spec. For new deployments, enable msgr2 from the start. For existing clusters, migrate gradually by advertising both protocols, then disabling msgr1 once all clients are updated.
