# Validation Summary: How to Create CloudWatch Alarms for ECS Service Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon CloudWatch metrics and alarms
- CloudWatch Container Insights
- Amazon EventBridge
- Amazon SNS
- AWS CLI
- AWS CloudFormation

## Sources Consulted
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon ECS service utilization metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_utilization.html
- Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- AWS CLI cloudwatch put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI cloudwatch put-composite-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- AWS CLI ecs update-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-cluster.html
- Amazon ECS task state change events: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_task_events.html
- Amazon ECS stopped task EventBridge/SNS alert guide: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_cwet2.html
- Amazon EventBridge event pattern syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- Amazon EventBridge comparison operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- AWS CloudFormation AWS::CloudWatch::Alarm reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html

## Issues Found
- The EventBridge rule claimed to detect non-zero container exits, but the event pattern did not filter on `exitCode`. Added an EventBridge numeric filter for `detail.containers.exitCode > 0`.
- The EventBridge deployment exclusion used an incomplete exact `stoppedReason` string. Replaced it with the documented `anything-but` plus `prefix` pattern so normal ECS deployment replacement stops are excluded by prefix.
- The prerequisites mentioned an SNS topic but not the SNS topic policy needed for EventBridge to publish to that topic. Added the missing permission prerequisite.
- The memory alarm explanation said it should have a lower evaluation period than the CPU alarm, but the examples used the same evaluation settings. Reworded the guidance to say memory alarms often need a shorter evaluation window.
- The stuck deployment alarm said it detected `running != desired`, but the expression only detected `running < desired` and could miss rolling deployments where multiple deployments exist while running task count is not below desired. Replaced it with a `DeploymentCount > 1` Container Insights alarm for 15 minutes.
- The composite alarm did not include the deployment-stuck alarm created in the preceding step. Added `my-service-deployment-stuck` to the composite alarm rule.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI option validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
