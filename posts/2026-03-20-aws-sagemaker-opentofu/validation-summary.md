# Validation Summary: How to Deploy AWS SageMaker with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS SageMaker AI
- AWS IAM
- AWS Application Auto Scaling
- Amazon S3
- Amazon VPC

## Sources Consulted
- AWS provider docs for `aws_sagemaker_domain`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_domain.html.markdown
- AWS provider docs for `aws_sagemaker_user_profile`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_user_profile.html.markdown
- AWS provider docs for `aws_sagemaker_model`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_model.html.markdown
- AWS provider docs for `aws_sagemaker_endpoint_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_endpoint_configuration.html.markdown
- AWS provider docs for `aws_sagemaker_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_endpoint.html.markdown
- AWS provider docs for `aws_appautoscaling_target`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider docs for `aws_appautoscaling_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- SageMaker Studio idle shutdown docs: https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-idle-shutdown.html
- SageMaker Studio idle shutdown setup docs: https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-idle-shutdown-setup.html
- SageMaker Studio Classic lifecycle configuration docs: https://docs.aws.amazon.com/sagemaker/latest/dg/studio-lcc-defaults.html
- SageMaker endpoint update API docs: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html
- SageMaker blue/green deployment docs: https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-blue-green.html
- SageMaker endpoint auto scaling policy docs: https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-add-code-define.html
- Application Auto Scaling `RegisterScalableTarget` API docs: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_RegisterScalableTarget.html
- SageMaker notebook instance docs: https://docs.aws.amazon.com/sagemaker/latest/dg/nbi.html

## Issues Found
- The post description and architecture diagram referred to Notebook Instances, but the code provisions a SageMaker domain and Studio app settings rather than `aws_sagemaker_notebook_instance` resources. I updated the wording and diagram to refer to JupyterLab apps instead.
- The Studio section used a Studio Classic-style `KernelGateway` lifecycle-config approach for idle shutdown. AWS now documents idle shutdown for Studio through `jupyter_lab_app_settings.app_lifecycle_management.idle_settings`, so I replaced the outdated example with the current configuration.
- The endpoint example used `create_before_destroy = true` on `aws_sagemaker_endpoint` and the best-practices text attributed zero-downtime updates to that lifecycle setting. I removed that block and corrected the explanation to match SageMaker's actual update model: create a new endpoint configuration and let `UpdateEndpoint` shift traffic to the new fleet.
- The auto scaling example said the target tracked 70% CPU utilization, but the configured predefined metric was `SageMakerVariantInvocationsPerInstance`. I corrected the comment to describe the actual metric behavior.

## Review Notes
- The OpenTofu examples rely on the official AWS provider resource schema, so the provider documentation used for validation is the `hashicorp/aws` provider documentation consumed by OpenTofu.
- The `environment` example in `aws_sagemaker_model` assumes a SageMaker-compatible inference container. Fully custom inference containers may require different environment variables or startup behavior.
