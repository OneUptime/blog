# Validation Summary: How to Create SageMaker Notebooks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon SageMaker notebook instances
- Amazon SageMaker Studio domains and user profiles
- AWS IAM
- Amazon VPC security groups and endpoints
- AWS KMS
- Amazon S3

## Sources Consulted
- Terraform AWS provider: `aws_sagemaker_notebook_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_notebook_instance
- Terraform AWS provider: `aws_sagemaker_notebook_instance_lifecycle_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_notebook_instance_lifecycle_configuration
- Terraform AWS provider: `aws_sagemaker_domain` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_domain
- Terraform AWS provider: `aws_sagemaker_user_profile` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_user_profile
- Terraform AWS provider: `aws_sagemaker_code_repository` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sagemaker_code_repository
- Terraform AWS provider: `aws_security_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS SageMaker documentation: Access Notebook Instances - https://docs.aws.amazon.com/sagemaker/latest/dg/howitworks-access-ws.html
- AWS SageMaker documentation: Notebook Instance Metadata - https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-metadata.html
- AWS SageMaker API documentation: CreateDomain networking behavior - https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateDomain.html
- AWS SageMaker documentation: Connect Studio in a VPC to external resources - https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-and-internet-access.html

## Issues Found
- The notebook examples used `platform_identifier = "notebook-al2-v2"`, which is deprecated in the current Terraform AWS provider documentation. Updated both notebook examples to `notebook-al2-v3`.
- The lifecycle configuration comment said `on_start` runs on starts and restarts, but Terraform/AWS document that it also runs when the notebook is created. Updated the comment to include creation.
- The auto-stop script read the notebook name from an EC2 instance metadata tag path. SageMaker officially exposes notebook instance identity via `/opt/ml/metadata/resource-metadata.json`, so the script now reads `ResourceName` from that file.
- The Studio domain example placed the domain in private subnets but did not set `app_network_access_type = "VpcOnly"`. Added it so the Terraform matches the stated VPC-only networking behavior.
- The shared security group used for Studio apps did not allow NFS traffic on TCP 2049. AWS documents that Studio apps need inbound and outbound NFS traffic for the domain EFS volume, so self-referencing ingress and egress rules on port 2049 were added.
- The notebook URL output manually constructed the URL. The Terraform resource exports a `url` attribute, so the output was updated to use `aws_sagemaker_notebook_instance.ml_notebook.url`.

## Review Notes
The examples remain illustrative and still assume supporting resources such as VPC endpoints, private subnets, NAT routing where needed, and globally unique S3 bucket names. The lifecycle auto-stop script is a simplified production pattern; teams should test it against their Jupyter environment and idle-state requirements before broad rollout.
