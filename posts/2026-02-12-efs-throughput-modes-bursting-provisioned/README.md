# How to Configure EFS Throughput Modes (Bursting vs Provisioned)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Throughput, Performance, Storage

Description: Understand EFS throughput modes - Bursting, Provisioned, and Elastic - and learn how to choose the right one based on your workload patterns and data size.

---

EFS throughput mode determines how much data your file system can read and write per second. Unlike EBS where you provision IOPS explicitly, EFS ties throughput to the amount of data stored (in bursting mode) or lets you set it directly (in provisioned mode). Pick the wrong mode and you'll either leave performance on the table or burn money on throughput you don't use.

Let's dig into each mode, understand the economics, and figure out which one makes sense for your workload.

## The Three Throughput Modes

### Bursting Throughput

This is the default mode. Throughput scales with the size of your file system:

- **Baseline throughput**: 50 KB/s per GB of data stored
- **Burst throughput**: Up to 100 MB/s regardless of size (for file systems under 1 TB)
- **Burst credits**: You accumulate credits when you're below baseline and spend them when you burst

For example, a 100 GB file system gets:
- Baseline: 5 MB/s (100 GB x 50 KB/s)
- Burst: 100 MB/s
- Burst credit accumulation: You earn credits at 5 MB/s when idle and spend them at up to 100 MB/s when active

For file systems over 1 TB, the burst throughput equals the baseline (50 KB/s x stored GB), which is already quite high. A 10 TB file system gets 500 MB/s baseline without needing to burst.

### Provisioned Throughput

You specify exactly how much throughput you want, regardless of data size. This is for workloads where the data is small but the throughput needs are high.

- You pay for the provisioned amount whether you use it or not
- You can adjust it up or down (with some cooldown restrictions)
- You can provision up to 3 GB/s for read and 1 GB/s for write

### Elastic Throughput

The newest option. Throughput automatically scales up and down based on workload demand:

- No need to provision or manage capacity
- Scales up to 10 GB/s for reads and 3 GB/s for writes
- You pay only for the throughput you actually use
- No burst credits to worry about

## When to Use Each Mode

**Use Bursting when:**
- Your data set is large (multiple TB) - the baseline throughput is already generous
- Your access pattern is bursty - short periods of high throughput with long idle periods
- You want to keep costs low for mostly-idle file systems

**Use Provisioned when:**
- Your data set is small but needs consistent high throughput
- You need predictable, guaranteed throughput
- You have a steady-state workload with well-understood throughput requirements

**Use Elastic when:**
- Your workload is spiky and unpredictable
- You want to avoid burst credit depletion issues
- You're okay paying per-use rather than pre-provisioning
- You need to handle sudden traffic spikes without performance degradation

## Creating File Systems with Each Mode

Bursting (default):

```bash
# Create with bursting throughput (the default)
aws efs create-file-system \
  --throughput-mode bursting \
  --encrypted \
  --tags "Key=Name,Value=app-data"
```

Provisioned:

```bash
# Create with 256 MB/s provisioned throughput
aws efs create-file-system \
  --throughput-mode provisioned \
  --provisioned-throughput-in-mibps 256 \
  --encrypted \
  --tags "Key=Name,Value=high-throughput-data"
```

Elastic:

```bash
# Create with elastic throughput
aws efs create-file-system \
  --throughput-mode elastic \
  --encrypted \
  --tags "Key=Name,Value=dynamic-workload"
```

## Switching Between Modes

Unlike performance modes, you CAN change throughput modes after creation. But there are cooldown restrictions:

```bash
# Switch from bursting to provisioned
aws efs update-file-system \
  --file-system-id "fs-0abc123def456789" \
  --throughput-mode provisioned \
  --provisioned-throughput-in-mibps 128
```

```bash
# Switch from provisioned to elastic
aws efs update-file-system \
  --file-system-id "fs-0abc123def456789" \
  --throughput-mode elastic
```

```bash
# Switch back to bursting
aws efs update-file-system \
  --file-system-id "fs-0abc123def456789" \
  --throughput-mode bursting
```

You can decrease provisioned throughput or switch modes only once in a 24-hour period. Increasing provisioned throughput can be done at any time.

## Monitoring Burst Credits

If you're using bursting mode, monitoring your burst credit balance is critical. When credits run out, throughput drops to the baseline, and that can be devastating if you're relying on burst speeds.

```bash
# Check current burst credit balance
aws cloudwatch get-metric-statistics \
  --namespace "AWS/EFS" \
  --metric-name "BurstCreditBalance" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --start-time "$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 3600 \
  --statistics Average \
  --output table
```

Set up an alarm before credits run out:

