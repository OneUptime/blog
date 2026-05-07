# Validation Summary: How to Create AWS SageMaker Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS IAM
- Amazon SageMaker AI models, endpoint configurations, and endpoints
- AWS Application Auto Scaling
- HCL

## Sources Consulted
- AWS SageMaker AI execution roles: https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html
- AWS SageMaker AI XGBoost usage: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost-how-to-use.html
- AWS SageMaker AI Docker registry paths: https://docs.aws.amazon.com/sagemaker/latest/dg-ecr-paths/sagemaker-algo-docker-registry-paths.html
- AWS SageMaker AI autoscaling target registration: https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-add-policy.html
- AWS SageMaker AI autoscaling policy definition: https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-add-code-define.html
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu planning and applying workflow: https://opentofu.org/docs/cli/run/
- AWS provider `aws_sagemaker_model` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_model.html.markdown
- AWS provider `aws_sagemaker_endpoint_configuration` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_endpoint_configuration.html.markdown
- AWS provider `aws_sagemaker_endpoint` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sagemaker_endpoint.html.markdown
- AWS provider `aws_appautoscaling_target` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider `aws_appautoscaling_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- AWS provider `aws_sagemaker_prebuilt_ecr_image` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/sagemaker_prebuilt_ecr_image.html.markdown

## Issues Found
- The model image URI used the caller's AWS account ID and the `xgboost` repository name, which does not match the current SageMaker-managed XGBoost 1.7-1 image layout. I replaced it with `data "aws_sagemaker_prebuilt_ecr_image"` and used `registry_path` so the example resolves the correct AWS-owned regional image URI.
- The SageMaker execution role only attached `AmazonSageMakerFullAccess`, which AWS documents as not granting object access to arbitrary S3 bucket names. Because the post stores model artifacts in `s3://${var.model_bucket}/...` and writes data capture output back to the same bucket, I added an inline IAM policy granting `s3:GetObject` on the model artifact path and `s3:PutObject` on the data-capture prefix.
- The model definition included `SAGEMAKER_PROGRAM` and `SAGEMAKER_CONTAINER_LOG_LEVEL` environment variables without the accompanying container/code packaging requirements. I removed that block so the example remains a valid built-in XGBoost hosting configuration instead of implying unsupported custom inference wiring.
- The autoscaling comment said the policy would scale "when invocations per instance exceed 70." AWS documents this as a target tracking policy that keeps the average around 70 invocations per instance, so I corrected the wording.

## Review Notes
- The post is technically relevant and salvageable; it required targeted fixes rather than removal.
- `1.7-1` remains a supported SageMaker XGBoost version in current AWS documentation, although newer versions also exist.
- `tofu` was not installed in the local workspace, so the deployment commands were validated against official OpenTofu documentation rather than local `--help` output.
