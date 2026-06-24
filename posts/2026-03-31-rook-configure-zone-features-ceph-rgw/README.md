# How to Configure Zone Features in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Zone, Multisite, Object Storage

Description: Learn how to configure zone features in Ceph RGW to enable or disable specific capabilities like compression, encryption, and sync features per zone.

---

## Overview

Ceph RGW zones support a set of optional features that can be enabled or disabled independently. Zone features control whether a zone participates in specific data operations like resharding, multi-factor authentication deletion, and more. Understanding and configuring these features ensures your zones operate with the correct capabilities for your use case.

## Available Zone Features

Ceph RGW zones support these features (as of Ceph Reef):

- `resharding` - allows bucket resharding operations in the zone
- `compress-encrypted` - enables combining server-side encryption and compression on the same object
- `notification_v2` - enables v2 metadata format for bucket notifications and topics with multisite replication support

## Checking Current Zone Features

```bash
# Show zonegroup details including features
radosgw-admin zonegroup get --rgw-zonegroup=us

# Output includes features at the zonegroup and zone level:
# "enabled_features": ["resharding"],
# "zones": [{ "name": "us-east", "supported_features": ["resharding"] }]
```

## Enabling Zone Features

```bash
# Enable resharding on a zone
radosgw-admin zone modify \
  --rgw-zone=us-east \
  --enable-feature=resharding

# Enable multiple features (use separate flags for each)
radosgw-admin zone modify \
  --rgw-zone=us-east \
  --enable-feature=resharding \
  --enable-feature=compress-encrypted

# Commit the zone update
radosgw-admin period update --commit
```

## Disabling Zone Features

```bash
# Disable a feature
radosgw-admin zone modify \
  --rgw-zone=us-east \
  --disable-feature=resharding

# Commit
radosgw-admin period update --commit
```

## Zone Group Features

Zone group features aggregate zone capabilities. Check zone group features:

```bash
# Get zone group configuration
radosgw-admin zonegroup get --rgw-zonegroup=us

# Modify zone group features
radosgw-admin zonegroup modify \
  --rgw-zonegroup=us \
  --enable-feature=resharding
```

## Rook: Configuring Zone Features

In Rook, configure zone features in the `CephObjectZone` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  zoneGroup: us
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  customEndpoints:
    - http://rgw.us-east.example.com:80
```

For feature configuration, use the Rook toolbox to run `radosgw-admin` commands directly:

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin zone modify \
    --rgw-zone=us-east \
    --enable-feature=resharding

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin period update --commit
```

## Verifying Feature Configuration

After enabling features, verify they appear in the zonegroup configuration:

```bash
radosgw-admin zonegroup get --rgw-zonegroup=us | \
  jq '{enabled_features, zones: [.zones[] | {name, supported_features}]}'
```

Restart RGW daemons after modifying zone features to ensure they pick up the new configuration:

```bash
# In Rook
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store
```

## Summary

Zone features in Ceph RGW control optional capabilities available to each zone, including resharding and compression support. Use `radosgw-admin zone modify` to enable or disable features, followed by `period update --commit` to propagate changes. In Rook, use the toolbox for zone feature commands and restart RGW deployments after changes.
