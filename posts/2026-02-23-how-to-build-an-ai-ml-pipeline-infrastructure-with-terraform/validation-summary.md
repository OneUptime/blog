# Validation Summary: How to Build an AI/ML Pipeline Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS SageMaker AI Studio
- AWS SageMaker Feature Store
- AWS SageMaker Model Registry
- AWS SageMaker endpoints
- AWS SageMaker Model Monitor data quality jobs
- Amazon S3
- AWS KMS
- Amazon ECR
- AWS IAM
- AWS Application Auto Scaling
- AWS Glue Data Catalog

## Sources Consulted
- HashiCorp AWS Provider documentation for `aws_sagemaker_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_domain
- HashiCorp AWS Provider documentation for `aws_sagemaker_feature_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_feature_group
- HashiCorp AWS Provider documentation for `aws_sagemaker_endpoint_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_endpoint_configuration
- HashiCorp AWS Provider documentation for `aws_sagemaker_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_endpoint
- HashiCorp AWS Provider documentation for `aws_sagemaker_data_quality_job_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_data_quality_job_definition
- HashiCorp AWS Provider documentation for `aws_sagemaker_prebuilt_ecr_image`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/sagemaker_prebuilt_ecr_image
- HashiCorp AWS Provider documentation for `aws_appautoscaling_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS SageMaker API documentation for `ResourceSpec`: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ResourceSpec.html
- AWS SageMaker API documentation for `CreateFeatureGroup`: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateFeatureGroup.html
- AWS IAM documentation for passing roles to AWS services: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html

## Issues Found
- The SageMaker Domain example used `data.aws_sagemaker_prebuilt_ecr_image.pytorch.id` as a `sagemaker_image_arn`. The prebuilt ECR image data source returns container registry information, not a SageMaker image ARN. I removed the invalid `sagemaker_image_arn` assignments and left valid `instance_type` settings.
- The pipeline execution role could create SageMaker jobs and models but did not include `iam:PassRole`, which SageMaker needs when a role is passed to jobs or models. I added `iam:PassRole` scoped to the SageMaker execution role and added `sagemaker:UpdateEndpoint` for endpoint deployment updates.
- The serving section created an endpoint configuration but not the actual SageMaker endpoint, even though the autoscaling target and monitoring configuration referenced an endpoint name. I added an `aws_sagemaker_endpoint` resource and updated autoscaling to reference that endpoint name.
- The monitoring section used `aws_sagemaker_model_quality_job_definition`, which is not available in the HashiCorp AWS provider documentation, and included fields that do not match the AWS provider data quality resource schema. I changed the example to `aws_sagemaker_data_quality_job_definition`, used the supported `data_quality_*` blocks, referenced the built-in SageMaker Model Monitor analyzer image through `aws_sagemaker_prebuilt_ecr_image`, and removed unsupported model-quality-specific fields.
- The monitoring prose claimed the Terraform snippet detected both data drift and model quality degradation. Since the corrected AWS provider resource is a data quality job definition, I narrowed the wording to data drift.
- The final OneUptime sentence referred to monitoring "ML models" for service-level latency and error-rate issues. I changed that to "ML services" to better match the observability claim.

## Review Notes
The snippets remain illustrative and still depend on surrounding resources and variables not shown in the post, such as `aws_kms_key.ml`, `aws_iam_role.sagemaker_execution`, `aws_security_group.sagemaker`, VPC/subnet variables, and `var.model_name`. For a production-ready module, the IAM policies would likely need more least-privilege refinement and additional lifecycle/update/delete actions depending on how SageMaker Pipelines are authored.
