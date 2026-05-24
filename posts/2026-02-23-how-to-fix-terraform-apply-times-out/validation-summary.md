# Validation Summary: How to Fix Terraform Apply Times Out

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (CLI and HCL)
- Terraform AWS provider (`hashicorp/aws`)
- AWS services: RDS, EKS, CloudFront, NAT Gateway, ElastiCache, Elastic Beanstalk, EC2, VPC
- AWS CLI (rds, eks, ec2 subcommands)
- GitHub Actions
- GitLab CI
- Bash scripting

## Sources Consulted
- Terraform AWS provider `aws_db_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_eks_cluster` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_cloudfront_distribution` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider `aws_nat_gateway` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider `aws_elastic_beanstalk_environment` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elastic_beanstalk_environment
- Terraform AWS provider `aws_elasticache_cluster` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- HashiCorp blog: "New Terraform Planning Options: -refresh=false, -refresh-only, -replace" (`-refresh-only` introduced in Terraform 0.15.4)
- GitHub Actions documentation on `jobs.<job_id>.timeout-minutes` (default 360 minutes for GitHub-hosted runners)
- AWS CLI command references for `rds`, `eks`, and `ec2`

## Issues Found
1. **CloudFront default timeout (70 minutes) was fabricated.** `aws_cloudfront_distribution` does not expose a `timeouts` block at all in the AWS provider. The provider waits for the distribution to reach `Deployed` state internally, but this is controlled by the `wait_for_deployment` argument, not a configurable `timeouts` block.
   - Removed the `70 minutes` claim from the defaults list and clarified that CloudFront has no `timeouts` block.
   - Replaced the CloudFront example in "Fix 1" (which incorrectly added a `timeouts { create = "90m" ... }` block — apply would have failed with an unsupported argument error) with the correct workaround: setting `wait_for_deployment = false`.

2. **ElastiCache default create timeout was wrong (claimed 50 minutes).** The actual default is 40 minutes create / 80 minutes update / 40 minutes delete.
   - Updated the defaults list to reflect the correct numbers.

3. **Elastic Beanstalk default was misleading.** The 20-minute value comes from the `wait_for_ready_timeout` argument, not a standard `timeouts { create = ... }` block (which this resource does not expose).
   - Clarified this in the defaults list so readers do not try to add an unsupported `timeouts` block.

4. **Minor accuracy improvement on `aws_eks_cluster` defaults.** Added the update (60m) and delete (15m) defaults alongside the create (30m) for completeness.

## Review Notes
- The RDS, EKS, and NAT Gateway `timeouts {}` examples in Fix 1 are technically valid and use the correct nested-block syntax.
- The `terraform apply -refresh-only` command is correctly cited (introduced in Terraform 0.15.4, May 2021).
- The `terraform apply -parallelism=20` flag is valid; the default is 10.
- The `terraform state rm` + `terraform import` workflow for recovering from a stuck apply is accurate.
- The AWS CLI commands (`aws rds describe-db-instances`, `aws rds describe-events`, `aws eks describe-cluster`, `aws ec2 describe-instance-status`, `aws rds delete-db-instance`, `aws eks delete-cluster`) are all valid with correct flags. The `--duration 60` flag on `describe-events` is in minutes, which is correct.
- The `cluster.health.issues` field referenced in the EKS `describe-cluster --query` is real (returned by the EKS DescribeCluster API).
- The GitHub Actions claim that the default `timeout-minutes` is 360 is correct. (Note: 360 is also effectively the cap for GitHub-hosted runners; self-hosted runners can go beyond.)
- The HCL example using `local.is_prod ? ... : ...` and `multi_az` argument for `aws_db_instance` is syntactically correct.
- The Bash monitoring script at the end is correct shell.
- Author writing style, structure, and tone were preserved throughout — only factual corrections were made.
