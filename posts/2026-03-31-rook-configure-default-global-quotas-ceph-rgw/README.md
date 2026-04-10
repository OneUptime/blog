# How to Configure Default and Global Quotas in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Quota, Administration, Object Storage, Governance, Default

Description: Configure default and global quotas in Ceph RGW to automatically apply storage limits to all new users and buckets without setting them individually.

---

Managing quotas individually for each user is impractical at scale. Ceph RGW supports default quotas (applied automatically to new users) and global quotas (applied cluster-wide) to enforce storage limits without per-user configuration.

## Default User Quotas

Default user quotas are applied to every new user created after the default is set. Existing users are not affected.

Set default user quotas using RGW configuration options:

```bash
ceph config set client.rgw rgw_user_default_quota_max_size 53687091200
ceph config set client.rgw rgw_user_default_quota_max_objects 5000000
```

Default quotas are automatically enabled when max size or max objects is set to a non-negative value.

Verify the default quota configuration:

```bash
ceph config get client.rgw rgw_user_default_quota_max_size
ceph config get client.rgw rgw_user_default_quota_max_objects
```

## Testing Default Quota Application

Create a new user and verify the quota was applied automatically:

```bash
radosgw-admin user create \
  --uid newuser \
  --display-name "New User"

radosgw-admin quota get \
  --uid newuser \
  --quota-scope user
```

The new user should have the default quota pre-configured and enabled.

## Default Bucket Quotas

Set a default bucket quota (applied to every new bucket):

```bash
ceph config set client.rgw rgw_bucket_default_quota_max_size 10737418240
ceph config set client.rgw rgw_bucket_default_quota_max_objects 1000000
```

## Global Quotas via Configuration

For stricter cluster-wide enforcement, set global quota limits that act as hard caps for all users and buckets:

```bash
radosgw-admin global quota set --quota-scope user \
  --max-size 53687091200 --max-objects 5000000
radosgw-admin global quota enable --quota-scope user

radosgw-admin global quota set --quota-scope bucket \
  --max-size 10737418240 --max-objects 1000000
radosgw-admin global quota enable --quota-scope bucket

# In multisite deployments, commit the period update
radosgw-admin period update --commit
```

These act as hard caps that cannot be exceeded even if individual quotas are not set.

## Applying Default Quotas to Existing Users

Default quotas only apply to new users. To apply them to existing users in bulk:

```bash
#!/bin/bash
MAX_SIZE=53687091200
MAX_OBJECTS=5000000

radosgw-admin user list | jq -r '.[]' | while read UID; do
  # Check if user already has a quota set
  CURRENT=$(radosgw-admin quota get --uid "$UID" --quota-scope user | jq -r '.max_size')
  if [ "$CURRENT" = "-1" ]; then
    echo "Setting default quota for $UID"
    radosgw-admin quota set --uid "$UID" --quota-scope user \
      --max-size $MAX_SIZE --max-objects $MAX_OBJECTS
    radosgw-admin quota enable --uid "$UID" --quota-scope user
  fi
done
```

## Rook: Configuring Default Quotas

In Rook deployments, set defaults via the Ceph toolbox:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash -c '
  ceph config set client.rgw rgw_user_default_quota_max_size 53687091200 &&
  ceph config set client.rgw rgw_user_default_quota_max_objects 5000000'
```

## Summary

Default quotas in Ceph RGW automatically apply storage limits to new users and buckets without per-user configuration. Set them with `ceph config set` using the `rgw_user_default_quota_*` and `rgw_bucket_default_quota_*` options. For cluster-wide hard caps, use `radosgw-admin global quota`. For existing users, use a bulk script to apply quotas retroactively. This approach scales quota management across thousands of users without manual intervention.