```bash
# Alarm when burst credits are low
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-burst-credits-low" \
  --alarm-description "EFS burst credits below 1 TB - throughput may drop" \
  --namespace "AWS/EFS" \
  --metric-name "BurstCreditBalance" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 6 \
  --threshold 1099511627776 \
  --comparison-operator LessThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

## Cost Comparison

Let's compare costs for a few scenarios (us-east-1 pricing, approximate):

**Scenario 1: 50 GB file system, needs 100 MB/s consistently**

| Mode | Monthly Cost |
|------|-------------|
| Bursting | $15 (storage only) - but you'll run out of burst credits quickly |
| Provisioned | $15 (storage) + $600 (100 MB/s provisioned) = $615 |
| Elastic | $15 (storage) + usage-based throughput charges |

For consistent high throughput on small data, Provisioned is the predictable choice. Elastic might be cheaper if the high throughput is only needed part of the time.

**Scenario 2: 10 TB file system, moderate usage**

| Mode | Monthly Cost |
|------|-------------|
| Bursting | $3,000 (storage only) - gets 500 MB/s baseline for free |
| Provisioned | $3,000 + provisioned cost - unnecessary since baseline is already high |
| Elastic | $3,000 + minimal usage charges |

For large file systems, Bursting is almost always the most cost-effective because the baseline throughput is proportional to storage.

**Scenario 3: 200 GB file system, spiky traffic (occasional 500 MB/s bursts)**

| Mode | Monthly Cost |
|------|-------------|
| Bursting | $60 - works if bursts are short and infrequent |
| Provisioned | $60 + $3,000 (500 MB/s) = $3,060 - expensive for occasional use |
| Elastic | $60 + pay-per-use - best for spiky patterns |

Elastic shines for unpredictable workloads where provisioned would be wasteful.

## Calculating Your Burst Credit Budget

You can calculate how long you can burst with this formula:

```python
def calculate_burst_duration(
    storage_gb,
    burst_throughput_mbps,
    current_credits_bytes=None
):
    """
    Calculate how long you can sustain a burst.

    Args:
        storage_gb: Amount of data stored in GB
        burst_throughput_mbps: Desired burst throughput in MB/s
        current_credits_bytes: Current credit balance (default: max)
    """
    baseline_throughput = storage_gb * 50 * 1024  # bytes/s
    burst_bytes = burst_throughput_mbps * 1024 * 1024  # bytes/s

    # Max credits = file system can accumulate up to 2.1 TB
    max_credits = 2.1 * 1024 * 1024 * 1024 * 1024  # bytes
    credits = current_credits_bytes or max_credits

    if burst_bytes <= baseline_throughput:
        return float('inf')  # Burst is within baseline, no credit drain

    # Net credit drain rate
    drain_rate = burst_bytes - baseline_throughput  # bytes/s

    duration_seconds = credits / drain_rate
    duration_hours = duration_seconds / 3600

    print(f"Storage: {storage_gb} GB")
    print(f"Baseline throughput: {baseline_throughput / 1024 / 1024:.1f} MB/s")
    print(f"Burst throughput: {burst_throughput_mbps} MB/s")
    print(f"Available credits: {credits / 1024 / 1024 / 1024:.1f} GB")
    print(f"Burst duration: {duration_hours:.1f} hours")
    return duration_hours

# Example: 100 GB file system bursting at 100 MB/s
calculate_burst_duration(100, 100)
```

## Auto-Switching with Lambda

Here's a pattern where you automatically switch to provisioned throughput when burst credits get low, and switch back when they recover:

```python
import boto3

efs = boto3.client('efs')
cloudwatch = boto3.client('cloudwatch')

LOW_CREDIT_THRESHOLD = 500 * 1024**3  # 500 GB in bytes
HIGH_CREDIT_THRESHOLD = 1500 * 1024**3  # 1.5 TB in bytes
PROVISIONED_THROUGHPUT = 128  # MB/s

def handler(event, context):
    fs_id = event.get('file_system_id', 'fs-0abc123def456789')

    # Get current file system info
    fs = efs.describe_file_systems(FileSystemId=fs_id)['FileSystems'][0]
    current_mode = fs['ThroughputMode']

    # Get current burst credits
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/EFS',
        MetricName='BurstCreditBalance',
        Dimensions=[{'Name': 'FileSystemId', 'Value': fs_id}],
        StartTime='2026-02-12T00:00:00Z',
        EndTime='2026-02-12T23:59:59Z',
        Period=300,
        Statistics=['Average']
    )

    if not response['Datapoints']:
        print("No burst credit data available")
        return

    credits = response['Datapoints'][-1]['Average']
    print(f"Current mode: {current_mode}, Credits: {credits / 1024**3:.1f} GB")

    if current_mode == 'bursting' and credits < LOW_CREDIT_THRESHOLD:
        print(f"Credits low, switching to provisioned ({PROVISIONED_THROUGHPUT} MB/s)")
        efs.update_file_system(
            FileSystemId=fs_id,
            ThroughputMode='provisioned',
            ProvisionedThroughputInMibps=PROVISIONED_THROUGHPUT
        )
    elif current_mode == 'provisioned' and credits > HIGH_CREDIT_THRESHOLD:
        print("Credits recovered, switching back to bursting")
        efs.update_file_system(
            FileSystemId=fs_id,
            ThroughputMode='bursting'
        )
```

Note: This pattern has the 24-hour cooldown limitation. For truly dynamic workloads, Elastic throughput is the better solution.

## Best Practices

1. **Start with Bursting** for new file systems. Monitor burst credits to see if it's sufficient.
2. **Use Elastic for unpredictable workloads** - it's the most flexible option.
3. **Use Provisioned only for well-understood, consistent throughput needs** on small file systems.
4. **Monitor BurstCreditBalance religiously** if using bursting mode. Running out of credits with no warning is a common cause of sudden performance drops.
5. **Right-size provisioned throughput** - check actual utilization with CloudWatch and adjust down if you're over-provisioned.

For more on monitoring EFS metrics, see our post on [monitoring EFS with CloudWatch](https://oneuptime.com/blog/post/monitor-efs-cloudwatch/view).

## Wrapping Up

Throughput mode is a lever that directly affects both your file system's performance and your AWS bill. Bursting is free (included in storage costs) but limited by your data size. Provisioned gives guaranteed throughput but costs extra. Elastic scales automatically but charges per use. The right choice depends on your data size, access patterns, and tolerance for variability. When in doubt, start with Bursting, watch the metrics, and switch if needed.
