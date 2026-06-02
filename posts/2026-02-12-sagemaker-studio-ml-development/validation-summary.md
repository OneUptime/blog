# Validation Summary: How to Use SageMaker Studio for ML Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Studio
- AWS CLI
- Boto3 for SageMaker
- SageMaker Python SDK
- Amazon S3
- SageMaker Studio lifecycle configurations
- SageMaker custom images and Amazon ECR
- Git

## Sources Consulted
- AWS CLI Command Reference: `sagemaker create-domain` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/create-domain.html
- AWS CLI Command Reference: `sagemaker update-domain` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/update-domain.html
- Amazon SageMaker AI Developer Guide: Set up idle shutdown - https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-idle-shutdown-setup.html
- Amazon SageMaker AI Developer Guide: Amazon SageMaker Studio - https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated.html
- Amazon SageMaker AI Developer Guide: Change the instance type for Studio Classic notebooks - https://docs.aws.amazon.com/sagemaker/latest/dg/notebooks-run-and-manage-switch-instance-type.html
- Amazon SageMaker AI Developer Guide: Lifecycle configurations within Studio - https://docs.aws.amazon.com/sagemaker/latest/dg/studio-lifecycle-configurations.html
- Boto3 SageMaker `list_apps` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/list_apps.html
- Boto3 SageMaker `create_image` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_image.html
- Boto3 SageMaker `create_image_version` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_image_version.html
- SageMaker Python SDK `Session.default_bucket()` documentation - https://sagemaker.readthedocs.io/en/v2.234.0/session.html

## Issues Found
- The post said switching compute could be done without restarting the notebook and without losing notebook state. I changed this to tell readers to save work before switching compute, because AWS documentation notes that runtime state, unsaved information, or app/kernel settings may be lost depending on the Studio experience and app type.
- The default bucket comment said Studio creates the bucket automatically. I changed it to say the SageMaker Python SDK session creates the default bucket if needed, matching the SDK documentation.
- The `list_apps` example was described as checking available instance types, but the API lists running Studio apps. I corrected the comment to match the actual Boto3 API behavior.
- The lifecycle configuration text referred to notebook instances. I changed it to Studio applications, because Studio lifecycle configurations apply to Studio apps such as JupyterLab, Code Editor, Studio Classic, and notebook instances depending on configuration.
- The lifecycle configuration script used `export` statements that would only affect the script process. I changed the example to append the variables to `~/.bashrc` so new shell sessions can use them.
- The custom image snippet claimed to register a custom image with the domain, but it only created a SageMaker image and image version. I changed the comment to describe what the code actually does and noted that the image must still be attached from Studio app settings.
- The auto-shutdown CLI example used `JupyterServerAppSettings.DefaultResourceSpec.LifecycleConfigArn`, which attaches a lifecycle configuration rather than configuring native idle shutdown. I replaced it with the documented `JupyterLabAppSettings.AppLifecycleManagement.IdleSettings` structure for a 60-minute enforced JupyterLab idle timeout.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI Command Reference rather than local `aws ... help` output.
- The Python examples were syntax-checked with `ast.parse`. Runtime execution was not attempted because it would require AWS credentials, SageMaker permissions, and a real SageMaker domain.
