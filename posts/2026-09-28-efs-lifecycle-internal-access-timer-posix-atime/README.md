# EFS Lifecycle Access Timer vs POSIX atime: Moving Files to IA and Archive

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Lifecycle Management, Storage

Description: Understand why POSIX access times cannot predict EFS lifecycle transitions and measure IA and Archive behavior using controlled access patterns.

A file can show an old POSIX access time and still remain in EFS Standard. Conversely, a directory listing can show recent activity without making the file's content hot. EFS lifecycle management uses an internal last-access timer rather than the POSIX timestamps exposed through NFS.

This is why `find -atime` is a poor tool for predicting exactly which files EFS will move next. It answers a filesystem timestamp question, while the lifecycle service makes its decision using a different clock. [EFS lifecycle timing](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html).

## Keep the three clocks separate

A practical investigation involves three timelines:

| Timeline | What it describes |
| --- | --- |
| POSIX timestamps | File attributes returned to the NFS client |
| EFS lifecycle timer | Service-side access history used for tiering eligibility |
| Observed transition time | When background lifecycle work actually moves the content |

Backdating a file with `touch -a -t 202601010000 existing-file` changes the first timeline. It does not backdate the service's internal access history. Preserving old timestamps during migration therefore does not make a newly copied dataset immediately behave like equally old, untouched EFS data.

Likewise, becoming eligible is not a promise of an instantaneous transition. Lifecycle work runs behind application I/O, and the amount of work matters. Millions of small files can take longer to transition than a smaller number of large files containing the same total bytes.

## Inspect the policy before inspecting timestamps

Retrieve the live lifecycle configuration:

```bash
aws efs describe-lifecycle-configuration \
  --file-system-id fs-0123456789abcdef0
```

An empty array means no lifecycle configuration is currently applied. Record the policy and its change history in your own infrastructure records; the output is not a per-file eligibility report. [DescribeLifecycleConfiguration](https://docs.aws.amazon.com/efs/latest/APIReference/API_DescribeLifecycleConfiguration.html).

A Regional General Purpose file system using Elastic throughput can use a policy such as:

```json
[
  {"TransitionToIA": "AFTER_30_DAYS"},
  {"TransitionToArchive": "AFTER_90_DAYS"},
  {"TransitionToPrimaryStorageClass": "AFTER_1_ACCESS"}
]
```

Each array object contains one transition. The Archive threshold must be later than the IA threshold, and Archive requires the supported performance and throughput modes. [PutLifecycleConfiguration requirements](https://docs.aws.amazon.com/efs/latest/APIReference/API_PutLifecycleConfiguration.html).

The 90-day Archive threshold is based on time since access in Standard; it does not mean an additional 90 days after spending 30 days waiting for IA. Treating the thresholds as additive produces the wrong forecast.

## Distinguish content access from metadata inspection

A listing or metadata query is different from opening and reading file content. File metadata stays in Standard, including metadata for files whose content is in IA or Archive. Metadata operations such as directory listings do not count as content access for lifecycle purposes. [Storage-class lifecycle operations](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html).

This changes how you investigate an unexpected transition pattern. Identify processes that read file contents: indexers, checksum jobs, security scanners, previews, and application cache warmers. A seemingly harmless nightly integrity scan may be much more relevant than a human running `ls`.

Do not assume every application read reaches EFS. A client cache may satisfy repeated reads, so application logs alone are not an exact record of server-observed I/O. Correlate access behavior with NFS and EFS metrics when running an experiment.

## Run a controlled lifecycle experiment

Use a disposable file system or a clearly isolated test dataset. Lifecycle policy applies to the entire file system, so changing it for an experiment on a shared production system also changes the policy for unrelated directories and access points.

Create two groups of normal files and record their sizes. Leave one group untouched. Read content from the other at known intervals while recording whether those reads cause remote I/O. Use a short supported transition interval for the disposable environment, and allow time beyond that threshold for background processing.

Monitor storage-class totals rather than expecting `stat` to identify the class of an individual file:

```bash
aws efs describe-file-systems \
  --file-system-id fs-0123456789abcdef0 \
  --query 'FileSystems[0].SizeInBytes'
```

For longer observation, use CloudWatch `StorageBytes` with the Standard, IA, and Archive dimensions. Include small-file overhead dimensions when interpreting the amount billed. Aggregate metric changes are evidence of dataset movement, not proof of the class of a particular pathname. [EFS storage metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

Avoid reading every candidate file to confirm it is cold: that measurement can change the behavior you are measuring. On a test filesystem with known groups, the aggregate trend is much easier to interpret.

## Understand return-to-Standard behavior

Reading content in IA or Archive does not automatically promote it to Standard unless the return policy requests it. `AFTER_1_ACCESS` asks EFS to move accessed content back to Standard; the move still occurs through lifecycle processing. A promoted file can transition back to IA or Archive after another period of inactivity under the configured policy. Disabling future transitions also does not bulk-promote all existing cold data.

Choose return behavior from measured access patterns. A sporadic read of an old document and a repeated interactive workload have different latency and cost needs. Use POSIX timestamps for application logic and audits that require them, and use EFS policy, observed content access, and storage metrics to reason about lifecycle placement.
