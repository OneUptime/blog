# Validation Summary: How to Configure Auto-Scaling Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 Auto Scaling
- AWS Application Auto Scaling
- AWS CloudFormation
- Amazon ECS
- Amazon DynamoDB
- Amazon CloudWatch
- Kubernetes Horizontal Pod Autoscaler
- KEDA
- Python

## Sources Consulted
- AWS CloudFormation: AWS::AutoScaling::ScalingPolicy - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scalingpolicy.html
- AWS CloudFormation: AWS::AutoScaling::ScalingPolicy TargetTrackingConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-scalingpolicy-targettrackingconfiguration.html
- AWS CloudFormation: AWS::AutoScaling::ScalingPolicy PredictiveScalingConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-scalingpolicy-predictivescalingconfiguration.html
- AWS CloudFormation: AWS::ApplicationAutoScaling::ScalableTarget - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- AWS CloudFormation: AWS::ApplicationAutoScaling::ScalingPolicy - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalingpolicy.html
- AWS Application Auto Scaling API: PredefinedMetricSpecification - https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html
- AWS CloudFormation: AWS::AutoScaling::ScheduledAction - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-scheduledaction.html
- Amazon EC2 Auto Scaling metrics - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-metrics.html
- Kubernetes Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- KEDA AWS SQS Queue scaler - https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA Apache Kafka scaler - https://keda.sh/docs/2.20/scalers/apache-kafka/

## Issues Found
- The EC2 Auto Scaling target tracking example used `ScaleInCooldown` and `ScaleOutCooldown` inside `TargetTrackingConfiguration`, but those fields are not valid for `AWS::AutoScaling::ScalingPolicy` target tracking. Removed them and added `EstimatedInstanceWarmup`, which is the supported timing control for EC2 target tracking and step scaling policies.
- The predictive scaling snippet described `SchedulingBufferTime` as analyzing 14 days of history. That property controls how far in advance predicted capacity is launched, so the comment was corrected.
- The ECS Application Auto Scaling request-count example modeled `RequestCountPerTarget` as a custom metric with incomplete dimensions. Replaced it with the supported `ALBRequestCountPerTarget` predefined metric and `ResourceLabel`.
- The best-practices cooldown snippet used the EC2 Auto Scaling `TargetTrackingConfiguration` name with Application Auto Scaling cooldown fields. Renamed the snippet to `TargetTrackingScalingPolicyConfiguration`, where `ScaleInCooldown` and `ScaleOutCooldown` are valid.
- The multiple-metrics CloudFormation example omitted required `AutoScalingGroupName` values for `AWS::AutoScaling::ScalingPolicy`; added them.
- The CloudWatch monitoring section attempted to count scaling actions with `SampleCount` on `GroupTotalInstances`, which measures datapoints for the group-total metric rather than scaling activities. Replaced it with a valid low in-service capacity alarm using `GroupInServiceInstances`.
- The ASG examples referenced AWS/AutoScaling group metrics without enabling group metrics collection. Added `MetricsCollection` to the Auto Scaling group.
- The scheduled scaling comments did not state the time zone. Added `TimeZone: Etc/UTC` and updated comments to make the cron timing explicit.

## Review Notes
The snippets are illustrative and still reference surrounding resources such as launch templates, load balancers, target groups, IAM roles, and notifications that are not fully defined in the post. That is acceptable for a guide, but readers would need complete resource definitions before deploying the templates.
