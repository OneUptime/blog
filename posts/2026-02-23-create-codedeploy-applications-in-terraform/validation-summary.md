# Validation Summary: How to Create CodeDeploy Applications in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS CodeDeploy
- AWS IAM
- Amazon EC2 / On-Premises deployments
- AWS Lambda deployments
- Amazon ECS blue/green deployments
- Amazon SNS
- Elastic Load Balancing
- Amazon CloudWatch alarms

## Sources Consulted
- Terraform Registry: `aws_codedeploy_app` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_app
- Terraform Registry: `aws_codedeploy_deployment_config` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_config
- Terraform Registry: `aws_codedeploy_deployment_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- AWS CodeDeploy User Guide: Working with deployment configurations: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
- AWS CodeDeploy User Guide: Create a service role for CodeDeploy: https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-service-role.html
- AWS Managed Policy Reference: `AWSCodeDeployRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRole.html
- AWS Managed Policy Reference: `AWSCodeDeployRoleForLambda`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRoleForLambda.html
- AWS Managed Policy Reference: `AWSCodeDeployRoleForECS`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRoleForECS.html
- AWS CodeDeploy API Reference: `AutoRollbackConfiguration`: https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_AutoRollbackConfiguration.html
- AWS CodeDeploy User Guide: Deployments on an Amazon ECS compute platform: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html

## Issues Found
- The EC2/on-premises CodeDeploy service role attached `arn:aws:iam::aws:policy/AWSCodeDeployRole`, but the official AWS managed policy ARN is `arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole`. Updated the Terraform snippet to use the correct ARN.
- The Lambda deployment group reused the EC2/on-premises CodeDeploy service role. AWS documents platform-specific managed policies for Lambda deployments, so the Lambda example now creates a Lambda CodeDeploy service role and attaches `arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda`.
- The ECS deployment group reused the EC2/on-premises CodeDeploy service role. AWS documents `AWSCodeDeployRoleForECS` for ECS blue/green deployments, so the ECS example now creates an ECS CodeDeploy service role and attaches `arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS`.

## Review Notes
The Terraform resource block names, CodeDeploy compute platform values, deployment configuration values, trigger event examples, and auto-rollback event values were checked against the current Terraform AWS provider and AWS CodeDeploy documentation. The examples still assume referenced infrastructure such as Auto Scaling groups, ECS services, target groups, listeners, alarms, and SNS subscribers already exists or is defined elsewhere.
