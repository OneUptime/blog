# How to Use io2 Block Express EBS Volumes for High-Performance Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EBS, Storage, Performance

Description: Learn how to provision and optimize io2 Block Express EBS volumes for demanding workloads that need ultra-high IOPS and sub-millisecond latency on AWS.

---

If you've ever hit the performance ceiling of a regular EBS volume, io2 Block Express is the answer. It's AWS's highest-performance block storage, built on their next-generation EBS architecture. We're talking up to 256,000 IOPS, 4,000 MB/s throughput, and sub-millisecond latency per volume. That's serious firepower for databases, analytics engines, and any workload that hammers storage.

Let's walk through what io2 Block Express actually is, when to use it, and how to set it up properly.

## What Makes io2 Block Express Different?

Regular io2 volumes max out at 64,000 IOPS and 1,000 MB/s. io2 Block Express pushes those limits to 256,000 IOPS and 4,000 MB/s. The difference comes from the underlying architecture - Block Express uses Scalable Reliable Datagrams (SRD), the same network protocol that powers EFA (Elastic Fabric Adapter).

Here's a quick comparison:

| Feature | gp3 | io2 | io2 Block Express |
|---------|-----|-----|-------------------|
| Max IOPS | 16,000 | 64,000 | 256,000 |
| Max throughput | 1,000 MB/s | 1,000 MB/s | 4,000 MB/s |
| Max volume size | 16 TiB | 16 TiB | 64 TiB |
| Latency | Single-digit ms | Single-digit ms | Sub-millisecond |
| Durability | 99.8-99.9% | 99.999% | 99.999% |
| Multi-Attach | No | Yes | Yes |

The 99.999% durability is worth calling out - that's 100x more durable than gp3 volumes. For mission-critical databases, that matters a lot.

## Prerequisites

Not every EC2 instance type supports io2 Block Express. You need a Nitro-based instance that supports Block Express. As of now, these instance families work:

- R5b (memory-optimized, Block Express)
- R6i, R6in, R7i, R7iz
- M6i, M6in, M7i
- C6i, C6in, C7i
- X2idn, X2iedn
- I4i, Im4gn, Is4gen
- Trn1, Inf2
- Hpc7g

The easiest way to check if your instance supports it:

```bash
# Check if your instance type supports io2 Block Express
aws ec2 describe-instance-types \
    --instance-types r6i.xlarge \
    --query "InstanceTypes[].EbsInfo.EbsOptimizedInfo" \
    --output table
```

## Creating an io2 Block Express Volume

When you create an io2 volume with more than 64,000 IOPS or 16 TiB size, it automatically becomes a Block Express volume. But you can also create one at lower specs - the key is the instance type you attach it to.

Create a high-performance io2 Block Express volume:

```bash
# Create an io2 volume with Block Express-level performance
aws ec2 create-volume \
    --volume-type io2 \
    --size 500 \
    --iops 100000 \
    --throughput 2000 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=high-perf-db}]'
```

Note that IOPS are provisioned independently from volume size, but there's a ratio limit. You can provision up to 1,000 IOPS per GiB of volume size. So a 500 GiB volume can have up to 500,000 IOPS (though the volume max is 256,000).

## Attaching and Configuring the Volume

Attach the volume to a Block Express-compatible instance:

```bash
# Attach the volume
aws ec2 attach-volume \
    --volume-id vol-0123456789abcdef0 \
    --instance-id i-0abc123def456789 \
    --device /dev/sdf

# SSH into the instance and verify
lsblk
```

On Nitro instances, your volume will show up as an NVMe device. Use nvme list to identify it:

```bash
# List NVMe devices and their EBS volume mappings
sudo nvme list

# You'll see output like:
# /dev/nvme1n1  Amazon Elastic Block Store  vol-0123456789abcdef0
```

Create a filesystem optimized for high IOPS:

```bash
# Create XFS filesystem (generally better for high-performance workloads)
sudo mkfs.xfs /dev/nvme1n1

# Or ext4 with optimized settings
sudo mkfs.ext4 -E lazy_itable_init=0,lazy_journal_init=0 /dev/nvme1n1

# Mount it
sudo mkdir -p /data
sudo mount -o noatime,nodiratime /dev/nvme1n1 /data
```

The `noatime` and `nodiratime` mount options skip updating access timestamps on reads, which saves you IOPS you'd rather spend on actual work.

## Optimizing for Maximum Performance

Getting the volume provisioned is just the start. Here's how to squeeze every bit of performance out of it.

Tune the operating system for high-IOPS workloads:

