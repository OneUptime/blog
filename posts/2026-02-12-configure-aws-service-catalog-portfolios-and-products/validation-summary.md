# Validation Summary: How to Configure AWS Service Catalog Portfolios and Products

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Service Catalog
- AWS CLI
- AWS CloudFormation
- Amazon S3
- Amazon RDS for PostgreSQL
- AWS IAM
- AWS Organizations

## Sources Consulted
- AWS CLI Command Reference: servicecatalog create-portfolio - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-portfolio.html
- AWS CLI Command Reference: servicecatalog create-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-product.html
- AWS CLI Command Reference: servicecatalog associate-product-with-portfolio - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/associate-product-with-portfolio.html
- AWS CLI Command Reference: servicecatalog create-constraint - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-constraint.html
- AWS Service Catalog Administrator Guide: Launch Constraints - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-launch.html
- AWS Service Catalog Administrator Guide: Tag Update Constraints - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-resourceupdate.html
- AWS Service Catalog Administrator Guide: Launching a Product with TagOptions - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/tagoptions-launching.html
- AWS CLI Command Reference: servicecatalog create-tag-option - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-tag-option.html
- AWS CLI Command Reference: servicecatalog associate-tag-option-with-resource - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/associate-tag-option-with-resource.html
- AWS CLI Command Reference: servicecatalog create-portfolio-share - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-portfolio-share.html
- AWS CLI Command Reference: servicecatalog provision-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/provision-product.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-s3-bucket.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket BucketEncryption - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-bucketencryption.html

## Issues Found
- The post stated that portfolio constraints apply to all products in a portfolio. AWS documents constraints as applying to a specific product in a specific portfolio, so this was changed to say constraints are applied to products within a specific portfolio.
- The launch role sample policy was marked as JSON but contained a `//` comment, which is invalid JSON and invalid for an IAM policy document. The comment was removed.
- The tag constraint example used `--type "TAG_UPDATE"`, but the AWS CLI supports `RESOURCE_UPDATE` for tag update constraints. The command was changed to `--type "RESOURCE_UPDATE"`.
- The tag update constraint JSON used an incorrect nested property structure. It was changed to the AWS CLI-documented structure with `Version` and `Properties.TagUpdateOnProvisionedProduct`.
- The tag constraint explanation said tag constraints enforce tagging policies and the command comment said it required a `CostCenter` tag with specific values. Tag update constraints control whether product or portfolio tag changes are applied during provisioned product updates, while TagOptions provide selectable tag values during provisioning. The explanation and comments were corrected.

## Review Notes
The AWS CLI is not installed in this workspace, so command validation was performed against the current official AWS CLI Command Reference and AWS Service Catalog documentation rather than local `aws --help` output. The placeholder S3 template URLs and sample IDs are syntactically plausible examples but would need to be replaced with real template locations and returned resource IDs before execution.
