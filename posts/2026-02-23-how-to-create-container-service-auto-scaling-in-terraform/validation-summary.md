# Validation Summary: How to Create Container Service Auto Scaling in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Application Auto Scaling
- Amazon ECS Service Auto Scaling
- Amazon CloudWatch alarms
- AWS Application Load Balancer target tracking metrics
- Kubernetes Horizontal Pod Autoscaler v2
- KEDA ScaledObject

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_appautoscaling_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- HashiCorp AWS provider documentation for `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- AWS Application Auto Scaling API Reference for `PredefinedMetricSpecification`: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html
- HashiCorp Kubernetes provider documentation for `kubernetes_horizontal_pod_autoscaler_v2`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/horizontal_pod_autoscaler_v2
- Kubernetes documentation for Horizontal Pod Autoscaling: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.19/scalers/aws-sqs/

## Issues Found
- The `ALBRequestCountPerTarget` target tracking policy used `resource_label = "${aws_lb_target_group.api.arn_suffix}/${aws_lb.main.arn_suffix}"`. AWS requires the final load balancer ARN portion followed by the final target group ARN portion, so this was changed to `resource_label = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.api.arn_suffix}"`.
- The ECS step scaling section defined a scale-in policy but did not define a low-CPU CloudWatch alarm to trigger it. Added an `aws_cloudwatch_metric_alarm.low_cpu` alarm with `LessThanThreshold`, threshold `30`, and `alarm_actions = [aws_appautoscaling_policy.ecs_step_down.arn]` so the scale-in policy is actually invoked.

## Review Notes
- The HPA CPU and memory utilization examples are syntactically valid for `kubernetes_horizontal_pod_autoscaler_v2`, but these metrics require appropriate container resource requests and a working resource metrics pipeline in the cluster.
- The KEDA `aws-sqs-queue` trigger fields shown are current in KEDA 2.19. The referenced `authenticationRef` assumes a matching `TriggerAuthentication` resource exists.
