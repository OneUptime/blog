# How to Configure LVM Thin Provisioning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Thin Provisioning, Storage, Linux

Description: Set up LVM thin provisioning on Ubuntu to over-provision storage, create space-efficient snapshots, and manage thin pools for virtualization and container workloads.

---

Thin provisioning lets you allocate more storage to Logical Volumes than physically exists, banking on the fact that not all allocated space will be used at once. This is the same concept cloud providers use for storage - you pay for what you use, not what you reserve. On Ubuntu, LVM's thin provisioning is practical for development environments, VM hosts, container storage, and any scenario where multiple consumers need flexible storage without waste.

## Thin Provisioning Concepts

### Thin Pool

A thin pool is a special LV that serves as a storage reservoir. It has two components:
- **Data area**: Stores the actual data blocks
- **Metadata area**: Tracks which blocks are allocated to which thin volumes

### Thin Volume

A thin LV (thin volume) is created from a thin pool. It has an advertised size that can exceed the pool's physical capacity. Blocks are only allocated from the pool when data is actually written to the thin volume.

### Key difference from regular LVs

- **Regular LV**: All blocks reserved immediately from the VG
- **Thin LV**: Blocks allocated from the thin pool only when data is written

### Over-provisioning

If you have a 100GB thin pool, you can create 5 thin volumes of 50GB each (250GB total allocated) as long as actual data usage stays under 100GB. This requires monitoring to avoid running the pool out of space.

## Creating a Thin Pool

### Step 1: Ensure you have a VG with free space

```bash
sudo vgs
```

```text
  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    1   0   0 wz--n- 500.00g  500.00g
```

### Step 2: Create the thin pool

```bash
# Create a 200GB thin pool named 'thin_pool' in data_vg
# --thinpool flag creates the thin pool metadata LV automatically
sudo lvcreate -L 200G --thinpool thin_pool data_vg
```

Output:
```text
  Thin pool volume with chunk size 64.00 KiB can address at most 15.81 TiB of data.
  Logical volume "thin_pool" created.
```

