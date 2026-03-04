# How to Set Up Stratis with Tiered Caching on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Caching, SSD, Storage, Linux

Description: Learn how to configure Stratis tiered caching on RHEL by adding SSD or NVMe cache devices to a pool for improved read performance on frequently accessed data.

---

Stratis supports tiered caching, which allows you to add fast storage devices (SSDs or NVMe drives) as a cache tier to a pool that uses slower HDDs for bulk storage. The cache tier automatically stores frequently accessed data on the faster devices, improving read performance without requiring you to manually manage data placement. This guide covers setting up and managing Stratis caching on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An existing Stratis pool with HDD-based data devices
- One or more SSD or NVMe devices for caching
- Stratis daemon running

## Understanding Stratis Caching

Stratis caching works by:

1. Adding fast devices as a separate cache tier within the pool
2. Automatically caching frequently read data on the fast tier
3. Transparently serving cached reads from the fast device
4. Writing data through to the data tier (the HDDs)

The caching mechanism is based on `dm-cache` (device-mapper cache), which is a well-established Linux kernel technology.

Key characteristics:
- Cache improves read performance primarily
- Writes go to the data tier (write-through cache)
- Cache is transparent to applications
- Loss of cache devices does not cause data loss (data is on the data tier)

## Step 1: Create a Pool with Data Devices

If you do not already have a pool, create one with HDD devices:

```bash
sudo stratis pool create datapool /dev/sdb /dev/sdc
```

Verify:

```bash
sudo stratis pool list
```

## Step 2: Identify Cache Devices

List available fast devices:

```bash
lsblk -o NAME,SIZE,MODEL,TRAN,ROTA
```

Devices with `ROTA=0` are SSDs/NVMe (non-rotational). Devices with `ROTA=1` are HDDs.

Ensure the cache device is clean:

```bash
sudo wipefs -a /dev/nvme0n1
```

## Step 3: Initialize the Cache Tier

Add the first cache device to the pool:

```bash
sudo stratis pool init-cache datapool /dev/nvme0n1
```

The `init-cache` command sets up the cache tier and adds the first cache device.

Verify caching is active:

```bash
sudo stratis pool list
```

The Properties column should now show `Ca` indicating caching is active.

## Step 4: Add More Cache Devices

To increase cache capacity, add additional cache devices:

```bash
sudo stratis pool add-cache datapool /dev/nvme1n1
```

List all block devices and their roles:

```bash
sudo stratis blockdev list datapool
```

Output shows each device's tier:

```bash
Pool       Device       Physical Size   Tier
datapool   /dev/sdb     100 GiB         Data
datapool   /dev/sdc     100 GiB         Data
datapool   /dev/nvme0n1 50 GiB          Cache
datapool   /dev/nvme1n1 50 GiB          Cache
```

## Step 5: Create and Use Filesystems

Filesystems benefit from caching automatically:

```bash
sudo stratis filesystem create datapool fast_data
sudo mkdir -p /fast
sudo mount /dev/stratis/datapool/fast_data /fast
```

No special configuration is needed. Frequently accessed data will be automatically cached on the SSD tier.

## Step 6: Monitor Cache Performance

Check the overall pool status:

```bash
sudo stratis pool list datapool
```

Monitor I/O performance to see the caching effect:

```bash
sudo dnf install sysstat -y
iostat -x 1
```

Compare the I/O load on HDD and SSD devices. As the cache warms up, you should see more reads served by the SSD and fewer by the HDDs.

## Step 7: Benchmark With and Without Cache

To measure the caching benefit:

### Before Adding Cache

```bash
sudo fio --name=read_test --directory=/fast --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting
```

### After Adding Cache (Run Multiple Times to Warm Cache)

```bash
# First run (cache cold)
sudo fio --name=read_test --directory=/fast --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting

# Second run (cache warming)
sudo fio --name=read_test --directory=/fast --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting

# Third run (cache warm)
sudo fio --name=read_test --directory=/fast --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting
```

The third run should show significantly better random read performance.

## Cache Sizing Guidelines

### How Much Cache Do You Need?

The optimal cache size depends on your working set:

- **Hot data smaller than cache**: If your frequently accessed data fits in the cache, most reads will be cache hits.
- **Hot data larger than cache**: Performance improves for the portion of data that fits, but cache hit rate is lower.

General recommendations:
- 10-20% of data tier size is a good starting point
- Monitor cache hit rates and adjust

### Cache Device Selection

- **NVMe**: Best performance, highest cache hit benefit
- **SATA SSD**: Good performance, more cost-effective
- **Multiple smaller SSDs**: Stratis stripes across cache devices for additional throughput

## Important Considerations

### Cache Loss

If a cache device fails:
- No data is lost (all data exists on the data tier)
- Performance returns to data-tier levels
- Replace the failed cache device and reinitialize caching

### Cannot Remove Cache Devices

Currently, Stratis does not support removing cache devices from a pool. Plan your cache tier carefully.

### No Write Caching

Stratis uses write-through caching. Writes go directly to the data tier. This means:
- Write performance is determined by the data tier (HDDs)
- Data is always safe on the data tier
- Cache failure never causes data loss

### Cache is Not Persistent Across Pool Destruction

When you destroy a pool, the cache tier is destroyed as well.

## Troubleshooting

### Caching Not Showing Active

Verify the cache device was added:

```bash
sudo stratis blockdev list datapool
```

Ensure the device has the `Cache` tier designation.

### No Performance Improvement

- The cache may still be cold. Run your workload multiple times.
- Your workload may not benefit from caching (for example, purely sequential reads on large datasets).
- The cache may be too small for your working set.

### Pool Shows Errors After Cache Device Removal

If a cache device is physically removed without proper procedure:

```bash
sudo systemctl restart stratisd
sudo stratis pool list
```

## Conclusion

Stratis tiered caching on RHEL provides a simple way to boost read performance by adding SSD or NVMe devices as a cache tier to HDD-based storage pools. The cache operates transparently, automatically storing frequently accessed data on the faster devices. While the cache is primarily beneficial for read-heavy workloads with a hot data set smaller than the cache size, it can significantly improve perceived storage performance without any application changes.
