# Validation Summary: How to Create ECS with Service Connect in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon ECS
- Amazon ECS Service Connect
- AWS Cloud Map
- Amazon CloudWatch metrics and alarms
- AWS IAM
- AWS security groups
- AWS Fargate

## Sources Consulted
- Amazon ECS Service Connect documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html
- Amazon ECS Service Connect configuration overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts.html
- Amazon ECS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_ecs_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform AWS provider `aws_service_discovery_http_namespace` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_http_namespace

## Issues Found
- The post described Service Connect as transparently intercepting outbound connections and providing circuit breaking. AWS documents Service Connect as routing application connections made to Service Connect endpoint names through the proxy, with round-robin load balancing, retries, and outlier detection. Updated the wording to match the documented behavior.
- The Service Connect examples did not set `discovery_name`, while the metrics example later relied on stable discovery names. Added `discovery_name` values for the API and payment services to make the Cloud Map and CloudWatch metric names explicit.
- The worker task definition referenced `/ecs/worker` directly without declaring a corresponding CloudWatch log group. Added `aws_cloudwatch_log_group.worker` and updated the container log configuration to reference it.
- The CloudWatch alarm used the incorrect namespace `AWS/ECS/ManagedScaling` for Service Connect metrics. Changed it to `AWS/ECS`.
- The CloudWatch alarm used invalid dimensions for the Service Connect HTTP 5XX and request count metrics. Updated the metrics to use `TargetDiscoveryName` for `HTTPCode_Target_5XX_Count` and `DiscoveryName` for `RequestCount`, matching the Amazon ECS metrics documentation.
- The metrics description implied a direct error-rate metric. Updated it to describe the documented HTTP response code counts, which can be used to calculate an error rate.

## Review Notes
The snippets remain illustrative rather than a complete standalone Terraform module because they reference surrounding resources and variables such as the ALB, listener, target group, VPC, subnets, ECR repository URL, AWS region, and SNS topic. That is acceptable for the post format, but a future version could note these prerequisites explicitly.
