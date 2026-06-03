# Validation Summary: How to Use AWS Service Catalog for Governed Self-Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Service Catalog
- AWS CloudFormation
- AWS CLI
- Amazon RDS for PostgreSQL
- AWS IAM
- Amazon S3
- AWS Organizations

## Sources Consulted
- AWS CLI Command Reference: create-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-product.html
- AWS CLI Command Reference: create-constraint - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-constraint.html
- AWS CLI Command Reference: provision-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/provision-product.html
- AWS CLI Command Reference: describe-provisioned-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/describe-provisioned-product.html
- AWS CLI Command Reference: describe-record - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/describe-record.html
- AWS CLI Command Reference: create-portfolio-share - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-portfolio-share.html
- AWS CLI Command Reference: create-provisioning-artifact - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/create-provisioning-artifact.html
- AWS Service Catalog Administrator Guide: Launch constraints - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-launch.html
- AWS Service Catalog Administrator Guide: Add a launch constraint - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/getstarted-launchconstraint.html
- AWS Service Catalog Administrator Guide: Template constraint rules - https://docs.aws.amazon.com/servicecatalog/latest/adminguide/reference-template_constraint_rules.html
- AWS CloudFormation Template Reference: AWS::RDS::DBInstance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- Amazon RDS for PostgreSQL Release Notes - https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS Managed Policy Reference: AWSCloudFormationFullAccess - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCloudFormationFullAccess.html
- AWS Managed Policy Reference: AmazonEC2FullAccess - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2FullAccess.html

## Issues Found
- The introduction described CloudFormation templates themselves as "products." Changed this to products backed by CloudFormation templates because Service Catalog products contain provisioning artifacts such as CloudFormation templates.
- The post said developers do not need direct AWS permissions. Clarified that they do not need direct permissions for CloudFormation or the underlying provisioned resources, but they still need AWS Service Catalog end-user permissions.
- The RDS example pinned PostgreSQL `EngineVersion` to `15.4`, which AWS now lists as past standard support. Changed it to major version `15` so RDS selects a current minor version for that major release.
- The launch role example attached RDS and VPC read-only policies only. Added CloudFormation, EC2, and S3 read policies so the launch role can create the CloudFormation stack, create the EC2 security group, and read the template artifact.
- Several IAM ARNs used a 9-digit example account ID. Updated them to a valid 12-digit example account ID.
- The status-check command queried `ProvisionedProductDetail.Outputs`, which is not returned by `describe-provisioned-product`. Split this into a status query and a `describe-record` query against the latest record's `RecordOutputs`.
- The portfolio sharing sentence implied direct access for an entire organization. Adjusted it to describe sharing with accounts/OUs in AWS Organizations.

## Review Notes
The launch role example still uses broad AWS managed policies for readability. In production, these should be replaced with a least-privilege custom policy scoped to the specific CloudFormation, RDS, EC2, S3, Secrets Manager, and KMS actions required by the product template.
