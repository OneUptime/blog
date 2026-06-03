# Validation Summary: How to Configure Elastic Beanstalk Auto Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Beanstalk
- Amazon EC2 Auto Scaling
- AWS Auto Scaling groups
- AWS CloudFormation
- Amazon CloudWatch metrics and alarms
- AWS CLI
- EC2 Spot Instances
- Elastic Load Balancing health checks

## Sources Consulted
- AWS Elastic Beanstalk Developer Guide: General options for all environments, including `aws:autoscaling:asg`, `aws:autoscaling:trigger`, `aws:autoscaling:launchconfiguration`, and `aws:ec2:instances` - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk Developer Guide: Auto Scaling health check setting for your Elastic Beanstalk environment - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environmentconfig-autoscaling-healthchecktype.html
- AWS Elastic Beanstalk Developer Guide: Spot Instance support for your Elastic Beanstalk environment - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-autoscaling-spot.html
- AWS CloudFormation Template Reference: `AWS::AutoScaling::ScheduledAction` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scheduledaction.html
- AWS CloudFormation Template Reference: `AWS::AutoScaling::ScalingPolicy` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scalingpolicy.html
- AWS CloudFormation Template Reference: `AWS::AutoScaling::ScalingPolicy TargetTrackingConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-scalingpolicy-targettrackingconfiguration.html
- Amazon EC2 Auto Scaling User Guide: Target tracking scaling policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- Amazon EC2 Auto Scaling User Guide: Scaling cooldowns - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html
- AWS CLI Command Reference: `autoscaling describe-auto-scaling-groups` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- AWS CLI Command Reference: `autoscaling describe-scaling-activities` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html

## Issues Found
- The post stated that CPU utilization is the default Elastic Beanstalk scaling trigger. AWS documentation lists `NetworkOut` as the default `aws:autoscaling:trigger` metric. Changed the text to describe CPU utilization as a common trigger and note that CPU must be set explicitly.
- The network scaling example used trigger thresholds of `100000000` and `20000000`; Elastic Beanstalk documents `UpperThreshold` and `LowerThreshold` valid values up to `20000000`. Changed the example to `10000000` and `2000000`.
- The scaling increment explanation described `UpperBreachScaleIncrement` as adding or removing instances. Split the explanation so upper increments add instances and lower increments remove instances.
- The instance configuration snippet used `aws:autoscaling:launchconfiguration` `InstanceType` together with `aws:ec2:instances` `InstanceTypes`. AWS marks `InstanceType` obsolete and says `InstanceTypes` takes precedence. Removed the obsolete `InstanceType` line.
- The Spot instance explanation said Elastic Beanstalk tries the first instance type and falls back to alternatives. AWS documents priority ordering only when `SpotAllocationStrategy` is `capacity-optimized-prioritized`; otherwise the allocation strategy determines placement. Updated the explanation.
- The scheduled scaling text did not mention that CloudFormation scheduled action cron expressions use UTC by default. Updated the description to say 8 AM UTC and 8 PM UTC.
- The target tracking CloudFormation example included `ScaleInCooldown` and `ScaleOutCooldown` inside `AWS::AutoScaling::ScalingPolicy` `TargetTrackingConfiguration`. Those fields are not valid for EC2 Auto Scaling target tracking policies. Removed them and added valid `EstimatedInstanceWarmup` on the scaling policy.
- The cooldown section claimed separate scale-in and scale-out cooldowns can be set for EC2 Auto Scaling target tracking policies. Updated it to describe `EstimatedInstanceWarmup` / default instance warmup and target tracking's gradual scale-in behavior.
- The health check grace period example used `Cooldown` and `ServiceRole`, which do not configure the Auto Scaling health check grace period. Replaced it with the Elastic Beanstalk documented `AWSEBAutoScalingGroup` CloudFormation override using `HealthCheckType: ELB` and `HealthCheckGracePeriod: 300`.

## Review Notes
The scheduled scaling example uses cron expressions without an explicit `TimeZone`; AWS runs scheduled actions in UTC by default. Future revisions could add `TimeZone` when local business hours matter.
