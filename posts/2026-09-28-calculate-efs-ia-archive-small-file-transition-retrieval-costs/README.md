# EFS IA and Archive Costs: Small Files, 128-KiB Minimums, and Retrievals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Cost Optimization, Storage, Lifecycle Management

Description: Estimate EFS cold-tier costs using per-file minimums, Standard metadata, transition and retrieval usage, and Archive retention charges.

A million tiny files can cost more in EFS Infrequent Access than a simple total-bytes calculation suggests. The cold storage classes have a 128-KiB minimum billable size per file, while file metadata remains in Standard. Add transition and access activity, and a lower storage price per GB does not automatically produce a lower bill.

Build the estimate from file counts and size distribution, then reconcile it with actual metered usage. Use the current rates for your AWS Region and throughput mode from the [EFS pricing page](https://aws.amazon.com/efs/pricing/); the arithmetic below intentionally avoids assuming one universal price.

## Calculate the billable size of each file

For a regular, non-sparse file with positive content size `s`, a useful planning model is:

```text
Standard content bytes = ceil(s / 4096) × 4096
IA or Archive content bytes = max(131072, ceil(s / 4096) × 4096)
Standard file metadata bytes = 2048
```

Directories, symbolic links, special files, and sparse files need their own treatment. AWS documents 4-KiB metering increments, the cold-class minimum, and 2-KiB metadata retained in Standard. Data access to IA and Archive is also metered in 128-KiB increments. Tiering files smaller than 128 KiB requires a lifecycle policy updated on or after 12:00 PM PT on November 26, 2023. [EFS metering rules](https://docs.aws.amazon.com/efs/latest/ug/metered-sizes.html).

Do the rounding per file before summing. Applying one 128-KiB minimum to the aggregate misses nearly all of the overhead for a small-file dataset.

Here is a small estimator for one million ordinary 4-KiB files:

```python
count = 1_000_000
file_bytes = 4 * 1024
GiB = 1024 ** 3

standard_content = ((file_bytes + 4095) // 4096) * 4096
cold_content = max(128 * 1024, standard_content)

print("Standard content GiB:", count * standard_content / GiB)
print("Cold content GiB:", count * cold_content / GiB)
print("Standard metadata GiB:", count * 2048 / GiB)
```

The results are approximately 3.815 GiB of Standard content, 122.070 GiB of billable cold content, and 1.907 GiB of Standard metadata. Directory storage is additional. The cold content footprint is 32 times the logical content size.

For this example, ignoring activity charges, the cold storage rate must be below one thirty-second of the Standard rate to reduce the content-storage portion. Metadata remains in Standard in either case and cancels from that narrow comparison.

## Account for time spent in each class

Storage is billed from metered usage over time, not simply the last day's size. Model monthly cost as:

```text
storage cost =
    Standard GB-months × Standard rate
  + IA GB-months × IA rate
  + Archive GB-months × Archive rate
```

EFS uses binary GB: one GB is `2^30` bytes. Aggregate GB-hours over the billing month and divide by that month's hours for GB-months. A dataset moved halfway through a month should not be charged in your estimate as though it occupied both classes for the full month. [EFS billing and usage units](https://docs.aws.amazon.com/efs/latest/ug/billing-usage-reports-understand.html).

Lifecycle thresholds and actual transition time also differ. Include the initial Standard residence and background transition delay in a migration forecast.

## Add activity instead of hiding it in storage

Keep separate inputs for tiering bytes, IA retrieval bytes, Archive retrieval bytes, and throughput usage. Multiply each by the applicable rate for its direction, class, and throughput configuration. Inspect the price table and billing usage types rather than assuming transitions are free or that every transition direction has the same price.

A complete read of each 4-KiB file in the example can incur at least 128 KiB of cold access metering per file when those accesses reach EFS. That is roughly 122.070 GiB of metered cold access for a pass over only 3.815 GiB of logical content. Repeated small reads and client caching change the observed activity, so compare estimates against a representative scan.

Elastic throughput charges are another component. Do not apply the one-third read adjustment used for performance-throughput accounting as a blanket discount to every billing line. Use the relevant billed read/write usage and rates.

## Include the Archive minimum duration

EFS Archive is available for Regional file systems using Elastic throughput and has a 90-day minimum storage duration; EFS IA has no minimum storage duration in the documented storage-class comparison. Moving a file into Archive because a lifecycle timer reached 90 days is a different concept from keeping that file in Archive for its minimum billable duration. [EFS storage-class comparison](https://docs.aws.amazon.com/efs/latest/ug/features.html).

Include early-deletion charges when archived content is removed before that commitment expires. A short-lived export that is archived and deleted soon afterward may save much less than its advertised storage rate suggests. Model retention and return-to-Standard behavior using the documented billing usage types for your workload.

## Reconcile with CloudWatch and the bill

CloudWatch exposes both actual cold content and small-file rounding overhead. For storage estimates, combine `IA` with `IASizeOverhead`, and `Archive` with `ArchiveSizeOverhead`; do not ignore the overhead or add it twice to an already metered total. [StorageBytes dimensions](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

Track the same period in billing reports, including tiering, cold access, throughput, backup, and any applicable network transfer charges. An administrative full-file checksum scan can itself change access costs and lifecycle behavior, so prefer existing inventory and metrics when possible.

The practical decision is workload-specific: compare the complete monthly estimate with keeping the dataset in Standard. Bundling immutable small files can reduce per-file overhead, but it changes random access, updates, and recovery. Test those application effects before trading a storage bill improvement for expensive reads of large bundles.
