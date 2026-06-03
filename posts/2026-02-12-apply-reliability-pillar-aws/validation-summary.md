# Validation Summary: How to Apply the Reliability Pillar on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Framework Reliability pillar
- Amazon CloudWatch alarms and AWS/Usage metrics
- Amazon EC2 auto recovery
- Amazon EC2 Auto Scaling
- Amazon RDS Multi-AZ and read replicas
- Amazon DynamoDB global tables and point-in-time recovery
- Amazon ECS deployment circuit breaker
- AWS Backup and restore testing
- AWS Fault Injection Service
- Terraform AWS provider

## Sources Consulted
- AWS Well-Architected Reliability pillar: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
- AWS Well-Architected disaster recovery strategies: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html
- Amazon CloudWatch usage metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html
- Amazon EC2 CloudWatch recovery alarms: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cloudwatch-recovery.html
- Amazon RDS Multi-AZ DB instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon RDS read replica promotion: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- DynamoDB point-in-time recovery: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Amazon ECS deployment circuit breaker: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- AWS FIS stop conditions: https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html
- Terraform AWS provider aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider aws_fis_experiment_template: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fis_experiment_template
- Terraform AWS provider aws_backup_restore_testing_plan: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_restore_testing_plan
- Terraform AWS provider aws_backup_restore_testing_selection: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_restore_testing_selection

## Issues Found
- The RDS read replica description said replicas "serve as failover targets," which could imply automatic failover. Changed it to "provide manual promotion targets" because RDS read replicas are promoted to standalone DB instances through an explicit promotion operation.
- The Pilot Light disaster recovery RTO/RPO values were listed as minutes RTO and seconds RPO. Updated them to tens of minutes RTO and minutes RPO to match AWS Well-Architected guidance.
- The backup testing example claimed to show an AWS Backup restore testing plan but used `aws_backup_plan`, which only defines scheduled backups. Replaced it with `aws_backup_restore_testing_plan` and `aws_backup_restore_testing_selection`.

## Review Notes
The snippets are illustrative and still reference surrounding resources such as IAM roles, backup vaults, launch templates, and SNS topics that would need to be defined in a complete Terraform module.
