# Validation Summary: How to Implement Cost Governance Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Organizations tag policies
- AWS Cost Explorer and cost allocation tags
- AWS Budgets
- AWS Cost Anomaly Detection
- AWS Service Control Policies
- Amazon EC2, EBS, Elastic IPs, and CloudWatch metrics
- Savings Plans and Reserved Instances
- Terraform AWS provider
- Python and boto3

## Sources Consulted
- AWS Organizations tag policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations services and resource types that support tag-policy enforcement: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_supported-resources-enforcement.html
- Terraform AWS provider `aws_organizations_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- Terraform AWS provider `aws_ce_cost_allocation_tag`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_allocation_tag
- Terraform AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider `aws_ce_anomaly_monitor`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_monitor
- Terraform AWS provider `aws_ce_anomaly_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_subscription
- Boto3 CloudWatch service reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch.html
- Boto3 EC2 `describe_snapshots`: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_snapshots.html
- Boto3 Cost Explorer `get_savings_plans_purchase_recommendation`: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_savings_plans_purchase_recommendation.html
- Boto3 Cost Explorer `start_savings_plans_purchase_recommendation_generation`: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/start_savings_plans_purchase_recommendation_generation.html
- AWS IAM example for denying access by requested Region: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- Amazon EC2 Elastic IP documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS Prescriptive Guidance for gp3 pricing reference: https://docs.aws.amazon.com/prescriptive-guidance/latest/optimize-costs-microsoft-workloads/ebs-migrate-gp2-gp3.html

## Issues Found
- The post said the tag policy example was enforced via Config rules, but the snippet only creates an AWS Organizations tag policy and cost allocation tags. Changed the sentence to say it sets up organization-level tag policies for supported resource types.
- The per-team budget tag filter used `user:Team$${each.key}`, which escapes Terraform interpolation and would produce the wrong filter string. Changed it to `user:Team${"$"}${each.key}` to produce the Cost Explorer `TagKey$TagValue` format while still interpolating the team name.
- The cost optimization example was described as a Lambda function but did not define a Lambda handler. Changed the description to call it a Python script.
- The EC2, EBS volume, and snapshot scans used non-paginated calls, so they could miss resources in larger accounts. Updated those calls to use boto3 paginators where supported.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- The unattached EBS volume cost comment used `0.10` as an approximate gp3 monthly GB price. Updated it to `0.08`, which matches common us-east-1 gp3 storage pricing more closely.
- The Savings Plans recommendation example called `get_savings_plans_purchase_recommendation` without first starting recommendation generation. Added `start_savings_plans_purchase_recommendation_generation()` before retrieving recommendations.

## Review Notes
- The examples still assume supporting Terraform resources and variables such as `aws_sns_topic.cost_alerts` and `var.team_budgets` exist elsewhere.
- The Savings Plans generation call is asynchronous; in production code, poll the generation status or retrieve recommendations after AWS has completed generation.
- Tag policies standardize tag keys and values for supported tagged resources, but untagged resources are not evaluated for compliance by tag policies alone.
