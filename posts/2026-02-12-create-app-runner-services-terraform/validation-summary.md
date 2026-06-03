# Validation Summary: How to Create App Runner Services with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Runner
- Amazon ECR
- AWS IAM
- AWS Secrets Manager
- Amazon VPC security groups and App Runner VPC connectors
- Amazon Route 53 custom domain records
- AWS X-Ray observability
- AWS WAF
- Terraform AWS Provider

## Sources Consulted
- AWS App Runner availability change: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- AWS App Runner VPC outbound traffic documentation: https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html
- AWS App Runner custom domain documentation: https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html
- AWS App Runner AssociateCustomDomain API reference: https://docs.aws.amazon.com/apprunner/latest/api/API_AssociateCustomDomain.html
- AWS App Runner IAM documentation: https://docs.aws.amazon.com/apprunner/latest/dg/security_iam_service-with-iam.html
- AWS managed policy AWSAppRunnerServicePolicyForECRAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSAppRunnerServicePolicyForECRAccess.html
- AWS App Runner WAF documentation: https://docs.aws.amazon.com/apprunner/latest/dg/waf.html
- Terraform AWS Provider `aws_apprunner_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_service
- Terraform AWS Provider `aws_apprunner_custom_domain_association` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_custom_domain_association
- Terraform AWS Provider `aws_apprunner_auto_scaling_configuration_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_auto_scaling_configuration_version
- Terraform AWS Provider `aws_apprunner_vpc_connector` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_vpc_connector
- Terraform AWS Provider `aws_apprunner_observability_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_observability_configuration
- Terraform AWS Provider `aws_wafv2_web_acl_association` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association

## Issues Found
- Added the current AWS App Runner availability caveat. AWS documentation now states that App Runner is no longer open to new customers, while existing customers can continue using it.
- Clarified the VPC connector explanation. The original wording said App Runner services can only reach the public internet by default; AWS documents this more precisely as public endpoint access by default, with private VPC resource access requiring a VPC connector.
- Corrected the custom domain Route 53 target. Terraform's App Runner custom domain association resource exposes `dns_target` for DNS mapping, so the CNAME example now points to `aws_apprunner_custom_domain_association.main.dns_target` instead of the service `service_url`.
- Set `enable_www_subdomain = false` in the `api.example.com` custom domain example. The App Runner API and Terraform provider default this option to `true`, which would also associate `www.api.example.com`.

## Review Notes
The Terraform App Runner service, IAM role trust policies, ECR access policy attachment, autoscaling configuration, VPC connector, observability configuration, WAF association, and output examples match current Terraform AWS Provider and AWS documentation. The VPC security group example is permissive because it includes all outbound traffic; it works as written, but a future hardening pass could remove the broad egress rule when only private database access is required.
