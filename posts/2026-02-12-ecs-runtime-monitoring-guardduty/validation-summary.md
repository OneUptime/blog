# Validation Summary: How to Use ECS Runtime Monitoring with GuardDuty

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon GuardDuty Runtime Monitoring
- Amazon ECS
- AWS Fargate
- Amazon EC2
- AWS Systems Manager
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- AWS CloudFormation

## Sources Consulted
- Amazon GuardDuty User Guide: GuardDuty Runtime Monitoring: https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html
- Amazon GuardDuty User Guide: How Runtime Monitoring works with Fargate (Amazon ECS only): https://docs.aws.amazon.com/guardduty/latest/ug/how-runtime-monitoring-works-ecs-fargate.html
- Amazon GuardDuty User Guide: Managing automated security agent for Fargate (Amazon ECS only): https://docs.aws.amazon.com/guardduty/latest/ug/managing-gdu-agent-ecs-automated.html
- Amazon GuardDuty User Guide: Prerequisites for AWS Fargate (Amazon ECS only) support: https://docs.aws.amazon.com/guardduty/latest/ug/prereq-runtime-monitoring-ecs-support.html
- Amazon GuardDuty User Guide: How Runtime Monitoring works with Amazon EC2 instances: https://docs.aws.amazon.com/guardduty/latest/ug/how-runtime-monitoring-works-ec2.html
- Amazon GuardDuty User Guide: Prerequisites for Amazon EC2 instance support: https://docs.aws.amazon.com/guardduty/latest/ug/prereq-runtime-monitoring-ec2-support.html
- Amazon GuardDuty User Guide: Runtime coverage and troubleshooting for Amazon ECS clusters: https://docs.aws.amazon.com/guardduty/latest/ug/gdu-assess-coverage-ecs.html
- AWS CLI Command Reference: guardduty update-detector: https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-detector.html
- AWS CLI Command Reference: guardduty list-coverage: https://docs.aws.amazon.com/cli/latest/reference/guardduty/list-coverage.html
- AWS CLI Command Reference: guardduty get-coverage-statistics: https://docs.aws.amazon.com/cli/latest/reference/guardduty/get-coverage-statistics.html
- AWS CloudFormation Template Reference: AWS::GuardDuty::Detector CFNFeatureConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-guardduty-detector-cfnfeatureconfiguration.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon VPC User Guide: Security group rules: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html
- Amazon GuardDuty User Guide: GuardDuty Runtime Monitoring finding types: https://docs.aws.amazon.com/guardduty/latest/ug/findings-runtime-monitoring.html
- Amazon GuardDuty User Guide: Remediating Runtime Monitoring findings: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-remediate-runtime-monitoring.html

## Issues Found
- The post said Fargate monitoring could be controlled by tagging clusters or services. AWS documents the `GuardDutyManaged` include/exclude tags for Amazon ECS clusters, so the service exclusion example was changed to a cluster exclusion example.
- The post implied GuardDuty immediately adds the sidecar to all Fargate tasks. AWS documents that the sidecar is added to new standalone Fargate tasks and new service deployments, so a note was added to restart or force a new deployment for existing services.
- The EC2 launch type section implied the agent is automatically installed on ECS-optimized AMIs. AWS documents EC2 agent auto-management through Systems Manager for supported SSM-managed instances, so the explanation was corrected.
- The verification section described checking individual task coverage with `get-coverage-statistics`. That command returns aggregated coverage statistics, so the wording was corrected.
- The EventBridge-to-SNS examples did not include the SNS resource policy needed to allow EventBridge to publish to the topic. A publish permission example was added to the CLI flow and an `AWS::SNS::TopicPolicy` resource was added to the CloudFormation template.
- The performance section claimed AWS reports less than 1% CPU overhead and memory typically under 50 MB. Current AWS documentation describes slight overhead and published CPU/memory limits; for Fargate the GuardDuty container memory limit starts at 128 MB. The statement was replaced with the documented limits-based wording.
- The incident response section said a newly created security group has no ingress or egress rules by default. New security groups have no inbound rules but include a default allow-all outbound rule, so the isolation example now captures the security group ID and removes the default egress rule before use.

## Review Notes
The AWS CLI GuardDuty feature names, additional configuration names, coverage filter shape, CloudFormation GuardDuty feature configuration, Fargate platform version 1.4.0 requirement, and Runtime Monitoring finding categories were checked against current AWS documentation and are technically valid after the edits.
