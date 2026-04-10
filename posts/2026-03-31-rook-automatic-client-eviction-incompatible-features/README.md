# How to Set Up Automatic Client Eviction for Incompatible Features in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Client, Eviction

Description: Learn how to configure automatic client eviction in CephFS to remove clients that lack required feature support, maintaining cluster stability.

---

## Overview

CephFS can automatically evict clients that do not support required features. This is important when you upgrade your cluster to use new MDS capabilities and need to ensure all connected clients are compatible. Without automatic eviction, incompatible clients may continue to hold sessions that block proper operation of newer features.

## Why Automatic Eviction Matters

When you add a required feature to a CephFS filesystem, existing connected clients are not immediately disconnected. They continue operating until they reconnect or are explicitly evicted. Automatic eviction ensures the cluster enforces feature requirements consistently without manual intervention.

## Enable Automatic Eviction

The `session_timeout` setting controls how long the MDS waits before marking a client session as stale. When you add required client features (see next section), the MDS automatically evicts clients that do not support those features:

```bash
# Set the client session timeout (seconds before a client session is marked stale)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs session_timeout 60
```

## Configure Required Features First

Before enabling automatic eviction, define which features clients must support:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs required_client_features cephfs add reply_encoding

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs required_client_features cephfs add lazy_caps_wanted
```

## Verify Current Client Feature Support

Check which clients are connected and their supported features:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 session ls | jq '.[] | {id, inst, state, features}'
```

Clients that do not list required features in their `features` bitmask will be candidates for eviction.

## Manually Evict a Specific Client

You can evict a specific client by session ID:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 client evict id=<session_id>
```

## Monitor Eviction Events

Eviction events are logged in the MDS logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds,rook_file_system=cephfs \
  --tail=100 | grep -i evict
```

## Set Minimum Compatible Client Version

Rather than managing individual features, you can enforce a minimum Ceph client release:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs min_compat_client nautilus
```

This automatically maps to the appropriate feature bitmask for that release.

## Summary

Automatic client eviction in CephFS ensures that as you require new features on your filesystem, incompatible clients are cleanly removed rather than left in limbo. By combining `required_client_features` with `min_compat_client`, you can maintain a consistent compatibility baseline in your Rook-Ceph cluster while minimizing manual intervention during upgrades.