```bash
# Set the I/O scheduler to none (best for NVMe/SSD)
echo "none" | sudo tee /sys/block/nvme1n1/queue/scheduler

# Increase the NVMe queue depth
echo 32 | sudo tee /sys/block/nvme1n1/queue/nr_requests

# Increase read-ahead for sequential workloads
sudo blockdev --setra 256 /dev/nvme1n1

# For random I/O workloads, reduce read-ahead
sudo blockdev --setra 0 /dev/nvme1n1

# Verify settings
cat /sys/block/nvme1n1/queue/scheduler
sudo blockdev --getra /dev/nvme1n1
```

Make these settings persistent across reboots:

```bash
# Create a udev rule for persistent settings
sudo tee /etc/udev/rules.d/99-ebs-io2.rules << 'EOF'
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none", ATTR{queue/nr_requests}="32"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Benchmarking Your io2 Block Express Volume

After setting up, verify you're actually getting the performance you're paying for. Use fio to benchmark.

Run a comprehensive fio benchmark targeting your io2 Block Express volume:

```bash
# Random read IOPS test - should approach your provisioned IOPS
sudo fio --name=randread --ioengine=libaio --direct=1 \
    --bs=4k --size=10G --numjobs=16 --iodepth=32 \
    --rw=randread --group_reporting \
    --filename=/dev/nvme1n1

# Random write IOPS test
sudo fio --name=randwrite --ioengine=libaio --direct=1 \
    --bs=4k --size=10G --numjobs=16 --iodepth=32 \
    --rw=randwrite --group_reporting \
    --filename=/dev/nvme1n1

# Sequential throughput test
sudo fio --name=seqread --ioengine=libaio --direct=1 \
    --bs=256k --size=10G --numjobs=4 --iodepth=32 \
    --rw=read --group_reporting \
    --filename=/dev/nvme1n1
```

If you're not hitting your provisioned IOPS, check that your instance type's EBS bandwidth limit isn't the bottleneck. For more on benchmarking EC2 performance, see our guide on [benchmarking EC2 instances](https://oneuptime.com/blog/post/2026-02-12-benchmark-ec2-instance-performance/view).

## Cost Considerations

io2 Block Express isn't cheap. You're paying for:
- Storage: $0.125 per GB per month
- Provisioned IOPS: $0.065 per IOPS per month (first 32,000), $0.046 (32,001-64,000), $0.032 (over 64,000)

For a 500 GiB volume with 100,000 provisioned IOPS:
- Storage: 500 x $0.125 = $62.50/month
- IOPS: (32,000 x $0.065) + (32,000 x $0.046) + (36,000 x $0.032) = $2,080 + $1,472 + $1,152 = $4,704/month
- Total: roughly $4,766.50/month

That's not trivial. Make sure you actually need those IOPS before provisioning them. You can always start lower and scale up - io2 volumes support live IOPS modifications.

## Modifying IOPS on the Fly

One of the nice things about io2 is you can change IOPS without downtime:

```bash
# Increase IOPS on an existing volume
aws ec2 modify-volume \
    --volume-id vol-0123456789abcdef0 \
    --iops 150000

# Check modification progress
aws ec2 describe-volumes-modifications \
    --volume-ids vol-0123456789abcdef0
```

Keep in mind there's a cooldown period of 6 hours between modifications.

## When to Use io2 Block Express

io2 Block Express is the right choice for:
- **High-performance databases** - SAP HANA, Oracle, SQL Server with demanding I/O requirements
- **Latency-sensitive workloads** - Trading platforms, real-time analytics
- **Large databases** - When you need volumes larger than 16 TiB with consistent performance
- **Mission-critical data** - Where 99.999% durability is a requirement

For everything else, start with gp3 and only upgrade when you have data showing you need more. Premature optimization of storage costs real money on AWS.

If you need even more performance than a single volume provides, consider [setting up RAID 0](https://oneuptime.com/blog/post/2026-02-12-set-up-raid-on-ebs-volumes-for-ec2/view) across multiple io2 Block Express volumes - though that's rarely necessary given the per-volume limits.

## Monitoring io2 Block Express Volumes

Set up CloudWatch alarms to track your volume utilization:

```bash
# Create an alarm for high IOPS utilization
aws cloudwatch put-metric-alarm \
    --alarm-name "io2-high-iops-utilization" \
    --metric-name VolumeReadOps \
    --namespace AWS/EBS \
    --statistic Sum \
    --period 300 \
    --threshold 4500000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 3 \
    --dimensions Name=VolumeId,Value=vol-0123456789abcdef0 \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:my-topic
```

The threshold of 4,500,000 over a 5-minute period translates to about 15,000 IOPS average. Adjust based on your provisioned IOPS.

io2 Block Express is AWS's premium storage tier for a reason. When your workload demands it, nothing else on EBS comes close. Just make sure you're monitoring it properly and not over-provisioning, because those IOPS charges add up fast.
