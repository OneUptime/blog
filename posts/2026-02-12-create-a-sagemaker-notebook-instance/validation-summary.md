# Validation Summary: How to Create a SageMaker Notebook Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker notebook instances
- AWS CLI
- IAM roles and managed policies
- SageMaker lifecycle configurations
- Jupyter and JupyterLab
- Conda and pip package installation
- SageMaker Git repository integration
- Python, boto3, SageMaker Python SDK, PyTorch, and scikit-learn

## Sources Consulted
- AWS CLI Command Reference: `sagemaker create-notebook-instance` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/create-notebook-instance.html
- AWS CLI Command Reference: `sagemaker update-notebook-instance` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/update-notebook-instance.html
- AWS CLI Command Reference: `sagemaker create-code-repository` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/create-code-repository.html
- AWS CLI Command Reference: `sagemaker create-presigned-notebook-instance-url` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/create-presigned-notebook-instance-url.html
- AWS CLI Command Reference: `sagemaker list-notebook-instances` - https://docs.aws.amazon.com/cli/latest/reference/sagemaker/list-notebook-instances.html
- Amazon SageMaker API Reference: `CreateNotebookInstance` - https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstance.html
- Amazon SageMaker API Reference: `CreateNotebookInstanceLifecycleConfig` - https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstanceLifecycleConfig.html
- Amazon SageMaker Developer Guide: Customize a notebook instance using a lifecycle configuration script - https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html
- Amazon SageMaker Developer Guide: Connect a notebook instance in a VPC to external resources - https://docs.aws.amazon.com/sagemaker/latest/dg/appendix-notebook-and-internet-access.html
- Amazon SageMaker Developer Guide: External library and kernel installation - https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-add-external.html
- Amazon SageMaker AI pricing - https://aws.amazon.com/sagemaker/ai/pricing/

## Issues Found
- The instance type section listed exact hourly prices without a Region or date. SageMaker prices vary by Region and can change, so I replaced the hard-coded prices with a recommendation to check current SageMaker pricing for the target Region.
- The direct internet access explanation said users cannot install `pip` packages without internet access. That is too broad: public package installs require a route to the internet, but VPC NAT or private package repositories can support package installation without SageMaker direct internet access. I updated the wording.
- The lifecycle configuration examples used plain `base64`, which can emit wrapped output and break the JSON string passed to the AWS CLI. I changed the commands to strip newlines from the base64 output.
- The lifecycle package installation script ran conda and pip commands as root. AWS recommends running changes under `/home/ec2-user/SageMaker` and notebook-user environment work as `ec2-user`, so I wrapped those commands with `sudo -u ec2-user -i`.
- The custom package lifecycle script installed and rebuilt a JupyterLab extension during lifecycle execution. Lifecycle scripts have a five-minute execution limit, and rebuilding JupyterLab can exceed that limit or be unnecessary on modern JupyterLab installations. I removed that step from the setup snippet.
- The auto-stop process was launched as root. I changed it to run as `ec2-user` and write logs under `/home/ec2-user/SageMaker/`.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against the current official AWS CLI command reference rather than local `aws --help` output. The included auto-stop script is a reasonable example, but AWS's lifecycle configuration limits and Jupyter server behavior can vary by SageMaker notebook platform image; teams should test lifecycle scripts on the exact notebook image they plan to use.
