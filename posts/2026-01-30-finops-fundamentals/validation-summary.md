# Validation Summary: FinOps Fundamentals for Engineering Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- FinOps
- AWS Cost Explorer, Cost Anomaly Detection, Compute Optimizer, CloudWatch, EC2, RDS, EBS, S3, NAT Gateway, VPC endpoints, Service Control Policies, Instance Scheduler, EventBridge, Lambda
- Terraform AWS provider `default_tags`
- Python `datetime`
- Boto3 CloudWatch and EC2 clients
- Azure Cost Management and Azure Policy
- Google Cloud Billing and Recommender
- Kubernetes, Karpenter, and kube-downscaler

## Sources Consulted
- FinOps Foundation: FinOps Framework phases: https://www.finops.org/framework/phases/
- FinOps Foundation: What is FinOps?: https://www.finops.org/introduction/what-is-finops/
- HashiCorp Developer: Configure default tags for AWS resources: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- AWS Boto3 documentation: CloudWatch `get_metric_statistics`: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch.html#CloudWatch.Client.get_metric_statistics
- AWS CloudWatch API Reference: `GetMetricStatistics`: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html
- AWS Compute Optimizer documentation: https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html
- AWS EC2 User Guide: EC2 instance recommendations from Compute Optimizer: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recommendations.html
- AWS Billing documentation: Cost allocation tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- AWS Cost Management documentation: Cost Explorer: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html
- AWS Organizations documentation: Tag policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS blog: Tag policies and Service Control Policies for tag enforcement: https://aws.amazon.com/blogs/mt/implement-aws-resource-tagging-strategy-using-aws-tag-policies-and-service-control-policies-scps/
- AWS Instance Scheduler documentation: https://docs.aws.amazon.com/solutions/instance-scheduler-on-aws/
- Microsoft Learn: Azure Policy tag governance: https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/govern-tags
- Microsoft Learn: Azure Cost Management group and filter options: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/group-filter
- Google Cloud documentation: Apply machine type recommendations: https://docs.cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances
- Google Cloud documentation: Cloud Billing reports: https://docs.cloud.google.com/billing/docs/how-to/reports
- Karpenter documentation: NodePools disruption settings: https://karpenter.sh/docs/concepts/nodepools/
- Python documentation: `datetime.utcnow()` deprecation and timezone-aware UTC: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found
- The Terraform tagging section said the example "prevents untagged resources from being created." The example only validates the `required_tags` module input and applies provider-level default tags to supported AWS resources managed by that provider. I changed the wording and comments so the claim matches Terraform AWS provider behavior.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12+. I updated it to use `datetime.now(timezone.utc)` and reuse a single `end_time`.
- The EC2 enumeration used a single `describe_instances` call. I updated it to use the Boto3 paginator so the example works correctly in accounts with paginated EC2 responses.

## Review Notes
- The updated Python code block was parsed successfully with Python `ast`.
- Terraform/OpenTofu was not installed in the environment, so the HCL snippet was reviewed against official HashiCorp documentation rather than validated locally.
- The post's broader FinOps concepts, cloud billing visibility guidance, right-sizing guidance, and non-production scheduling recommendations are consistent with the official sources consulted.
