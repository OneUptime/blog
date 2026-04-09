# How to Enable and Disable Quotas in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Quota, Administration, Object Storage, Governance

Description: Learn how to enable and disable user and bucket quotas in Ceph RGW without losing quota settings, and understand the difference between setting and enabling quotas.

---

In Ceph RGW, quota enforcement has two independent aspects: the quota configuration (size and object limits) and whether the quota is actively enforced. You can set quota values without enforcing them (useful for pre-staging limits), and toggle enforcement on or off without losing the configured values.

## The Two-Step Quota Model

Setting quota values and enabling enforcement are separate operations:

1. **Set** quota values with `quota set` (values are saved but not enforced until enabled)
2. **Enable** enforcement with `quota enable`
3. **Disable** enforcement with `quota disable` (values are preserved)

This separation allows you to pre-configure quotas before activating them, or temporarily suspend enforcement for maintenance.

## Enabling a User Quota

If quota values are already set:

```bash
radosgw-admin quota enable \
  --uid alice \
  --quota-scope user
```

Set and enable in one workflow:

```bash
radosgw-admin quota set \
  --uid alice \
  --quota-scope user \
  --max-size 10737418240 \
  --max-objects 1000000

radosgw-admin quota enable \
  --uid alice \
  --quota-scope user
```

## Disabling a User Quota

Temporarily disable quota enforcement without removing the settings:

```bash
radosgw-admin quota disable \
  --uid alice \
  --quota-scope user
```

Verify the quota is disabled:

```bash
radosgw-admin user info --uid alice | jq '.user_quota'
```

Output shows `"enabled": false` while retaining the limit values:

```json
{
  "enabled": false,
  "check_on_raw": false,
  "max_size": 10737418240,
  "max_size_kb": 10485760,
  "max_objects": 1000000
}
```

## Enabling a Bucket Quota

For a specific bucket:

```bash
radosgw-admin quota enable \
  --quota-scope bucket \
  --bucket mybucket
```

For all buckets owned by a user:

```bash
radosgw-admin quota enable \
  --quota-scope bucket \
  --uid alice
```

## Disabling a Bucket Quota

For a specific bucket:

```bash
radosgw-admin quota disable \
  --quota-scope bucket \
  --bucket mybucket
```

For all buckets owned by a user:

```bash
radosgw-admin quota disable \
  --quota-scope bucket \
  --uid alice
```

## Bulk Enabling Quotas for All Users

Enable quotas for a list of users with a script:

```bash
#!/bin/bash
USERS=$(radosgw-admin user list | jq -r '.[]')

for UID in $USERS; do
  echo "Enabling quota for user: $UID"
  radosgw-admin quota enable \
    --uid "$UID" \
    --quota-scope user 2>/dev/null || echo "No quota set for $UID, skipping"
done
```

## Checking Quota Status Across Users

```bash
#!/bin/bash
USERS=$(radosgw-admin user list | jq -r '.[]')

for UID in $USERS; do
  STATUS=$(radosgw-admin user info --uid "$UID" 2>/dev/null | jq -r '.user_quota.enabled')
  echo "$UID: quota enabled=$STATUS"
done
```

## When to Use Disable vs Remove

- **Disable**: Temporary suspension during migration or maintenance. Settings preserved.
- **Set to -1**: Remove effective limits while keeping quota tracking active.
- **Remove user**: Deleting the user removes all associated quota settings.

## Summary

Ceph RGW separates quota configuration from quota enforcement. Use `quota set` to configure limits, `quota enable` to start enforcing them, and `quota disable` to suspend enforcement without losing settings. This two-step model allows pre-staging quota configurations and performing maintenance without permanently removing limits.
