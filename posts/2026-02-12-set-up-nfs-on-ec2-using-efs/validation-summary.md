# Validation Summary: How to Set Up NFS on EC2 Using EFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EFS
- Amazon EC2
- Amazon VPC security groups
- AWS CLI
- NFSv4.1
- Amazon EFS mount helper (`amazon-efs-utils`)
- AWS Backup
- Amazon CloudWatch

## Sources Consulted
- Amazon EFS User Guide: How Amazon EFS works - https://docs.aws.amazon.com/efs/latest/ug/how-it-works.html
- Amazon EFS User Guide: Managing mount targets - https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- AWS CLI Command Reference: `efs create-file-system` - https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html
- AWS CLI Command Reference: `efs create-mount-target` - https://docs.aws.amazon.com/cli/latest/reference/efs/create-mount-target.html
- AWS CLI Command Reference: `efs create-access-point` - https://docs.aws.amazon.com/cli/latest/reference/efs/create-access-point.html
- Amazon EFS User Guide: Mounting EFS file systems using the EFS mount helper - https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- Amazon EFS User Guide: Enabling automatic mounting using NFS - https://docs.aws.amazon.com/efs/latest/ug/nfs-automount-efs.html
- Amazon EFS User Guide: Installing the Amazon EFS client - https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html
- Amazon EFS User Guide: Amazon EFS quotas - https://docs.aws.amazon.com/efs/latest/ug/limits.html
- Amazon EFS User Guide: Managing file system throughput - https://docs.aws.amazon.com/efs/latest/ug/managing-throughput.html
- Amazon EFS API Reference: PutLifecycleConfiguration - https://docs.aws.amazon.com/efs/latest/ug/API_PutLifecycleConfiguration.html
- Amazon EFS User Guide: Backing up EFS file systems - https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html
- Amazon EFS Pricing - https://aws.amazon.com/efs/pricing/

## Issues Found
- The introduction implied AWS handles backups automatically for the CLI-created filesystem. Updated it to say EFS integrates with AWS Backup and backups can be enabled, because automatic backups are default for console-created file systems and CLI/API-created One Zone file systems, but not all CLI/API-created Regional file systems.
- The throughput note said Elastic throughput scales up to 10 GB/s. Updated it to describe workload-based scaling subject to regional quotas, because current EFS quotas vary by Region and distinguish read and write throughput.
- The Ubuntu install comment used `apt-get install amazon-efs-utils`, which AWS does not document as the default Ubuntu installation path. Updated it to refer to the AWS efs-utils DEB package or AWS Systems Manager.
- The performance tips said EFS charges per request. Updated it to refer specifically to metadata operations and Elastic throughput billing, which is the current documented billing model.
- The lifecycle command used shorthand for multiple policies, but AWS examples show a JSON list with one transition per lifecycle policy. Replaced it with the documented JSON structure and added the Archive prerequisite: Elastic throughput and General Purpose performance mode.

## Review Notes
The fixed NFS examples use `us-east-1` as a placeholder Region. The commands are syntactically valid, but a future improvement would be to parameterize the Region with `AWS_REGION` for copy/paste use outside `us-east-1`.
