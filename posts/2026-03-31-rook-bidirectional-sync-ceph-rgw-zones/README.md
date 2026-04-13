# How to Set Up Bidirectional Sync Between Ceph RGW Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Sync, Multisite

Description: Learn how to configure bidirectional object replication between two Ceph RGW zones for active-active deployments with automatic conflict handling.

---

## Overview

Bidirectional sync in Ceph RGW enables active-active multisite deployments where writes to either zone are replicated to the other. This is useful for geographic redundancy and load distribution. Ceph handles write conflicts using a deterministic resolution strategy where, for non-versioned buckets, the most recently replicated update takes precedence, and for versioned buckets, conflicts are resolved using OLH (Object Logical Head) epochs.

## Step 1 - Set Up the Multisite Infrastructure

```bash
# Create the realm
radosgw-admin realm create --rgw-realm=bidir-realm --default

# Create the zonegroup
radosgw-admin zonegroup create \
  --rgw-zonegroup=bidir-group \
  --master --default

# Create the first (master) zone
radosgw-admin zone create \
  --rgw-zonegroup=bidir-group \
  --rgw-zone=zone-east \
  --master --default

# Create a system user for replication
radosgw-admin user create --uid=replication-user \
  --display-name="Replication User" --system
REPL_ACCESS=$(radosgw-admin user info --uid=replication-user | jq -r '.keys[0].access_key')
REPL_SECRET=$(radosgw-admin user info --uid=replication-user | jq -r '.keys[0].secret_key')

# Add the system user credentials to the master zone
radosgw-admin zone modify --rgw-zone=zone-east \
  --access-key="${REPL_ACCESS}" \
  --secret="${REPL_SECRET}"
radosgw-admin period update --commit
```

## Step 2 - Create the Second Zone

```bash
# Create the secondary zone on the second cluster
radosgw-admin zone create \
  --rgw-zonegroup=bidir-group \
  --rgw-zone=zone-west \
  --access-key="${REPL_ACCESS}" \
  --secret="${REPL_SECRET}"

# Update the period on the master zone
radosgw-admin period update --commit

# Pull the period on the secondary cluster
radosgw-admin period pull \
  --url=http://zone-east-rgw.example.com:7480 \
  --access-key="${REPL_ACCESS}" \
  --secret="${REPL_SECRET}"
```

## Step 3 - Configure Symmetrical Sync Policy

```bash
# Create a symmetrical bidirectional sync policy
radosgw-admin sync group create \
  --group-id=bidir-sync \
  --status=enabled

# Add symmetrical flow - data flows in both directions
radosgw-admin sync group flow create \
  --group-id=bidir-sync \
  --flow-id=east-west-bidir \
  --flow-type=symmetrical \
  --zones=zone-east,zone-west

# Create a pipe that allows all buckets to sync in both directions
radosgw-admin sync group pipe create \
  --group-id=bidir-sync \
  --pipe-id=all-buckets \
  --source-zones='*' \
  --dest-zones='*'

radosgw-admin period update --commit
```

## Step 4 - Start RGW Instances on Both Zones

```bash
# Start RGW on zone-east (master cluster)
cat >> /etc/ceph/ceph.conf << 'EOF'
[client.rgw.zone-east]
rgw_frontends = beast port=7480
rgw_zone = zone-east
rgw_zonegroup = bidir-group
rgw_realm = bidir-realm
EOF

# Start RGW on zone-west (secondary cluster)
# First pull the realm configuration
radosgw-admin realm pull \
  --url=http://zone-east-rgw.example.com:7480 \
  --access-key="${REPL_ACCESS}" \
  --secret="${REPL_SECRET}" \
  --default

radosgw-admin period pull \
  --url=http://zone-east-rgw.example.com:7480 \
  --access-key="${REPL_ACCESS}" \
  --secret="${REPL_SECRET}"

cat >> /etc/ceph/ceph.conf << 'EOF'
[client.rgw.zone-west]
rgw_frontends = beast port=7480
rgw_zone = zone-west
rgw_zonegroup = bidir-group
rgw_realm = bidir-realm
EOF
```

## Step 5 - Test Bidirectional Replication

```bash
# Write to zone-east
aws --endpoint-url http://zone-east-rgw.example.com:7480 \
  s3 cp /tmp/test-east.txt s3://shared-bucket/test-east.txt

# Write to zone-west simultaneously
aws --endpoint-url http://zone-west-rgw.example.com:7480 \
  s3 cp /tmp/test-west.txt s3://shared-bucket/test-west.txt

# Wait for replication
sleep 30

# Verify test-east.txt is now on zone-west
aws --endpoint-url http://zone-west-rgw.example.com:7480 \
  s3 ls s3://shared-bucket/

# Verify test-west.txt is now on zone-east
aws --endpoint-url http://zone-east-rgw.example.com:7480 \
  s3 ls s3://shared-bucket/
```

## Step 6 - Monitor Bidirectional Sync Health

```bash
# Check sync status on each zone
for zone in zone-east zone-west; do
  echo "=== Sync status for ${zone} ==="
  radosgw-admin sync status --rgw-zone=${zone} 2>&1 | \
    grep -E "caught up|behind|error"
done

# Check for conflicts (objects written to both zones simultaneously)
radosgw-admin sync error list --max-entries=20 | \
  jq '.[] | select(.error_code == "ERR_CONFLICT")'

# Monitor via Prometheus (check data sync perf counters)
curl -s http://zone-east-rgw:9283/metrics | grep rgw_data_sync
curl -s http://zone-west-rgw:9283/metrics | grep rgw_data_sync
```

## Summary

Bidirectional sync in Ceph RGW uses symmetrical sync policy flows to replicate objects between zones in both directions. Setting up requires a shared realm and zonegroup, system user credentials for inter-zone authentication, and the `symmetrical` flow type in the sync policy. Ceph resolves write conflicts deterministically - for non-versioned buckets the most recently replicated write takes precedence, while versioned buckets use OLH epochs - making active-active deployments feasible for workloads that tolerate eventual consistency.
