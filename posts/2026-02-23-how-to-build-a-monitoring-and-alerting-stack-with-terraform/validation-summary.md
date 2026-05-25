# Validation Summary: How to Build a Monitoring and Alerting Stack with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS CloudWatch alarms and dashboards
- Amazon SNS
- AWS Lambda permissions
- Amazon ECS on Fargate
- Amazon EFS
- Prometheus
- Grafana
- CloudWatch Synthetics

## Sources Consulted
- HashiCorp Terraform AWS Provider: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp Terraform AWS Provider: aws_sns_topic_subscription - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- HashiCorp Terraform AWS Provider: aws_lambda_permission - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- HashiCorp Terraform AWS Provider: aws_ecs_task_definition - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp Terraform AWS Provider: aws_synthetics_canary - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/synthetics_canary
- AWS Lambda Developer Guide: Granting Lambda function access to AWS services - https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html
- Amazon ECS Developer Guide: Specify an Amazon EFS file system in an Amazon ECS task definition - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Prometheus documentation: Installation and persistent storage - https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus documentation: Storage - https://prometheus.io/docs/prometheus/latest/storage/
- Grafana documentation: Configure Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Amazon CloudWatch User Guide: Runtime versions using Node.js and Puppeteer - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- Amazon CloudWatch User Guide: CloudWatch Synthetics runtime support policy - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Runtime_Support_Policy.html
- Amazon CloudWatch User Guide: Synthetic monitoring canaries - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
- Amazon CloudWatch User Guide: Using widgets on CloudWatch dashboards - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/add_remove_line_dashboard.html

## Issues Found
- The SNS-to-Lambda Slack subscription lacked the Lambda resource-based permission required for SNS to invoke the function. Added an `aws_lambda_permission` resource scoped to the warning SNS topic.
- The SNS section comment said critical alerts go to PagerDuty and Slack, but the snippet routed critical alerts to email and PagerDuty while routing warning alerts to Slack. Updated the comment to match the code.
- The Prometheus ECS task mounted EFS at `/etc/prometheus` as a read-only `prometheus-config` volume while the text described persistent Prometheus storage. Prometheus persistent data should be stored on its data path, so the mount now uses a `prometheus-data` volume at `/prometheus` with write access and EFS transit encryption enabled.
- The CloudWatch Synthetics canary used `syn-nodejs-puppeteer-7.0`, which AWS lists as deprecated as of January 22, 2026. Updated the example to `syn-nodejs-puppeteer-15.1`.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform fmt` or provider validation locally. The snippets were reviewed manually against official AWS, HashiCorp, Prometheus, and Grafana documentation. The examples remain illustrative and still assume supporting resources such as IAM roles, security groups, Lambda code, log groups, ECS services, and variables exist elsewhere in the Terraform project.
