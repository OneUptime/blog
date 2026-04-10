# How to Check Kernel Support for Ceph Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Kernel, Compatibility, Feature, RBD, CephFS

Description: Verify which Ceph features your Linux kernel supports for RBD and CephFS clients to ensure compatibility before mounting or using advanced capabilities.

---

## Why Check Kernel Feature Support?

New Ceph releases introduce features that require kernel client updates to use. If your kernel is too old, mounting CephFS may fail, RBD operations may use degraded compatibility modes, or certain capabilities (like RBD deep-flatten or CephFS snapshot) won't work. Always verify compatibility before deploying.

## Checking Kernel Version

```bash
uname -r
```

Minimum recommended versions:
- CephFS Octopus features: kernel 5.4+
- RBD exclusive-lock: kernel 4.9+
- CephFS snapshots: kernel 4.17+
- RBD deep-flatten: kernel 5.1+

## Checking CephFS Feature Flags

When mounting CephFS, the kernel client negotiates features with the monitors. To see what features the running kernel client supports:

```bash
cat /sys/module/ceph/parameters/supported_features 2>/dev/null || echo "not mounted yet"
```

After mounting, inspect the connected session via the MDS daemon:

```bash
ceph tell mds.<id> client ls
```

## Checking RBD Kernel Module Features

```bash
# Check single_major support (kernel 4.7+)
cat /sys/module/rbd/parameters/single_major

# List all rbd module parameters
ls /sys/module/rbd/parameters/
```

## Verifying with `ceph features`

After connecting a kernel client, check the negotiated feature set:

```bash
ceph features
```

The output lists which features are supported by each daemon and client type.

## Checking Specific Features

For CephFS, check if the kernel supports the required feature bits:

```bash
ceph fs feature ls
```

For RBD, check which features an image uses vs. what the kernel supports:

```bash
rbd info mypool/myimage | grep features
```

Common RBD features and minimum kernel requirements:

| Feature | Minimum Kernel |
|---------|----------------|
| layering | 3.10 |
| exclusive-lock | 4.9 |
| deep-flatten | 5.1 |
| object-map | 5.3 |
| fast-diff | 5.3 |
| data-pool | 4.11 |
| journaling | Not supported by krbd |

Disable unsupported features if needed:

```bash
rbd feature disable mypool/myimage object-map fast-diff deep-flatten
```

## Checking Config File for Feature Overrides

```bash
grep -i "rbd_default_features\|client_features" /etc/ceph/ceph.conf
```

## Summary

Check kernel version with `uname -r` and compare against the minimum requirements for the Ceph features you need. Inspect `rbd info` to see which features an image requires, and use `rbd feature disable` to remove features incompatible with older kernels. For CephFS, verify feature negotiation via `ceph features` after mounting.
