# Validation Summary: How to Handle Spot Instance Interruptions Gracefully

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 Spot Instances
- EC2 Instance Metadata Service v2
- Amazon EventBridge
- AWS Lambda
- AWS CloudFormation
- Amazon EC2 Auto Scaling Capacity Rebalancing
- Elastic Load Balancing target groups
- AWS CLI
- AWS Fault Injection Service
- Python
- boto3

## Sources Consulted
- AWS EC2 User Guide: Spot Instance interruption notices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 User Guide: EC2 instance rebalance recommendations - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html
- Amazon EC2 Auto Scaling User Guide: Enable Capacity Rebalancing - https://docs.aws.amazon.com/autoscaling/ec2/userguide/enable-capacity-rebalancing-console-cli.html
- AWS CLI Command Reference: update-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS CLI Command Reference: deregister-targets - https://docs.aws.amazon.com/cli/latest/reference/elbv2/deregister-targets.html
- AWS CloudFormation Template Reference: AWS::Events::Rule - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS CloudFormation Template Reference: AWS::IAM::Role - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html
- AWS CloudFormation Template Reference: AWS::Lambda::Permission - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- AWS Fault Injection Service User Guide: aws:ec2:send-spot-instance-interruptions - https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html
- AWS Fault Injection Service tutorial: Test Spot Instance interruptions - https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html

## Issues Found
- The post stated that Spot interruptions always provide exactly 2 minutes of notice. Updated the wording to clarify that the 2-minute notice applies to stop and terminate interruptions, while hibernation begins immediately after the notice.
- The IMDSv2 polling example used a 300-second token without refreshing it, so the long-running monitor could stop detecting notices after token expiry. Increased the token TTL to 21600 seconds and added token refresh handling for 401 responses.
- The CloudFormation snippet referenced `LambdaRole` but did not define it, and it did not grant EventBridge permission to invoke the Lambda function. Added a Lambda execution role with log and SNS publish permissions, plus an `AWS::Lambda::Permission` resource for EventBridge invocation.
- The Capacity Rebalancing explanation implied replacement is guaranteed immediately. Updated it to say Auto Scaling attempts to launch replacement capacity after a rebalance recommendation.
- The load balancer deregistration script made an IMDSv1 request before obtaining an IMDSv2 token and included an invalid, unused `describe-target-health` call without the required target group ARN. Removed both issues.
- The checkpointing Python example used `time.time()` without importing `time`. Added the missing import.

## Review Notes
The examples are intentionally illustrative and still use placeholder ARNs, bucket names, script paths, and SNS topic names that readers must replace. The load balancer script deregisters the instance from all target groups and suppresses errors for groups where the instance is not registered; this works because the AWS ELBv2 `deregister-targets` API succeeds when the specified target is absent, but a production script could further narrow the target groups for efficiency.
