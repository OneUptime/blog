# Validation Summary: Why One EFS Client Stops Near 500 MiB/s: Client-Version Limits, NFS Parallelism, and Elastic Throughput

## Status
validated

## Post Type
Technical troubleshooting and performance guide.

## Technologies Covered
- Amazon EFS throughput modes, performance limits, and CloudWatch metrics
- Amazon EC2 network bandwidth
- Linux NFS clients, mount inspection, and amazon-efs-utils
- AWS CLI and JMESPath response filtering
- Amazon ECS, Amazon EKS, and the Amazon EFS CSI driver

## Sources Consulted
- EFS performance specifications: https://docs.aws.amazon.com/efs/latest/ug/performance.html
- EFS CloudWatch metrics: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- EFS performance tips: https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html
- EC2 network bandwidth: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- EFS client installation: https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html
- AWS CLI describe-file-systems reference: https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-systems.html
- AWS EFS client repository: https://github.com/aws/efs-utils
- AWS mount helper argument handling: https://raw.githubusercontent.com/aws/efs-utils/master/src/mount_efs/__init__.py
- AWS mount helper manual: https://raw.githubusercontent.com/aws/efs-utils/master/man/mount.efs.8
- EKS EFS CSI documentation: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- ECS EFS volume documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html
- util-linux findmnt manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- nfs-utils nfsstat manual: https://man7.org/linux/man-pages/man8/nfsstat.8.html
- GNU coreutils uname manual: https://man7.org/linux/man-pages/man1/uname.1.html

## Issues Found
- The CloudWatch comparison omitted the required statistics and time units. Replaced `MeteredIOBytes / period` with the `Sum` of `MeteredIOBytes` divided by seconds, compared with the `Average` of `PermittedThroughput` over the same interval. Using the average byte metric would instead measure average operation size and produce a misleading utilization calculation.

## Review Notes
- Confirmed the documented combined per-client ceiling of 1,500 MiB/s for eligible Regional Elastic configurations with EFS client or CSI driver version 2.0 or later. The performance table separately lists One Zone, Regional Provisioned, and Regional Bursting at 500 MiB/s. These remain upper bounds, not guaranteed workload rates.
- Confirmed throughput metering discounts reads, Bursting depends on credits, and application byte rates must not be substituted directly for metered throughput utilization.
- Verified AWS CLI flags and response fields. AvailabilityZoneName applies only to One Zone; its absence produces a null AZ value for Regional file systems. The example ID is a placeholder requiring a real file system, appropriate Region, credentials, and DescribeFileSystems permission.
- Verified mount.efs --version in AWS source, uname -r for kernel release, findmnt raw/headerless output and NFS filtering, and nfsstat -m for mounted NFS information. These commands require the relevant Linux utilities and inspect the caller's mount namespace.
- Confirmed the conversion: 500 × 1,048,576 × 8 / 1,000,000,000 = 4.194304 Gbit/s before overhead. Instance bandwidth, shared traffic, CPU, request sizes, caching, and concurrency are valid diagnostic considerations.
- Confirmed AWS guidance on parallel workloads, distinct datasets, larger requests, and retaining attribute caches. The controlled scaling experiment is diagnostic reasoning and requires comparable conditions and remote I/O evidence, as the post describes.
- Confirmed ECS and EKS mounts can be managed outside application containers; EKS documents the CSI driver's transition to efs-proxy at version 2.0.0. Installed package version alone does not establish the running mount's implementation.
- All five AWS documentation links in the post resolved to the intended resources. No deprecated command options or APIs were identified.
- Both shell blocks passed bash syntax checks. An offline AWS CLI output-skeleton check was attempted, but the installed CLI generated an invalid zero ProvisionedThroughputInMibps value and failed its own output validation. Command correctness was therefore checked against the official CLI reference; no live AWS API call, Linux mount inspection, upgrade, or throughput benchmark was performed.
