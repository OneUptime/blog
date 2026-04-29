# Validation Summary: How to Build a Machine Learning Platform with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Provider for Terraform / OpenTofu
- Amazon SageMaker Domain
- Amazon SageMaker Studio user profiles
- Amazon SageMaker Model Registry
- Amazon SageMaker Feature Store
- Amazon SageMaker Pipelines
- Amazon S3
- AWS IAM
- Amazon VPC

## Sources Consulted
- HashiCorp AWS provider docs for `aws_sagemaker_domain`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_domain.html.markdown
- HashiCorp AWS provider docs for `aws_sagemaker_user_profile`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_user_profile.html.markdown
- HashiCorp AWS provider docs for `aws_sagemaker_feature_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_feature_group.html.markdown
- HashiCorp AWS provider docs for `aws_sagemaker_pipeline`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_pipeline.html.markdown
- Amazon SageMaker `CreateDomain` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateDomain.html
- Amazon SageMaker `CreateTrainingJob` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html
- Amazon SageMaker `Channel` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Channel.html
- Amazon SageMaker `S3DataSource` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_S3DataSource.html
- Amazon SageMaker `CreateFeatureGroup` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateFeatureGroup.html
- Amazon SageMaker `ResourceSpec` API Reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ResourceSpec.html
- Amazon SageMaker Pipeline Definition JSON Schema: https://aws-sagemaker-mlops.github.io/sagemaker-model-building-pipeline-definition-JSON-schema/
- Amazon SageMaker Developer Guide, Define a pipeline: https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html
- Amazon SageMaker Developer Guide, Connect Amazon SageMaker Studio in a VPC to External Resources: https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-and-internet-access.html
- Amazon SageMaker Developer Guide, Connect to Amazon SageMaker AI resources from within a VPC: https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-connect-to-resources.html

## Issues Found
- The SageMaker Domain snippet claimed a private production posture, but it omitted `app_network_access_type = "VpcOnly"`. AWS documents that the default is `PublicInternetOnly`, which allows direct internet access for non-EFS traffic. I added `app_network_access_type = "VpcOnly"` to align the code with the post's networking guidance.
- The SageMaker Pipeline training step was underspecified for a practical training job example. It did not declare training input data, a training-job execution role, or a stopping condition. I added `InputDataConfig` with an S3 training channel, `RoleArn`, and `StoppingCondition` using fields documented in the SageMaker training-job APIs and pipeline definition schema.
- The summary stated that Studio kernels should not have direct internet access in production, but it did not mention the concrete SageMaker Domain setting required to achieve that. I updated the summary to reference `app_network_access_type = "VpcOnly"` and the need for VPC endpoints or NAT connectivity.

## Review Notes
- `jupyter_server_app_settings.default_resource_spec.instance_type = "system"` is correct. AWS documents that JupyterServer apps support the `system` value.
- The provider-generated docs for `aws_sagemaker_feature_group` currently contain swapped descriptions for some `online_store_config` and `offline_store_config` fields. I validated the feature store section against AWS API documentation instead of relying on those generated descriptions.
- The snippets still depend on surrounding resources that are not shown in the post, such as IAM roles, the VPC module, security groups, variables, and the `aws_caller_identity` data source. That is acceptable for an excerpted infrastructure guide, but the snippets are not standalone end-to-end deployments.
