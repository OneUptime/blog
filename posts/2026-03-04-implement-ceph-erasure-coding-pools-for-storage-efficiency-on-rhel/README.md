# How to Implement Ceph Erasure Coding Pools for Storage Efficiency on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, Erasure Coding, Storage, Efficiency

Description: Configure Ceph erasure coding pools on RHEL to reduce storage overhead compared to replication while maintaining data durability across the cluster.

---

Erasure coding (EC) splits data into fragments and generates parity chunks, similar to RAID 5 or RAID 6. A 4+2 EC profile uses 1.5x raw storage versus 3x for triple replication, significantly reducing costs for large datasets.

## Understand Erasure Coding Profiles

An EC profile defines:
- **k**: number of data chunks
- **m**: number of coding (parity) chunks
- Data survives the loss of up to **m** chunks

## Create an Erasure Coding Profile

```bash
# Create a 4+2 profile (4 data chunks, 2 parity chunks)

# Requires at least 6 host failure domains when crush-failure-domain=host
sudo ceph osd erasure-code-profile set ec-42-profile \
    k=4 m=2 \
    crush-failure-domain=host

# View the profile
sudo ceph osd erasure-code-profile get ec-42-profile

# List all profiles
sudo ceph osd erasure-code-profile ls
```

## Create an Erasure Coded Pool

```bash
# Create an EC pool using the profile
sudo ceph osd pool create ec-data-pool 128 erasure ec-42-profile

# Enable the pool for RGW usage
sudo ceph osd pool application enable ec-data-pool rgw
```

## Use EC Pools with RGW

EC pools work well for RGW data storage. Configure the default data pool for a zone:

```bash
# Set the RGW default placement data pool to use erasure coding
sudo radosgw-admin zone placement modify --rgw-zone=default \
    --placement-id=default-placement \
    --storage-class=STANDARD \
    --data-pool=ec-data-pool

# Commit the changes for multisite deployments
sudo radosgw-admin period update --commit
```

## Use EC Pools with RBD

RBD requires a replicated pool for metadata. You can use EC for data by enabling overwrites and specifying the EC pool as the data pool when creating images:

```bash
# Create a replicated pool for RBD metadata
sudo ceph osd pool create ec-rbd-meta 64
sudo ceph osd pool application enable ec-rbd-meta rbd
sudo rbd pool init ec-rbd-meta

# Create the EC data pool
sudo ceph osd pool create ec-rbd-data 128 erasure ec-42-profile
sudo ceph osd pool application enable ec-rbd-data rbd
sudo ceph osd pool set ec-rbd-data allow_ec_overwrites true

# Create an image whose metadata is in the replicated pool and data is in the EC pool
sudo rbd create --size 1G --data-pool ec-rbd-data ec-rbd-meta/image01
```

## Verify EC Pool Status

```bash
# Check pool stats
sudo ceph osd pool stats ec-data-pool

# View pool details
sudo ceph osd pool ls detail | grep ec-data-pool

# Check the CRUSH rule assigned
sudo ceph osd crush rule ls
```

## Performance Considerations

EC pools have higher CPU overhead for writes due to parity calculations:

```bash
# Benchmark the EC pool
sudo rados bench -p ec-data-pool 30 write --no-cleanup
sudo rados bench -p ec-data-pool 30 seq

# Compare with a replicated pool for reference
sudo rados bench -p replicated-pool 30 write --no-cleanup
sudo rados bench -p replicated-pool 30 seq
```

## Delete an EC Profile

```bash
# Remove the profile (pool must be deleted first)
sudo ceph osd erasure-code-profile rm ec-42-profile
```

Erasure coding pools are ideal for cold storage, backups, and object storage on RHEL where storage efficiency matters more than raw write performance.
