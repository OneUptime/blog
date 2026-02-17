# How to Migrate Petabytes of On-Premises Data to Google Cloud Storage Using Transfer Appliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Transfer Appliance, Data Migration, Storage

Description: A complete walkthrough for using Google Transfer Appliance to physically ship petabytes of on-premises data to Google Cloud Storage.

---

When you have petabytes of data sitting in an on-premises data center and need to move it to Google Cloud Storage, network transfer is often not practical. Even with a dedicated 10 Gbps connection, transferring 1 PB takes roughly 10 days of continuous transfer at full bandwidth - and you never get full bandwidth. Google Transfer Appliance is a physical device that you load with data on-site, ship to Google, and they ingest it into your Cloud Storage bucket. It is the fastest way to move massive datasets to GCP.

## When Transfer Appliance Makes Sense

The general rule: if your data would take more than a week to transfer over the network, consider Transfer Appliance.

Here is a rough transfer time calculation:

```
Data: 500 TB
Network: 1 Gbps dedicated connection
Effective throughput: ~80% utilization = 800 Mbps = 100 MB/s
Transfer time: 500 TB / 100 MB/s = 5,000,000 seconds = ~58 days

With Transfer Appliance:
Data loading time: ~2 days for 500 TB (varies by source performance)
Shipping: 2-3 days
Ingestion at Google: ~2-3 days
Total: ~7-10 days
```

Transfer Appliance comes in two sizes:

- **TA40** - 40 TB usable capacity
- **TA300** - 300 TB usable capacity

For petabyte-scale migrations, you can use multiple appliances in parallel.

## Step 1 - Plan Your Migration

Before ordering an appliance, plan the details:

```bash
# Calculate your total data volume
du -sh /data/warehouse/
du -sh /data/archives/
du -sh /data/media/

# Count files and check for very small files (these transfer slower)
find /data/ -type f | wc -l
find /data/ -type f -size -1k | wc -l  # Files under 1KB

# Check for any files that exceed individual size limits
find /data/ -type f -size +5T  # Transfer Appliance max file size is 5 TB

# Identify the target Cloud Storage bucket structure
# Map your on-premises directory structure to GCS paths
```

Plan your bucket structure in Cloud Storage:

```bash
# Create destination buckets before ordering the appliance
gcloud storage buckets create gs://my-data-lake-warehouse \
  --location us-central1 \
  --storage-class STANDARD

gcloud storage buckets create gs://my-data-lake-archives \
  --location us-central1 \
  --storage-class NEARLINE  # Cost-effective for infrequently accessed data

gcloud storage buckets create gs://my-data-lake-media \
  --location us-central1 \
  --storage-class STANDARD
```

## Step 2 - Order the Transfer Appliance

Order through the Google Cloud Console:

1. Navigate to the Transfer Appliance page in the Cloud Console
2. Select the appliance size (TA40 or TA300)
3. Provide shipping details for your data center
4. Google ships the appliance to your location

While waiting for the appliance, prepare your environment:

```bash
# Install the Transfer Appliance management software
# Google provides a client tool for managing the data transfer

# Ensure your data center has:
# - Available 10 GbE or 25 GbE network port
# - Power connection (standard rack power)
# - Physical space in your server room or data center floor
# - Staff with physical access to connect and monitor the device
```

## Step 3 - Connect and Configure the Appliance

Once the appliance arrives at your data center:

```bash
# Connect the appliance to your network
# The appliance gets an IP address via DHCP or you can assign a static IP

# Access the appliance management interface
# Open a browser and navigate to the appliance IP address

# Configure the appliance with your GCP project details
# You will need:
# - GCP project ID
# - Service account credentials
# - Destination bucket names
```

The appliance presents itself as an NFS mount point that your servers can write to:

```bash
# Mount the Transfer Appliance as an NFS share
sudo mkdir -p /mnt/transfer-appliance
sudo mount -t nfs <appliance-ip>:/transfer /mnt/transfer-appliance

# Verify the mount and available space
df -h /mnt/transfer-appliance
```

## Step 4 - Load Data onto the Appliance

Use rsync or cp to transfer data to the appliance. For best performance, run multiple parallel transfers:

```bash
# Simple copy for a single large directory
rsync -avP --partial /data/warehouse/ /mnt/transfer-appliance/warehouse/

# For maximum throughput, run multiple rsync processes in parallel
# Split the data across multiple source directories

# Transfer different directories in parallel
rsync -avP /data/warehouse/2024/ /mnt/transfer-appliance/warehouse/2024/ &
rsync -avP /data/warehouse/2025/ /mnt/transfer-appliance/warehouse/2025/ &
rsync -avP /data/archives/ /mnt/transfer-appliance/archives/ &
rsync -avP /data/media/ /mnt/transfer-appliance/media/ &

# Wait for all transfers to complete
wait

# Alternatively, use GNU parallel for fine-grained control
find /data/warehouse -maxdepth 1 -type d | \
  parallel -j 8 rsync -avP {} /mnt/transfer-appliance/warehouse/
```

Monitor the transfer progress:

```bash
# Check how much data has been loaded
du -sh /mnt/transfer-appliance/

# Monitor network throughput to the appliance
iftop -i eth0 -f "host <appliance-ip>"

# The appliance management UI also shows transfer progress and speed
```

### Optimizing Transfer Speed

Several factors affect loading speed:

```bash
# Use larger block sizes for sequential reads
# Tune NFS mount options for performance
sudo mount -t nfs -o rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \
  <appliance-ip>:/transfer /mnt/transfer-appliance

# For many small files, consider creating tar archives first
# Small files have high per-file overhead on NFS
tar cf - /data/small-files/ | tar xf - -C /mnt/transfer-appliance/small-files/

# Or use tar with parallel compression
tar cf - /data/small-files/ | pigz -p 8 > /mnt/transfer-appliance/small-files.tar.gz
```

## Step 5 - Verify and Ship

Before shipping the appliance back, verify your data:

```bash
# Generate checksums for the source data
find /data/warehouse/ -type f -exec md5sum {} \; > source_checksums.txt

# Generate checksums for the data on the appliance
find /mnt/transfer-appliance/warehouse/ -type f -exec md5sum {} \; > appliance_checksums.txt

# Compare checksums
diff source_checksums.txt appliance_checksums.txt

# The appliance also generates its own integrity verification
# Check the appliance management UI for data integrity status
```

Finalize and prepare for shipping:

```bash
# Unmount the appliance
sudo umount /mnt/transfer-appliance

# Use the appliance management tool to finalize the data
# This encrypts the data and prepares it for shipping

# The appliance encrypts all data at rest using AES-256
# Encryption keys are managed by Google and stored separately from the appliance
```

Schedule the return shipment through the Google Cloud Console. Google provides pre-paid shipping labels and tracking.

## Step 6 - Monitor Ingestion

Once Google receives the appliance, data is ingested into your Cloud Storage buckets:

```bash
# Monitor ingestion progress in the Cloud Console
# Transfer Appliance section shows:
# - Appliance received status
# - Data ingestion progress
# - Estimated completion time

# You can also set up Pub/Sub notifications for ingestion events
gcloud storage buckets notifications create gs://my-data-lake-warehouse \
  --topic transfer-notifications \
  --event-types OBJECT_FINALIZE
```

## Step 7 - Validate the Migrated Data

After ingestion completes, validate your data in Cloud Storage:

```bash
# Check object counts and sizes
gcloud storage ls --recursive gs://my-data-lake-warehouse/ | wc -l

# Compare file counts between source and destination
echo "Source files: $(find /data/warehouse -type f | wc -l)"
echo "GCS objects: $(gcloud storage ls --recursive gs://my-data-lake-warehouse/ | wc -l)"

# Spot-check random files by comparing checksums
gcloud storage hash gs://my-data-lake-warehouse/sample-file.parquet
md5sum /data/warehouse/sample-file.parquet
```

## Cost Considerations

Transfer Appliance pricing includes:

- **Appliance fee** - charged per appliance per use
- **No data transfer charges** - unlike network-based transfer, you do not pay egress or ingress fees
- **Shipping costs** - included in the appliance fee
- **Cloud Storage costs** - standard storage costs apply once data is ingested

Compare this against network transfer costs:

```
Network transfer of 500 TB:
- Interconnect costs: ~$1,700/month for Dedicated 10 Gbps
- Transfer time: ~58 days = ~2 months
- Total Interconnect cost: ~$3,400
- Plus engineering time for monitoring

Transfer Appliance for 500 TB:
- 2x TA300 appliances
- Total time: ~10 days
- Fixed appliance fee (check current pricing)
- Minimal engineering time
```

For one-time large transfers, Transfer Appliance is almost always more cost-effective and faster than network transfer. For ongoing data transfers, invest in Interconnect or VPN.

## Multiple Appliances for Petabyte Scale

For true petabyte-scale migrations, use multiple appliances:

```
1 PB migration plan:
- Order 4x TA300 appliances
- Load 250 TB on each appliance in parallel
- Ship and ingest in waves or all at once
- Total timeline: 2-3 weeks vs months over the network
```

Coordinate the loading process:

```bash
# Assign different data ranges to each appliance
# Appliance 1: /data/warehouse/2020-2021/
# Appliance 2: /data/warehouse/2022-2023/
# Appliance 3: /data/archives/
# Appliance 4: /data/media/

# Load appliances simultaneously if your storage can handle the read throughput
```

## Common Pitfalls

- **Not testing with a small transfer first.** If possible, validate the entire workflow with a smaller dataset before committing to a full petabyte migration.
- **Slow source storage.** If your on-premises storage cannot sustain high read throughput, the loading phase takes longer than expected. Test read speeds before the appliance arrives.
- **Many small files.** Millions of files under 1 KB are much slower to transfer than a few large files. Consider archiving small files into tar bundles.
- **Not planning the GCS bucket structure.** Think about how your data will be organized in Cloud Storage before loading. Reorganizing petabytes of data after ingestion is expensive and slow.

Transfer Appliance is not glamorous - it is literally shipping a hard drive to Google. But for petabyte-scale data migration, it is by far the most practical option. The math is simple: if your data takes weeks to transfer over the network, ship it instead.
