# Validation Summary: How to Configure EBS Multi-Attach for Shared Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EBS Multi-Attach
- Amazon EC2
- AWS CLI
- Amazon CloudWatch metrics and alarms
- GFS2
- Pacemaker, Corosync, pcs, DLM, and STONITH/fencing
- Linux filesystem mounting

## Sources Consulted
- AWS EBS User Guide: Attach an EBS volume to multiple EC2 instances using Multi-Attach: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html
- AWS EBS User Guide: Enable Multi-Attach for an Amazon EBS volume: https://docs.aws.amazon.com/ebs/latest/userguide/working-with-multi-attach.html
- AWS CLI Command Reference: ec2 create-volume: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS EBS User Guide: Attach an Amazon EBS volume to an Amazon EC2 instance: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html
- AWS EBS User Guide: Performance for Multi-Attach Amazon EBS volumes: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-multi-attach-perf.html
- AWS EBS User Guide: Amazon CloudWatch metrics for Amazon EBS: https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html
- Red Hat Enterprise Linux 8 docs: GFS2 file systems in a cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_gfs2_file_systems/assembly_configuring-gfs2-in-a-cluster-configuring-gfs2-file-systems
- AWS Storage Blog: Clustered storage simplified: GFS2 on Amazon EBS Multi-Attach enabled volumes: https://aws.amazon.com/blogs/storage/clustered-storage-simplified-gfs2-on-amazon-ebs-multi-attach-enabled-volumes/

## Issues Found
- The post said Multi-Attach must be enabled at volume creation and cannot be enabled on an existing volume. AWS now documents that Multi-Attach can be enabled after creation for detached io2 volumes, but not for io1 volumes. Updated the text to distinguish io2 from io1.
- The package installation example used a generic `fence-agents` package and labeled the example as Amazon Linux 2 / RHEL. For the EC2-focused GFS2 pattern, AWS and Red Hat examples use EC2 fencing such as `fence-agents-aws`; updated the package and narrowed the platform wording to RHEL-compatible systems.
- The GFS2 cluster setup omitted the need for configured STONITH/fencing before DLM resources that use `on-fail=fence`. Added a short warning in the command block so the example is not presented as a safe unfenced cluster.
- The read-only shared volume example mounted `/data` without creating it and suggested a read-only remount while a writer could still be active. Added `mkdir -p /data` and changed the refresh step to unmount and mount again after the writer is done.
- The persistence step recommended adding a GFS2 mount directly to `/etc/fstab`. Red Hat recommends Pacemaker-managed filesystem resources for clustered GFS2 mounts. Replaced the fstab command with a cloned Pacemaker `Filesystem` resource.
- The limitations section said there is no I/O fencing by default. AWS documents NVMe reservation based I/O fencing support for io2 Multi-Attach volumes, while applications still need correct fencing and write ordering. Updated the limitation.
- The limitations section omitted io1 regional constraints. Added that io1 Multi-Attach is available only in selected Regions, while io2 Multi-Attach is available in Regions that support io2.

## Review Notes
The AWS CLI syntax for `create-volume`, `attach-volume`, `describe-volumes`, CloudWatch `put-metric-alarm`, and CloudWatch `get-metric-statistics` is current and consistent with AWS documentation. The GFS2 and Pacemaker examples remain simplified; a production deployment still needs fully configured EC2 fencing, quorum policy, node identities, IAM permissions for fence agents, and filesystem resource ordering appropriate to the chosen distribution.
