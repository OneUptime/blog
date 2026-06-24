# How to View Quota Settings and Update Stats in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Quota, Statistics, Object Storage, Administration, Monitoring

Description: View quota settings and synchronize usage statistics in Ceph RGW to ensure accurate quota enforcement and reporting across users and buckets.

---

Ceph RGW updates quota statistics asynchronously, which means `user stats` may lag behind the actual current usage. To get the latest quota usage numbers, run `user stats` with `--sync-stats` before reading them. This guide covers how to view quota settings and update stats effectively.

## Why Stats Need to Be Synced

Quota stats are updated asynchronously. The documented way to refresh the latest user quota usage is to run `radosgw-admin user stats --uid <uid> --sync-stats` before reading `user stats` output. Ceph also caches quota statistics on each RGW instance, so quota enforcement across multiple gateways is not perfectly synchronized unless those cache and sync intervals are tuned.

## Viewing User Quota and Current Stats

Always sync before viewing to get accurate numbers:

```bash
# Sync and view current user usage
radosgw-admin user stats --uid alice --sync-stats

# View configured quota settings
radosgw-admin user info --uid alice
```

Look for the `stats` section in `user stats` output:

```json
{
  "stats": {
    "size": 5368709120,
    "size_actual": 5368709120,
    "num_objects": 45000
  }
}
```

Look for the `user_quota` section in `user info` output:

```json
{
  "user_id": "alice",
  "user_quota": {
    "enabled": true,
    "max_size_kb": 10485760,
    "max_objects": 1000000
  }
}
```

## Viewing Bucket Quota and Stats

```bash
# View bucket stats
radosgw-admin bucket stats --bucket mybucket

# View the bucket quota configured for buckets owned by alice
radosgw-admin user info --uid alice | jq '.bucket_quota'
```

Unlike `user stats`, the documented `--sync-stats` flag does not apply to `bucket stats`. The `bucket sync enable` and `bucket sync disable` commands are multisite sync controls, not usage refresh commands.

## Getting Quota Settings Only

```bash
# User quota settings
radosgw-admin user info --uid alice | jq '.user_quota'

# Bucket quota settings for buckets owned by the user
radosgw-admin user info --uid alice | jq '.bucket_quota'
```

## Syncing Stats for All Buckets of a User

```bash
# Refresh the user's quota stats from the current bucket indexes
radosgw-admin user stats --uid alice --sync-stats
```

## Global Stats Sync

To refresh quota stats for all users:

```bash
radosgw-admin user list | jq -r '.[]' | while read -r USER_ID; do
  radosgw-admin user stats --uid "$USER_ID" --sync-stats
done
```

## Monitoring Quota Usage Percentage

A script to check quota utilization:

```bash
#!/bin/bash
USER_ID=$1
STATS=$(radosgw-admin user stats --uid "$USER_ID" --sync-stats)
USED=$(echo "$STATS" | jq -r '.stats.size // 0')
MAX_KB=$(radosgw-admin user info --uid "$USER_ID" | jq -r '.user_quota.max_size_kb // -1')

if [ "$MAX_KB" != "-1" ] && [ "$MAX_KB" -gt 0 ]; then
  MAX=$((MAX_KB * 1024))
  PERCENT=$(echo "scale=1; $USED * 100 / $MAX" | bc)
  echo "User $USER_ID: ${PERCENT}% of quota used ($USED / $MAX bytes)"
else
  echo "User $USER_ID: no quota limit set"
fi
```

## Summary

Accurate quota and usage reporting in Ceph RGW requires syncing `user stats` with `--sync-stats` before reading them, since RGW updates quota stats asynchronously. Use `user info` for the configured limits and `user stats` or `bucket stats` for current consumption. Build periodic stat-sync jobs to keep user quota reporting current and reduce stale usage data.
