# Validation Summary: EFS Lifecycle Access Timer vs POSIX atime: Moving Files to IA and Archive

## Status

validated

## Post Type

Technical guide explaining EFS lifecycle behavior and a controlled validation experiment.

## Technologies Covered

- Amazon Elastic File System (EFS), Standard, Infrequent Access (IA), and Archive storage
- EFS lifecycle policies, General Purpose performance mode, and Elastic throughput
- AWS CLI and EFS APIs
- Amazon CloudWatch storage and I/O metrics
- NFS client caching and POSIX file timestamps
- Shell utilities and JSON configuration

## Sources Consulted

- [AWS: Managing storage lifecycle](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html)
- [AWS: PutLifecycleConfiguration](https://docs.aws.amazon.com/efs/latest/APIReference/API_PutLifecycleConfiguration.html)
- [AWS: DescribeLifecycleConfiguration](https://docs.aws.amazon.com/efs/latest/APIReference/API_DescribeLifecycleConfiguration.html)
- [AWS: LifecyclePolicy fields and supported values](https://docs.aws.amazon.com/efs/latest/APIReference/API_LifecyclePolicy.html)
- [AWS CLI: describe-lifecycle-configuration](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-lifecycle-configuration.html)
- [AWS CLI: describe-file-systems](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-systems.html)
- [AWS: Configuring lifecycle policies](https://docs.aws.amazon.com/efs/latest/ug/enable-lifecycle-management.html)
- [AWS: CloudWatch metrics for Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html)
- [AWS: Amazon EFS performance tips](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html)
- [AWS: Features of Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/features.html)
- [AWS: Amazon EFS FAQ](https://aws.amazon.com/efs/faq/)
- [GNU Coreutils: touch invocation](https://www.gnu.org/s/coreutils/manual/html_node/touch-invocation.html)
- Installed system manuals: `man touch` and `man find`, for timestamp options and access-time filtering.

## Issues Found

1. **Backdating example omitted a timestamp.** `touch -a` alone sets access time to the current time. Changed the inline example to `touch -a -t 202601010000 existing-file`, which supplies an explicit past timestamp. This preserves the intended explanation about the independence of POSIX timestamps and the EFS lifecycle timer.
2. **Return-policy wording implied permanent promotion.** Replaced “permanent promotion” with promotion to Standard and clarified that an inactive promoted file can transition back to IA or Archive under its configured policy. `AFTER_1_ACCESS` does not pin a file in Standard permanently.

## Review Notes

- Confirmed that EFS uses an internal access timer, that metadata inspection does not count as content access, and that metadata stays in Standard. The backdated-migration conclusion follows from the internal timer being independent of POSIX attributes.
- Confirmed that lifecycle policies apply to the entire file system and that transitions run with lower priority than workload operations. Eligibility does not guarantee immediate movement.
- Confirmed the JSON keys and enum values, the one-transition-per-object structure, the ordering of IA and Archive thresholds, and the Regional/General Purpose/Elastic configuration. Thresholds are measured from access in Standard rather than added together.
- Verified both AWS CLI operations, `--file-system-id`, and the `FileSystems[0].SizeInBytes` response path. The empty array is the `LifecyclePolicies` field in the response object. The sample file system ID must be replaced with an actual ID; credentials, permissions, and a region must be configured.
- Confirmed the storage-class totals and small-file overhead metrics. `StorageBytes` is emitted every 15 minutes; `SizeInBytes` is eventually consistent, not an instantaneous snapshot. Aggregate measurements cannot establish an individual pathname's storage class.
- Confirmed the client-cache caveat against AWS performance guidance. Application reads need not correspond one-for-one to server I/O.
- All AWS documentation links in the post resolved to the intended resources. No deprecated APIs or explicit software-version claims were found.
- Parsed the JSON example and validation metadata and checked both fenced shell commands with `bash -n`. No live AWS commands or multi-day lifecycle experiment were run; this review validates documented behavior and syntax rather than an observed deployment.
