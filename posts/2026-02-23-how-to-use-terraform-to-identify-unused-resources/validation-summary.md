# Validation Summary: How to Use Terraform to Identify Unused Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- AWS Lambda
- AWS IAM
- Amazon EC2 Elastic Block Store
- Elastic IP addresses
- Elastic Load Balancing
- Amazon CloudWatch alarms and metrics
- Amazon EventBridge scheduled rules
- AWS Config managed rules
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider documentation for `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS provider documentation for `aws_ebs_volumes`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ebs_volumes
- AWS Config managed rule `EIP_ATTACHED`: https://docs.aws.amazon.com/config/latest/developerguide/eip-attached.html
- Amazon EC2 Elastic IP address pricing documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Elastic Load Balancing CloudWatch metrics documentation for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon EC2 IAM service authorization reference for snapshot and volume actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- Amazon EventBridge schedule expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html

## Issues Found
- The IAM policy allowed `ec2:DescribeSnapshots` and `ec2:CreateSnapshot`, but the snapshot cleanup Lambda was described as deleting old snapshots without granting `ec2:DeleteSnapshot`. Added `ec2:DeleteSnapshot` because AWS documents it as the EC2 action required to delete EBS snapshots.
- The Elastic IP section said Elastic IPs incur charges when not associated with running instances. AWS now charges for all Elastic IP addresses, whether in use or idle. Updated the wording to say idle Elastic IPs are easy waste to detect, while preserving the cost-optimization point.
- The Application Load Balancer alarm iterated over `var.load_balancer_arns`, but the `AWS/ApplicationELB` `LoadBalancer` metric dimension expects the final ARN portion, such as `app/load-balancer-name/1234567890123456`, not the full ARN. Renamed the variable in the snippet to `var.load_balancer_dimensions`.
- The final section was titled "Using Terraform State to Detect Drift", but the example uses AWS provider data sources rather than Terraform state inspection. Updated the heading and sentence to refer to Terraform data sources.

## Review Notes
The snippets are partial examples and still assume supporting resources such as `data.archive_file.*`, input variables, Lambda source code, AWS Config recorder setup, and provider configuration exist elsewhere. That is acceptable for a blog excerpt, but a production implementation should also scope destructive IAM actions more tightly where possible and include owner notification or approval logic before cleanup.
