# Validation Summary: How to Use EC2 Image Builder to Automate AMI Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Image Builder
- Amazon Machine Images (AMIs)
- AWS CLI
- IAM roles and instance profiles
- AWSTOE component documents
- Amazon S3 logging
- Amazon EventBridge
- Terraform AWS provider

## Sources Consulted
- AWS EC2 Image Builder User Guide: https://docs.aws.amazon.com/imagebuilder/latest/userguide/what-is-image-builder.html
- AWS EC2 Image Builder setup prerequisites: https://docs.aws.amazon.com/imagebuilder/latest/userguide/set-up-ib-env.html
- AWS service-linked roles for Image Builder: https://docs.aws.amazon.com/imagebuilder/latest/userguide/image-builder-service-linked-role.html
- AWSTOE component document framework: https://docs.aws.amazon.com/imagebuilder/latest/userguide/toe-use-documents.html
- AWSTOE action modules: https://docs.aws.amazon.com/imagebuilder/latest/userguide/toe-action-modules.html
- AWS CLI create-component reference: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-component.html
- AWS CLI create-image-recipe reference: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-recipe.html
- AWS CLI create-infrastructure-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-infrastructure-configuration.html
- AWS CLI create-distribution-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-distribution-configuration.html
- AWS CLI create-image-pipeline reference: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-pipeline.html
- HashiCorp Terraform AWS provider Image Builder component docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/imagebuilder_component

## Issues Found
- The IAM section conflated the Image Builder service-linked role with the build instance profile role. Updated the text to explain that Image Builder uses `AWSServiceRoleForImageBuilder` for service actions, while the build instance profile role needs policies for AWSTOE, SSM, and S3 access.
- The sample inline IAM policy included EC2 and SSM actions that belong to service/user permissions rather than the build instance's S3 access example. Narrowed the example policy to the S3 read/write permissions described by the surrounding text.
- Several placeholder account IDs in Image Builder ARNs and AMI launch permissions were 9 digits. Changed them to 12-digit placeholders so they match AWS account ID requirements.
- The Terraform section called the snippet a complete equivalent configuration even though it references infrastructure and distribution resources that are not shown. Changed the wording to "same core setup" and "Core Terraform resources" to avoid implying the snippet is standalone.
- The monitoring section referred to CloudWatch Events. Updated it to Amazon EventBridge, the current service name for event rules.

## Review Notes
The AWS CLI options, Image Builder component schema, AWSTOE phases/actions, distribution configuration placeholders, schedule start condition, and Terraform resource shapes are consistent with current official documentation. The Terraform snippet is still illustrative and would need the referenced infrastructure and distribution configuration resources in a real module.