LVM automatically creates a metadata LV alongside the data LV (you'll see `[thin_pool_tmeta]` and `[thin_pool_tdata]` in `lvs -a`).

### Create a thin pool with specific metadata size

For large thin pools (>1TB), the auto-calculated metadata size may be insufficient:

```bash
# Specify metadata size explicitly
sudo lvcreate -L 200G --thinpool thin_pool --poolmetadatasize 2G data_vg
```

Rule of thumb: metadata needs approximately 48 bytes per 64KB chunk. For a 1TB pool with 64KB chunks: `(1TB / 64KB) * 48 bytes ≈ 768MB`.

### Verify the thin pool

```bash
sudo lvs -a data_vg
```

```text
  LV                  VG       Attr       LSize   Pool      Origin Data%  Meta%
  thin_pool           data_vg  twi-a-tz-- 200.00g                  0.00   10.43
  [thin_pool_tdata]   data_vg  Twi-ao---- 200.00g
  [thin_pool_tmeta]   data_vg  ewi-ao----   2.00g
```

The `t` in the Attr column indicates a thin pool.

## Creating Thin Volumes

With the thin pool created, provision thin volumes from it:

```bash
# Create a 50GB thin volume (even if pool is smaller than 50GB total)
sudo lvcreate -V 50G --thin -n web_data data_vg/thin_pool

# Create multiple thin volumes
sudo lvcreate -V 50G --thin -n db_data data_vg/thin_pool
sudo lvcreate -V 100G --thin -n logs data_vg/thin_pool
sudo lvcreate -V 200G --thin -n backups data_vg/thin_pool
```

Check: these four volumes total 400GB provisioned, but only 200GB physical storage exists:

```bash
sudo lvs data_vg
```

```text
  LV        VG       Attr       LSize   Pool      Origin Data%
  backups   data_vg  Vwi-a-tz-- 200.00g thin_pool        0.00
  db_data   data_vg  Vwi-a-tz-- 50.00g  thin_pool        0.00
  logs      data_vg  Vwi-a-tz-- 100.00g thin_pool        0.00
  thin_pool data_vg  twi-a-tz-- 200.00g                  0.00
  web_data  data_vg  Vwi-a-tz-- 50.00g  thin_pool        0.00
```

All volumes show 0% data because no data has been written yet.

## Format and Mount Thin Volumes

Thin volumes behave like regular LVs for filesystem operations:

```bash
# Format each thin volume
sudo mkfs.ext4 /dev/data_vg/web_data
sudo mkfs.ext4 /dev/data_vg/db_data
sudo mkfs.xfs /dev/data_vg/logs

# Mount them
sudo mkdir -p /var/www /var/lib/db /var/log/apps
sudo mount /dev/data_vg/web_data /var/www
sudo mount /dev/data_vg/db_data /var/lib/db
sudo mount /dev/data_vg/logs /var/log/apps
```

Add to `/etc/fstab` for persistence:

```text
/dev/data_vg/web_data  /var/www         ext4  defaults  0  2
/dev/data_vg/db_data   /var/lib/db      ext4  defaults  0  2
/dev/data_vg/logs      /var/log/apps    xfs   defaults  0  2
```

## Monitoring Thin Pool Usage

Monitoring thin pool fill percentage is critical. If the pool fills, all thin volumes in it go read-only or offline:

```bash
# Check data and metadata usage
sudo lvs -o lv_name,lv_size,data_percent,metadata_percent data_vg
```

```text
  LV        LSize   Data%  Meta%
  thin_pool 200.00g 35.20  12.45
```

### Set up automatic extension

Configure LVM to automatically extend the thin pool when it's getting full. Edit `/etc/lvm/lvm.conf`:

```bash
sudo nano /etc/lvm/lvm.conf
```

Find and set:

```text
# In the activation section:
thin_pool_autoextend_threshold = 80   # start extending at 80% full
thin_pool_autoextend_percent = 20     # extend by 20% each time
```

Enable `lvm2-monitor` to watch for events:

```bash
sudo systemctl enable --now lvm2-monitor.service
```

### Manual thin pool extension

```bash
# Extend the thin pool data area by 100GB
sudo lvextend -L +100G data_vg/thin_pool
```

## Thin Provisioning Snapshots

Thin provisioning enables a much more efficient snapshot mechanism than regular LVM snapshots. Thin snapshots share blocks with the origin - no copy is made until either the origin or the snapshot modifies a block.

```bash
# Create a thin snapshot of web_data
sudo lvcreate -s -n web_data_snap /dev/data_vg/web_data
```

No need to specify a size - thin snapshots grow from the same pool as needed.

```bash
sudo lvs
```

```text
  LV           VG       Attr       LSize   Pool      Origin
  web_data     data_vg  Vwi-a-tz-- 50.00g  thin_pool
  web_data_snap data_vg Vwi---tz-- 50.00g  thin_pool web_data
```

Both the origin and snapshot share the same data blocks in the pool, branching only when one is written to.

### Mounting a thin snapshot read-only

```bash
sudo mount -o ro /dev/data_vg/web_data_snap /mnt/snap
```

### Removing a thin snapshot

```bash
sudo lvremove /dev/data_vg/web_data_snap
```

## Checking Over-Provisioning Ratio

Track how much you've over-provisioned:

```bash
# Total provisioned vs total pool capacity
sudo lvs -o lv_name,lv_size,pool_lv data_vg | grep thin_pool

# Or calculate manually
POOL_SIZE=$(sudo lvs --noheadings --units g -o lv_size data_vg/thin_pool | tr -d ' g')
PROVISIONED=$(sudo lvs --noheadings --units g -o lv_size data_vg | grep thin_pool | awk '{sum+=$1} END{print sum}')
echo "Pool: ${POOL_SIZE}G, Provisioned: ${PROVISIONED}G"
```

## Deactivating and Removing Thin Volumes

```bash
# Unmount and remove a thin volume
sudo umount /var/www
sudo lvremove /dev/data_vg/web_data

# Remove an entire thin pool (removes all thin volumes in it too)
# All thin volumes must be removed first
sudo lvremove /dev/data_vg/db_data
sudo lvremove /dev/data_vg/logs
sudo lvremove /dev/data_vg/backups
sudo lvremove /dev/data_vg/thin_pool
```

## Common Issues

### "Pool becoming full" warning

Monitor thin pool usage and extend proactively. A pool that fills completely causes all its thin volumes to go read-only.

### Poor snapshot performance on thick (non-thin) pools

Regular LVM snapshots use copy-on-write which adds latency to writes on the origin. Thin snapshots are more efficient for snapshot-heavy workloads.

### Metadata usage growing quickly

Many small I/O operations create more metadata than large sequential writes. Increasing chunk size reduces metadata overhead:

```bash
# Create pool with 512KB chunks (default is 64KB)
sudo lvcreate -L 200G --thinpool thin_pool --chunksize 512k data_vg
```

Larger chunk sizes reduce metadata but increase space waste when sparse data is written.

Thin provisioning requires active monitoring but pays dividends in storage efficiency, especially for development environments and multi-tenant systems where full allocation would waste most of the provisioned space.
