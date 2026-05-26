# Validation Summary: How to Create a CDKTF Project with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CDK for Terraform (CDKTF)
- Go
- Terraform
- AWS provider for Terraform
- jsii runtime
- Terraform S3 backend

## Sources Consulted
- HashiCorp CDKTF project setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF configuration file documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/configuration-file
- HashiCorp CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF Go API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/go/classes
- Go package reference for github.com/hashicorp/terraform-cdk-go/cdktf: https://pkg.go.dev/github.com/hashicorp/terraform-cdk-go/cdktf
- Go package reference for generated AWS security group rule bindings: https://pkg.go.dev/github.com/cdktf/cdktf-provider-aws-go/aws/v18/securitygrouprule
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- jsii Go runtime package reference: https://pkg.go.dev/github.com/aws/jsii-runtime-go

## Issues Found
- The introduction described Go as a strong choice for CDKTF without noting that HashiCorp deprecated CDKTF on December 10, 2025. Added a caveat that CDKTF is no longer supported or maintained by HashiCorp.
- The networking construct hard-coded subnet CIDRs under `10.0.0.0/16`, which made the prod example invalid because its VPC CIDR is `10.1.0.0/16`. Replaced the hard-coded subnet CIDRs with `cdktf.Fn_Cidrsubnet(...)` so subnets derive from the configured VPC CIDR.
- The testing example used `jsii.String(...)` but did not import the jsii runtime package. Added the missing import.
- The dynamic security group example built an `ingressRules` slice but never attached it to any Terraform resource. Replaced it with `securitygrouprule.NewSecurityGroupRule(...)` so services with a port actually receive an ingress rule.
- The S3 backend example used `DynamodbTable`, which maps to Terraform's deprecated DynamoDB-based S3 backend locking. Removed the deprecated locking argument from the snippet.

## Review Notes
CDKTF's current Go API reference still exposes `S3BackendConfig.DynamodbTable`, but Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated in favor of S3 lockfile locking. Future updates should revisit this section if a maintained CDKTF fork or replacement exposes `use_lockfile` directly.
