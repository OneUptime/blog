# Validation Summary: How to Use Terraform with Cost Management Platforms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Infracost CLI and GitHub Actions
- Open Policy Agent policies for Infracost
- AWS Provider for Terraform
- AWS Budgets
- AWS Cost Explorer cost allocation tags and anomaly detection
- Kubecost Helm chart
- Kubernetes Helm provider
- AWS EC2 Auto Scaling, S3 Intelligent-Tiering, RDS, ElastiCache, and NAT Gateway resources

## Sources Consulted
- Infracost CLI commands: https://www.infracost.io/docs/features/cli_commands/
- Infracost config files and usage files: https://www.infracost.io/docs/features/config_file/
- Infracost usage costs: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost Open Policy Agent integration: https://www.infracost.io/docs/integrations/open_policy_agent/
- Infracost official GitHub Action: https://github.com/marketplace/actions/infracost-actions
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS Provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider `aws_ce_anomaly_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_subscription
- Terraform AWS Provider `aws_autoscaling_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- Terraform `timestamp` function: https://developer.hashicorp.com/terraform/language/functions/timestamp
- AWS S3 Intelligent-Tiering API documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-bucket-intelligent-tiering-configurations.html
- Kubecost Helm chart installation: https://kubecost.github.io/kubecost
- Kubecost Helm parameters: https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=installation-helm-parameters
- Kubecost cloud billing integrations: https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=installation-cloud-billing-integrations

## Issues Found
- The direct Infracost install command used the old `infracost/infracost` repository path. Updated it to the current `infracost/cli` install script path from the official docs.
- The Infracost policy example used a YAML policy schema that is not supported by the documented Infracost CLI policy integration. Replaced it with a Rego policy using the required `package infracost` and `deny[out]` shape, and added the required `--policy-path infracost-policy.rego` CI note.
- The cost allocation tag example used `formatdate("YYYY-MM-DD", timestamp())` in provider default tags. Terraform documents that `timestamp()` changes every run and causes recurring diffs when used in resource attributes, so the unstable `CreatedDate` tag was removed.
- The Kubecost Helm example pinned an old chart version and used invalid values for cloud cost integration (`kubecostProductConfigs.cloudCost.*`). Updated the chart version to `2.9.6` and replaced those settings with documented Kubecost model ETL values for cloud usage and asset reconciliation.

## Review Notes
- Terraform and Infracost CLIs were not installed in the local environment, so validation was performed against official documentation and upstream source files rather than local command execution.
- The AWS price comments in the examples are region- and time-sensitive. They are plausible examples, but readers should use live pricing tools for exact costs.
