# Validation Summary: How to Use EBS-Optimized Instances for Better I/O Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2
- Amazon EBS
- AWS CLI
- Amazon CloudWatch metrics
- Linux block device tuning
- mdadm RAID 0
- fio

## Sources Consulted
- AWS EC2 User Guide: Amazon EBS-optimized instance types: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html
- AWS EBS User Guide: Amazon EBS volume performance: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-performance.html
- AWS EBS User Guide: Amazon EBS General Purpose SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- AWS EBS User Guide: Amazon CloudWatch metrics for Amazon EBS: https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html
- AWS EBS User Guide: Amazon EBS and RAID configuration: https://docs.aws.amazon.com/ebs/latest/userguide/raid-config.html
- AWS EBS User Guide: Initialize Amazon EBS volumes: https://docs.aws.amazon.com/ebs/latest/userguide/initalize-volume.html
- AWS CLI Command Reference: run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: modify-instance-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: describe-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: modify-volume: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html

## Issues Found
- The post said m4, c4, r4, d2, and i3 require explicit EBS optimization. AWS currently lists these families as EBS-optimized by default. Updated the optional and unsupported instance lists to match AWS documentation.
- The launch example used `m4.large` in the optional EBS optimization section, but `m4.large` is EBS-optimized by default. Changed the example to `c3.xlarge`, an older type that supports optional EBS optimization.
- The post stated EBS bandwidth could reach up to 19,000 Mbps. Current AWS instance tables include higher EBS bandwidth values on newer large instances, so the wording was generalized to "tens of thousands of Mbps."
- The gp3 performance limits were outdated at 16,000 IOPS and 1,000 MB/s. Updated gp3 references to current limits of up to 80,000 IOPS and 2,000 MiB/s, with the 100 GiB example kept valid and units corrected to GiB/MiB.
- The CloudWatch example used `VolumeThroughputPercentage` to check throughput limits. AWS documents that metric as a Provisioned IOPS SSD percentage metric, not a general throughput-limit check. Replaced it with `VolumeThroughputExceededCheck` and added the required Nitro instance context and `InstanceId` dimension.
- The read-ahead tuning advice used a 2 MiB setting and applied broadly to sequential workloads. AWS recommends 1 MiB read-ahead specifically for high-throughput, read-heavy `st1` and `sc1` workloads, so the section and command were narrowed accordingly.
- The RAID 0 section implied RAID 0 is acceptable for most workloads because EBS volumes are replicated within an Availability Zone. AWS cautions that losing one volume in a RAID 0 set causes complete array data loss. Updated the caveat to recommend RAID 0 only when performance is more important than array-level fault tolerance and backups/snapshots are in place.

## Review Notes
The AWS CLI binary was not installed in the workspace, so command syntax was checked against the official AWS CLI command reference instead of local `--help` output. The Linux I/O scheduler advice is common for NVMe/EBS workloads, but it is workload and distribution dependent; it may be worth expanding in a future post with OS-specific guidance.
