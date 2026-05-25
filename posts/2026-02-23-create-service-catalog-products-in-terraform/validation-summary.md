# Validation Summary: How to Create Service Catalog Products in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Service Catalog
- AWS CloudFormation
- AWS IAM
- Amazon S3

## Sources Consulted
- HashiCorp Terraform AWS Provider: aws_servicecatalog_product: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicecatalog_product
- HashiCorp Terraform AWS Provider: aws_servicecatalog_constraint: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicecatalog_constraint
- HashiCorp Terraform AWS Provider: aws_servicecatalog_product_portfolio_association: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicecatalog_product_portfolio_association
- HashiCorp Terraform AWS Provider: aws_servicecatalog_portfolio_share: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicecatalog_portfolio_share
- HashiCorp Terraform AWS Provider: aws_servicecatalog_provisioned_product: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicecatalog_provisioned_product
- AWS CLI Command Reference: servicecatalog create-constraint: https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-constraint.html
- AWS Service Catalog Administrator Guide: Template Constraint Rules: https://docs.aws.amazon.com/servicecatalog/latest/adminguide/reference-template_constraint_rules.html
- AWS Service Catalog Administrator Guide: TagOption Library: https://docs.aws.amazon.com/servicecatalog/latest/adminguide/tagoptions.html
- AWS Service Catalog Administrator Guide: Getting started with a Terraform product: https://docs.aws.amazon.com/servicecatalog/latest/adminguide/getstarted-Terraform.html

## Issues Found
- The `RESOURCE_UPDATE` constraint example used a top-level `TagUpdatesOnProvisionedProduct` key. AWS documents the parameters for this constraint as `{"Version":"2.0","Properties":{"TagUpdateOnProvisionedProduct":"ALLOWED"}}`, so the Terraform `jsonencode` payload was updated to match the required structure.
- The product section stated that Service Catalog products are backed by CloudFormation templates. Current AWS Service Catalog also supports Terraform product types, so the sentence was narrowed to clarify that the post's example uses CloudFormation-backed products.

## Review Notes
- The Terraform resource names and primary arguments used in the examples match the current HashiCorp AWS provider documentation.
- TagOptions are accurate for the CloudFormation-backed product examples in the post. AWS notes that TagOptions are not supported for Terraform Open Source or Terraform Cloud products.
