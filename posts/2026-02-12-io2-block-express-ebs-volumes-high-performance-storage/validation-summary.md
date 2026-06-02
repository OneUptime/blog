# Validation Summary: How to Use io2 Block Express EBS Volumes for High-Performance Storage

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon EBS
- io2 Block Express volumes
- Amazon EC2 Nitro-based instances
- AWS CLI
- Linux NVMe block devices
- XFS and ext4 filesystems
- fio benchmarking
- Amazon CloudWatch alarms

## Sources Consulted
- Amazon EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Amazon EBS Provisioned IOPS SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html
- Amazon EBS optimization: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-optimization.html
- Amazon EBS volumes and NVMe: https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html
- Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Modify an Amazon EBS volume using Elastic Volumes operations: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html
- AWS CLI create-volume command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI describe-instance-types command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-types.html
- AWS CLI put-metric-alarm command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/
- fio documentation: https://fio.readthedocs.io/en/master/fio_doc.html

## Issues Found
- The post described "regular io2" volumes as a separate lower-performance category. AWS now documents all new and existing io2 volumes as io2 Block Express as of April 30, 2025, so the comparison was changed to gp3, io1, and io2 Block Express.
- The gp3 limits in the comparison table were outdated. Updated gp3 maximum IOPS, throughput, and size to match current AWS EBS volume type documentation.
- The io1 durability entry in the comparison table was incorrect after replacing the stale io2 column. It now reflects AWS's documented 99.8-99.9% durability for io1.
- The prerequisites listed a fixed set of Block Express instance families. Current AWS documentation frames the full io2 Block Express performance envelope around Nitro-based instances and instance EBS bandwidth, so the list was replaced with a Nitro/EBS limits check.
- The `aws ec2 describe-instance-types` query only returned EBS optimized information and did not show whether the instance was Nitro-based. The query now includes `Hypervisor`, EBS optimization support, maximum IOPS, and maximum throughput.
- The `aws ec2 create-volume` example used `--throughput` with an io2 volume. AWS CLI documents `--throughput` as supported only for gp3 volumes, so that option was removed and the io2 throughput scaling rule was added.
- The fio benchmark examples targeted `/dev/nvme1n1` after the post had formatted and mounted that device. Running write tests against the raw block device at that point could corrupt the filesystem, so the benchmark target was changed to `/data/fio-testfile`.
- The volume modification section described a six-hour cooldown. Current AWS documentation says the previous modification must reach `completed` and each volume can be modified up to four times in a rolling 24-hour period, so the text was updated.
- The queue tuning comment said "increase" even though `nr_requests` defaults vary by distribution and kernel. The wording was changed to "set" to avoid an inaccurate universal claim.

## Review Notes
- The CloudWatch alarm command is syntactically valid, but it alarms only on `VolumeReadOps`; a production alarm should usually account for write operations too, either with a second alarm or metric math.
- The price example matches the documented us-east-1 style io2 pricing tiers at review time, but AWS pricing is region-specific and can change.
