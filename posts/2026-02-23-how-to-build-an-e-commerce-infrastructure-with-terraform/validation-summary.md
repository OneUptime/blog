# Validation Summary: How to Build an E-Commerce Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS ECS Fargate
- AWS Application Auto Scaling
- Amazon Aurora PostgreSQL
- Amazon ElastiCache for Redis
- Amazon OpenSearch Service
- Amazon SQS
- Amazon S3
- Amazon CloudFront
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_appautoscaling_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS Application Auto Scaling scalable target documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- Terraform AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- AWS Aurora Serverless v2 scaling configuration documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-rds-dbcluster-serverlessv2scalingconfiguration.html
- Terraform AWS provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider `aws_opensearch_domain` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS OpenSearch Service TLS policy announcement: https://aws.amazon.com/blogs/big-data/enhance-security-and-performance-with-tls-1-3-and-perfect-forward-secrecy-on-amazon-opensearch-service/
- Terraform AWS provider `aws_sqs_queue` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider `aws_cloudfront_distribution` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider `aws_cloudfront_cache_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The ECS section defined task definitions but no `aws_ecs_service` resources, so the Fargate tasks would not actually run and the Application Auto Scaling target depended on an implied service name. Added product and order ECS services, and changed the autoscaling target `resource_id` to reference the product service name.
- The CloudFront distribution used the deprecated `forwarded_values` block. Replaced it with an `aws_cloudfront_cache_policy` that caches and forwards the image transformation query parameters `w`, `h`, and `q`, then attached it with `cache_policy_id`.

## Review Notes
The snippets still assume supporting resources that are referenced but not shown, such as IAM roles, security groups, subnet groups, CloudWatch log groups, KMS keys, S3 bucket policies, CloudFront origin access identity permissions, and the ACM certificate. Terraform was not installed in the review environment, so `terraform validate` could not be run locally.
