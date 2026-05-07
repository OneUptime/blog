# Validation Summary: How to Create AWS SageMaker Notebooks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon SageMaker AI Notebook Instances
- Amazon SageMaker AI Domains and User Profiles
- AWS CLI
- AWS IAM
- AWS VPC security groups

## Sources Consulted
- AWS provider `aws_sagemaker_notebook_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sagemaker_notebook_instance.html.markdown
- AWS provider `aws_sagemaker_notebook_instance_lifecycle_configuration` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sagemaker_notebook_instance_lifecycle_configuration.html.markdown
- AWS provider `aws_sagemaker_domain` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sagemaker_domain.html.markdown
- AWS provider `aws_sagemaker_user_profile` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sagemaker_user_profile.html.markdown
- AWS provider `aws_sagemaker_prebuilt_ecr_image` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/sagemaker_prebuilt_ecr_image.html.markdown
- Amazon SageMaker `ResourceSpec` API reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ResourceSpec.html
- Amazon SageMaker AI lifecycle configuration guide: https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config-create.html
- AWS CLI `stop-notebook-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/sagemaker/stop-notebook-instance.html
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The Studio domain example set `sagemaker_image_arn` to `data.aws_sagemaker_prebuilt_ecr_image.studio.registry_path`. This was incorrect because `sagemaker_image_arn` expects a SageMaker image ARN, while `aws_sagemaker_prebuilt_ecr_image` returns an ECR registry path for a container image. I removed that line and kept the valid `instance_type = "system"` setting for the Jupyter server resource spec.
- The lifecycle configuration comment said it would "Clone" notebooks from S3, but the command uses `aws s3 sync`. I updated the comment to say "Sync" so the explanation matches the command.

## Review Notes
- The post is technically valid after the fixes above. The AWS documentation now brands the service as "SageMaker AI", while the provider resource names remain `aws_sagemaker_*`; the post’s terminology is still understandable, but that naming difference may be worth standardizing in future edits.
