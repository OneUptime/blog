# Validation Summary: How to Automate EBS Snapshot Lifecycle with Data Lifecycle Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Data Lifecycle Manager (DLM)
- Amazon EC2
- Amazon EBS snapshots
- AWS CLI
- IAM service roles and managed policies
- Terraform AWS provider
- AWS Backup
- Fast Snapshot Restore

## Sources Consulted
- AWS DLM API Reference: CreateLifecyclePolicy: https://docs.aws.amazon.com/dlm/latest/APIReference/API_CreateLifecyclePolicy.html
- AWS EBS User Guide: How Amazon Data Lifecycle Manager works: https://docs.aws.amazon.com/ebs/latest/userguide/dlm-elements.html
- AWS EBS User Guide: Create Amazon Data Lifecycle Manager custom policy for EBS snapshots: https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-ami-policy.html
- AWS EBS User Guide: IAM service roles for Amazon Data Lifecycle Manager: https://docs.aws.amazon.com/ebs/latest/userguide/service-role.html
- AWS Managed Policy Reference: AWSDataLifecycleManagerServiceRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSDataLifecycleManagerServiceRole.html
- AWS EBS User Guide: Amazon EBS snapshots: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- AWS EBS User Guide: How Amazon EBS snapshots work: https://docs.aws.amazon.com/ebs/latest/userguide/how_snapshots_work.html
- AWS EBS User Guide: View Amazon EBS snapshot information: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-describing-snapshots.html
- AWS CLI Command Reference: enable-fast-snapshot-restores: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/enable-fast-snapshot-restores.html
- AWS Backup Pricing: https://aws.amazon.com/backup/pricing/
- Terraform AWS Provider documentation for aws_dlm_lifecycle_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dlm_lifecycle_policy

## Issues Found
- The cross-Region copy AWS CLI example used `TargetRegion` inside `CrossRegionCopyRules`. Current DLM API documentation says custom snapshot policies should use `Target`, so the example was updated to `"Target": "us-west-2"`.
- The first lifecycle policy description implied snapshots are created exactly at 03:00 UTC. AWS documents that DLM starts snapshot creation within an hour of the scheduled time, so the wording was corrected.
- The cost section labeled `sum(Snapshots[].VolumeSize)` as total snapshot storage in use. `VolumeSize` is the source/restored volume size and does not represent billed incremental snapshot storage, so the comment and explanation were corrected.
- The DLM vs AWS Backup table understated DLM cross-account capabilities. Current DLM supports cross-account snapshot sharing/copy workflows, so the row was updated.
- The cost comparison for AWS Backup said users only pay for storage. AWS Backup pricing also includes data transfer, restore, and backup evaluation charges, so the row was updated.

## Review Notes
The AWS CLI and Terraform binaries were not installed in the local environment, so command and configuration validation was performed against official AWS and HashiCorp documentation instead of local help output. The Terraform snippet matches the current provider documentation patterns for `aws_dlm_lifecycle_policy`.
