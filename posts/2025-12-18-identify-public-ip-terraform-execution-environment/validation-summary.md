# Validation Summary: How to Identify Public IP of Terraform Execution Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp HTTP provider
- HashiCorp External provider
- AWS Terraform provider
- AWS Security Groups
- Amazon RDS
- Amazon EKS
- GitHub Actions
- GitLab CI
- Bash and curl

## Sources Consulted
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp External provider data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- Terraform data source language documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform data block `postcondition` documentation: https://developer.hashicorp.com/terraform/language/block/data
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- AWS provider `aws_security_group` and `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- GitHub Actions environment file documentation: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable

## Issues Found
- The "Multiple IP Services for Reliability" section described fallback behavior, but Terraform data source read failures and failing postconditions stop the plan/apply rather than falling through to another data source. I changed the section to describe verification instead of fallback and updated related comments.
- The best practices recommended HTTP timeouts, but the Terraform `http` examples did not set one. I added `request_timeout_ms = 5000` to the relevant `http` data source examples, which is supported by the HashiCorp HTTP provider.
- The EKS example included `10.0.0.0/8` in `public_access_cidrs`. That argument restricts access to the public Kubernetes API endpoint, so including a private network range as an "internal networks" public endpoint rule is misleading. I removed the private CIDR from that list.
- The RDS comment said `publicly_accessible = true` is required for external access. I changed it to "direct internet access" to avoid implying it is required for every non-application-server access path.
- The GitHub Actions example wrote `RUNNER_IP` to `$GITHUB_ENV` and then mapped it into `TF_VAR_ci_runner_ip` in a later step. I simplified it by writing `TF_VAR_ci_runner_ip` directly to `$GITHUB_ENV`, matching Terraform's environment variable convention.

## Review Notes
- The external data source script correctly emits a JSON object with string values, which matches the external provider protocol. The IPv4 regex is basic and does not validate octet ranges, but it is adequate for the simple public IP service examples.
- The `lifecycle` `postcondition` examples require Terraform 1.2 or later.
- Dynamic whitelisting can cause infrastructure churn whenever the execution environment IP changes; the post already calls this out and recommends static IPs for production CI/CD.
