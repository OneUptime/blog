# Validation Summary: How to Configure Aurora Auto Scaling for Read Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS
- AWS Application Auto Scaling
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Aurora User Guide: Amazon Aurora Auto Scaling with Aurora Replicas, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html
- AWS Aurora User Guide: Adding an auto scaling policy to an Amazon Aurora DB cluster, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.Add.html
- AWS Application Auto Scaling User Guide: Amazon Aurora and Application Auto Scaling, https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-aurora.html
- AWS CloudFormation Template Reference: AWS::ApplicationAutoScaling::ScalableTarget, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- AWS CloudFormation User Guide: Configure Application Auto Scaling resources with CloudFormation, https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-application-auto-scaling.html
- Terraform Registry: aws_appautoscaling_policy, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy

## Issues Found
- The console instructions incorrectly pointed readers to an Actions menu. AWS documents the Aurora Auto Scaling policy flow through the cluster's Logs & events tab, then the Auto scaling policies section. Updated the steps to match the documented console path.
- The database connections example was presented as a custom CloudWatch metric and omitted the reader role dimension that Aurora uses for reader metrics. AWS provides `RDSReaderAverageDatabaseConnections` as a predefined Aurora Auto Scaling metric, so the section and CLI JSON were updated to use that predefined metric.
- The CloudFormation snippet defined a custom IAM role with the wrong service principal for Aurora Application Auto Scaling and an invalid `service-role/AmazonRDSFullAccess` managed policy ARN. Replaced it with the documented Aurora Application Auto Scaling service-linked role ARN.

## Review Notes
- The AWS CLI commands, scalable dimension (`rds:cluster:ReadReplicaCount`), CPU predefined metric (`RDSReaderAverageCPUUtilization`), Terraform resource structure, and verification commands are consistent with current AWS and Terraform documentation.
- Aurora Auto Scaling min and max capacity values are bounded at 0-15 replicas, and the policy requires at least one reader instance for metrics to evaluate. The post's example capacities stay within that range.
- The referenced OneUptime internal links returned HTTP 200 during review.
