# Validation Summary: How to Set Up Backup and Restore Disaster Recovery on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS Backup cross-region copy
- AWS Backup restore jobs
- Amazon EC2 and EBS backups
- Amazon RDS backups and restores
- Amazon S3 Cross-Region Replication
- AWS CLI
- boto3
- AWS CloudFormation
- Elastic Load Balancing
- Amazon EC2 Auto Scaling
- Amazon Route 53
- Amazon CloudWatch

## Sources Consulted
- AWS Backup cross-region copy documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html
- AWS Backup lifecycle API documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup plan options and configuration: https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html
- AWS Backup IAM service roles documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWS Backup Amazon S3 backups documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/s3-backups.html
- AWS Backup RDS restore documentation: https://docs.aws.amazon.com/en_us/aws-backup/latest/devguide/restoring-rds.html
- AWS Backup EC2 restore documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-ec2.html
- AWS CLI `backup create-backup-plan` reference: https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI `backup start-restore-job` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/backup/start-restore-job.html
- AWS CLI `s3api put-bucket-replication` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- Amazon S3 PutBucketReplication API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketReplication.html
- AWS CloudFormation `AWS::ElasticLoadBalancingV2::LoadBalancer` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-loadbalancer.html
- AWS CloudFormation `AWS::AutoScaling::AutoScalingGroup` launch template reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-autoscalinggroup-launchtemplatespecification.html
- AWS CloudFormation `AWS::EC2::SecurityGroup` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroup.html

## Issues Found
- The backup plan moved daily backups to cold storage after 7 days but deleted them after 35 days. AWS Backup requires `DeleteAfterDays` to be at least 90 days after `MoveToColdStorageAfterDays`, so I changed the daily rule and copy lifecycle to move after 8 days and delete after 98 days.
- The post said S3 was not covered by AWS Backup cross-region copy. AWS Backup now supports Amazon S3 backups and cross-region copies, so I updated the wording to explain that CRR is still useful for continuous object replication.
- The AWS Backup IAM role ARN used `role/AWSBackupServiceRole`. AWS documents the default service role as `role/service-role/AWSBackupDefaultServiceRole`, so I updated the backup selection and restore script examples.
- The CloudFormation snippet referenced `DRSecurityGroup` and `DRLaunchTemplate` without defining them. I added those resources.
- The CloudFormation snippet created an ALB and Auto Scaling group but did not include public routing, a target group, a listener, or target group attachment. I added the minimal VPC routing, ALB listener, target group, and ASG attachment needed for the DR endpoint described in the runbook.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI validation was performed against official AWS CLI and AWS service documentation rather than local `--help` output.
- The restore script is intentionally illustrative. AWS Backup restore metadata is resource-specific, and production runbooks should retrieve and adapt metadata with `GetRecoveryPointRestoreMetadata` before calling `StartRestoreJob`.
