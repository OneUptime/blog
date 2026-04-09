# How to Configure crush-osds-per-failure-domain in Erasure Coding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, CRUSH, Storage

Description: Configure the crush-osds-per-failure-domain parameter in Ceph erasure code profiles to control how many OSD chunks are placed within each failure domain.

---

## What is crush-osds-per-failure-domain

The `crush-osds-per-failure-domain` parameter in a Ceph erasure code profile specifies how many erasure coded chunks (shards) are placed within a single failure domain instance. By default, this parameter is not set (value 0), and Ceph places one chunk per host, rack, or other failure domain.

Increasing this value lets you use erasure coding even when you have fewer failure domain instances than k+m chunks - for example, using a k=4, m=2 profile with only 3 hosts by placing 2 chunks per host.

## When to Use Multiple OSDs Per Failure Domain

By default (without `crush-osds-per-failure-domain`), a k=4, m=2 profile requires 6 distinct hosts. If you have fewer hosts but more OSDs per host, you can increase this value:

```text
k=4, m=2, crush-osds-per-failure-domain=1 => needs 6 distinct hosts
k=4, m=2, crush-osds-per-failure-domain=2 => needs 3 distinct hosts (2 chunks each)
```

The trade-off: placing multiple chunks on the same host means losing 2 chunks if that host fails, which still satisfies the fault tolerance if m=2.

## Creating a Profile with crush-osds-per-failure-domain

```bash
# Profile with 2 chunks per host (allows EC with 3 hosts for k=4, m=2)
ceph osd erasure-code-profile set ec-dense-profile \
  k=4 \
  m=2 \
  crush-failure-domain=host \
  crush-osds-per-failure-domain=2 \
  crush-num-failure-domains=3

# Verify the profile
ceph osd erasure-code-profile get ec-dense-profile
```

Expected output:

```text
crush-device-class=
crush-failure-domain=host
crush-num-failure-domains=3
crush-osds-per-failure-domain=2
crush-root=default
k=4
m=2
plugin=jerasure
technique=reed_sol_van
```

## Creating the Pool

```bash
# Create a pool using the dense profile
ceph osd pool create ec-dense 64 64 erasure ec-dense-profile

# Verify the pool
ceph osd pool get ec-dense all | grep -E "erasure|crush"

# Map an object to see chunk placement
ceph osd map ec-dense testobject
```

The placement output will show 6 OSDs where pairs are on the same host.

## Enabling EC Overwrites for RBD Use

If you plan to use erasure coded pools with RBD or CephFS:

```bash
# Enable overwrites on the erasure pool
ceph osd pool set ec-dense allow_ec_overwrites true

# Verify
ceph osd pool get ec-dense allow_ec_overwrites
```

## Rook Configuration

Rook's CephBlockPool CRD does not natively support the `crush-osds-per-failure-domain` or `crush-num-failure-domains` erasure code profile parameters. The `spec.parameters` field is for pool-level properties (set via `ceph osd pool set`), not erasure code profile parameters.

To use `crush-osds-per-failure-domain` with Rook, create the erasure code profile manually via the Rook toolbox, then reference it in your pool configuration:

```bash
# From the Rook toolbox pod:
ceph osd erasure-code-profile set ec-dense-profile \
  k=4 m=2 crush-failure-domain=host \
  crush-osds-per-failure-domain=2 crush-num-failure-domains=3
```

Then create a CephBlockPool that uses the pre-created profile:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-dense-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

Note that Rook will create its own erasure code profile for this pool. To use your custom profile instead, you may need to manage the pool directly via the Ceph CLI rather than through the CRD.

## Verifying Fault Tolerance

With `crush-osds-per-failure-domain=2`, understand the actual failure tolerance:

```bash
# With k=4, m=2 and 2 chunks per host:
# - Cluster has 3 hosts, each with 2 chunks
# - Losing 1 host = losing 2 chunks
# - Since m=2, losing 1 host is still recoverable
# - Losing 2 hosts = losing 4 chunks (exceeds m=2 tolerance!)

# Check current host count
ceph osd tree | grep "^-" | grep "host" | wc -l
```

## Summary

`crush-osds-per-failure-domain` controls how many erasure coded chunks are co-located within a single failure domain. The default (not set) provides maximum fault isolation but requires as many failure domain instances as k+m. Increasing this value allows erasure coding with fewer hosts but reduces fault tolerance - a host failure removes multiple chunks. Choose this value carefully based on your actual hardware topology and the m value in your erasure profile.
