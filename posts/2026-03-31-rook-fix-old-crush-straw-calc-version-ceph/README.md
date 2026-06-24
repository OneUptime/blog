# How to Fix OLD_CRUSH_STRAW_CALC_VERSION Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CRUSH, Upgrade, Map

Description: Learn how to resolve the OLD_CRUSH_STRAW_CALC_VERSION warning in Ceph by recompiling the CRUSH map to use the modern straw2 algorithm for better data distribution.

---

## Understanding OLD_CRUSH_STRAW_CALC_VERSION

The CRUSH algorithm uses a "straw" bucket type for distributing data across OSDs. Ceph introduced a corrected straw weight calculation (`straw_calc_version 1`) in Firefly (0.80). The original straw calculation has a bug where changing the weight of one OSD causes unnecessary data movement across unrelated OSDs. `OLD_CRUSH_STRAW_CALC_VERSION` fires when the cluster's CRUSH map still uses the old straw calculation version.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN crush map has straw_calc_version=0
[WRN] OLD_CRUSH_STRAW_CALC_VERSION: crush map has straw_calc_version=0
```

## Checking the Current CRUSH Map Version

Extract and inspect the CRUSH map:

```bash
# Get the compiled CRUSH map
ceph osd getcrushmap -o /tmp/crushmap.bin

# Decompile it
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt

# Check the straw_calc_version
grep straw_calc_version /tmp/crushmap.txt
```

A value of `0` uses the old buggy calculation. A value of `1` uses the corrected straw calculation.

## Updating the CRUSH Map

The fix is to update the CRUSH map to use `straw_calc_version 1`:

```bash
# Edit the decompiled map
sed -i 's/straw_calc_version 0/straw_calc_version 1/' /tmp/crushmap.txt

# Verify the change
grep straw_calc_version /tmp/crushmap.txt

# Recompile
crushtool -c /tmp/crushmap.txt -o /tmp/crushmap-new.bin

# Inject the new CRUSH map
ceph osd setcrushmap -i /tmp/crushmap-new.bin
```

## Verifying the Fix

Check the CRUSH map version after injecting:

```bash
ceph osd getcrushmap -o /tmp/verify.bin
crushtool -d /tmp/verify.bin | grep straw_calc_version
```

Check cluster health:

```bash
ceph health detail
```

## Understanding Data Movement Impact

Upgrading the straw calculation version triggers data rebalancing. When you inject the updated map, Ceph will recalculate optimal OSD placement for all PGs. Some data movement will occur.

Monitor the rebalancing:

```bash
ceph -w | grep -E "backfill|recover|pg"
ceph pg stat
```

For large clusters, this can take time. Monitor progress:

```bash
watch "ceph status | grep -E 'recovering|backfill|degraded'"
```

## Doing This Safely with noout

Set `noout` before modifying the CRUSH map to prevent cascade issues if an OSD goes down during rebalancing:

```bash
ceph osd set noout
ceph osd setcrushmap -i /tmp/crushmap-new.bin

# Monitor until rebalancing completes
watch ceph status

# Remove the flag when done
ceph osd unset noout
```

## Rook-Ceph CRUSH Map Management

In Rook, the CRUSH map is managed automatically. If using a custom CRUSH map via ConfigMap, update it there:

```bash
kubectl -n rook-ceph get configmap rook-config-override -o yaml
```

For standard Rook deployments, use the toolbox to apply the CRUSH map change:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- /bin/bash
# Then run the crush map update commands inside the pod
```

## Summary

`OLD_CRUSH_STRAW_CALC_VERSION` warns that the cluster CRUSH map uses the old straw calculation (version 0). Fix by extracting the CRUSH map, changing `straw_calc_version` to `1`, recompiling, and injecting it back. This triggers a data rebalance - use `noout` during the process and monitor recovery to completion. The corrected straw calculation provides better distribution and reduces unnecessary data movement during OSD weight changes.
