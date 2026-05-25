# Validation Summary: How to Create Alerting Pipelines with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon SNS
- Amazon CloudWatch alarms
- AWS Lambda
- AWS IAM
- Amazon DynamoDB TTL
- Slack incoming webhooks

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp Terraform AWS Provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- HashiCorp Terraform AWS Provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- HashiCorp Terraform AWS Provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- HashiCorp Terraform AWS Provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda with Amazon SNS documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon ECS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html

## Issues Found
- The post claimed the pipeline delivered alerts to PagerDuty, but the Terraform examples did not create any PagerDuty integration, webhook subscription, or routing logic. I changed the introductory claim to say the demonstrated pipeline delivers to email and Slack, and removed the unused `pagerduty` field from the severity variable examples.
- The Lambda example used `python3.11`. That runtime is still supported, but AWS documentation now recommends moving to Amazon Linux 2023-based runtimes because Amazon Linux 2 reaches end of life on June 30, 2026. I updated the Lambda runtime to `python3.12`, which is an Amazon Linux 2023-based managed runtime.

## Review Notes
- The SNS email subscription syntax is valid, but email subscriptions remain pending until recipients confirm them outside Terraform.
- The DynamoDB TTL attribute does not need to be declared in the Terraform table `attribute` blocks unless it is used as a key or index attribute.
- Terraform was not installed in the review environment, so I could not run `terraform validate`; the snippets were reviewed manually against official documentation.
