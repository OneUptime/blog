# How to Understand CephX Authentication Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Authentication, Security, Protocol

Description: Learn how the CephX mutual authentication protocol works in Ceph clusters, including ticket exchange, key structure, and how Rook manages CephX credentials.

---

CephX is Ceph's built-in authentication protocol, similar in concept to Kerberos. It provides mutual authentication between clients and Ceph daemons, ensuring that only authorized entities can access the cluster. Understanding CephX is fundamental to securing and troubleshooting Ceph deployments.

## How CephX Works

CephX uses a shared-secret system with the following actors:

- **Monitor** - acts as the authentication server (like a KDC)
- **Client** - any entity accessing Ceph (application, OSD, MDS)
- **Daemon** - OSDs, MDS, RGW that the client wants to communicate with

The authentication flow:
1. Client sends an authentication request to the monitor
2. Monitor verifies the client's secret key
3. Monitor issues a session ticket encrypted with the daemon's key
4. Client presents the ticket to the daemon
5. Daemon decrypts the ticket using its shared key with the monitor

## Key Structure in CephX

Each entity in Ceph has a keyring file. View a key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.admin
```

Output format:
```plaintext
[client.admin]
    key = AQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==
    caps mds = "allow *"
    caps mgr = "allow *"
    caps mon = "allow *"
    caps osd = "allow *"
```

## Capability System

CephX capabilities control what authenticated entities can do. Common capability strings:

```bash
# Read-only access to a specific pool
"allow r pool=mypool"

# Read-write access to all pools
"allow rw"

# Full access
"allow *"

# OSD-specific capabilities
"allow class-read object_prefix rbd_children"
```

## View All CephX Keys

List all existing authentication entries:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth ls
```

## How Rook Manages CephX Keys

Rook automatically creates and manages CephX keys for all Ceph components. Keys are stored as Kubernetes Secrets:

```bash
kubectl -n rook-ceph get secrets | grep ceph
```

View the admin key secret:

```bash
kubectl -n rook-ceph get secret rook-ceph-admin-keyring -o jsonpath='{.data.keyring}' | \
  base64 -d
```

## Verify Authentication is Working

Check if a client can authenticate:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -n client.admin --keyring=/etc/ceph/keyring auth get client.admin
```

## Summary

CephX provides mutual authentication using shared secrets and a ticket-based system where the monitor acts as the authentication authority. Every Ceph entity - clients, OSDs, MDS, and RGW - has its own keyring with capability strings that define permitted operations. Rook manages these keys automatically as Kubernetes Secrets, but understanding the underlying protocol is essential for debugging authentication failures and designing secure access policies.
