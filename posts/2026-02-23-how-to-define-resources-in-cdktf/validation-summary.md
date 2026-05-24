# Validation Summary: How to Define Resources in CDKTF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- TypeScript
- Terraform
- AWS provider for Terraform (@cdktf/provider-aws)
- AWS resources (VPC, Subnet, SecurityGroup, EC2 Instance, CloudWatch Metric Alarm)
- Terraform constructs (TerraformStack, TerraformOutput, TerraformVariable)
- Terraform lifecycle rules and provisioners

## Sources Consulted
- CDKTF official documentation: https://developer.hashicorp.com/terraform/cdktf
- CDKTF CLI reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/cli-configuration
- CDKTF resources documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/resources
- CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- @cdktf/provider-aws npm package: https://www.npmjs.com/package/@cdktf/provider-aws
- Terraform AWS provider (aws_instance, aws_vpc, aws_subnet, aws_security_group, aws_cloudwatch_metric_alarm) documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax

## Issues Found
- Two section headings ("Resource References and Implicit Dependencies" and "Resource Provisioners") were missing their `##` markdown heading prefix, which caused them to render as plain paragraph text instead of as section headers. Added the `##` prefix to both to restore proper document structure.

## Review Notes
- Code examples are syntactically valid TypeScript using current CDKTF and `@cdktf/provider-aws` import paths (`@cdktf/provider-aws/lib/<resource>`).
- AWS resource property camelCasing (e.g., `vpcId`, `cidrBlock`, `instanceType`, `mapPublicIpOnLaunch`, `vpcSecurityGroupIds`) is correct for the CDKTF AWS provider.
- The `cdktf init --template=typescript --local` and `cdktf provider add aws` commands match current CLI behavior.
- The `lifecycle` configuration (`preventDestroy`, `ignoreChanges`, `createBeforeDestroy`) is correctly expressed in CDKTF (`TerraformResourceLifecycle`).
- Inline `ingress` / `egress` blocks on `SecurityGroup` are still supported by the AWS provider, though HashiCorp now recommends the dedicated `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources for new code. The post's usage is still valid but readers may want to be aware of the newer pattern.
- The example AMI ID `ami-0c55b159cbfafe1f0` is a long-standing placeholder used widely in AWS tutorials; it may not resolve in every region but is acceptable as illustrative.
- The conditional example uses `CloudwatchMetricAlarm` without an import statement — this is a minor omission in the snippet (the import would be `import { CloudwatchMetricAlarm } from "@cdktf/provider-aws/lib/cloudwatch-metric-alarm";`), but the surrounding prose makes clear the snippet is illustrative rather than a complete file.
- The `remote-exec` provisioner example omits a `connection` block; in practice a real `remote-exec` would need one, but the snippet is shown to illustrate the `provisioners` structure rather than a runnable end-to-end example.
