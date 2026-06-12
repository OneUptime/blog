# Validation Summary: How to Implement Load Balancer Autoscaling

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS EC2 Auto Scaling
- AWS Application Load Balancer and Network Load Balancer
- Terraform AWS provider
- Kubernetes Deployments, Services, and Horizontal Pod Autoscaler
- KEDA
- Prometheus / PromQL
- RabbitMQ
- Redis
- Python
- boto3
- Amazon SQS

## Sources Consulted
- AWS EC2 Auto Scaling target tracking documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- AWS EC2 Auto Scaling PredefinedMetricSpecification API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
- AWS EC2 Auto Scaling PredictiveScalingConfiguration API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredictiveScalingConfiguration.html
- Terraform AWS provider aws_autoscaling_policy documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy.html
- Terraform AWS provider aws_autoscaling_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider aws_autoscaling_schedule documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- AWS Load Balancer Controller service annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS NLB service annotations documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- KEDA RabbitMQ Queue scaler documentation: https://keda.sh/docs/2.20/scalers/rabbitmq-queue/
- KEDA Redis Lists scaler documentation: https://keda.sh/docs/2.20/scalers/redis-lists/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- boto3 CloudWatch client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch.html
- boto3 Auto Scaling client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/autoscaling.html

## Issues Found
- The KEDA RabbitMQ trigger used the deprecated `queueLength` metadata field. Updated it to the current `mode: QueueLength` and `value: "50"` form recommended by KEDA.
- The Kubernetes NLB Service example used legacy connection-draining annotations that are not part of the current AWS Load Balancer Controller NLB service annotation set. Replaced them with `service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: deregistration_delay.timeout_seconds=60`, which configures target deregistration delay for draining.
- The Python custom autoscaler used `datetime.utcnow()` and `timedelta()` without importing them. Added `from datetime import datetime, timedelta`.
- The Prometheus latency query used `histogram_quantile()` directly over classic histogram buckets without aggregating by `le`. Updated it to `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))`, matching Prometheus guidance for aggregating classic histograms.

## Review Notes
The Terraform examples are illustrative and depend on surrounding resources and variables that are not included in the post, such as the ALB, target group, security group, subnets, AMI, and app image. The AWS ALB request count target value is correctly described as requests per target over a one-minute period. The HPA `autoscaling/v2` behavior configuration and Redis KEDA trigger fields are current.
