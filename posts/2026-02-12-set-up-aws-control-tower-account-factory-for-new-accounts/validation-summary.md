# Validation Summary: How to Set Up AWS Control Tower Account Factory for New Accounts

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Control Tower
- AWS Control Tower Account Factory
- AWS Service Catalog
- AWS Organizations
- AWS IAM Identity Center
- AWS CLI
- Python / Boto3
- Terraform
- Account Factory for Terraform (AFT)
- AWS Control Tower Customizations / Account Factory Customization

## Sources Consulted
- AWS Control Tower: Provision accounts within AWS Control Tower - https://docs.aws.amazon.com/controltower/latest/userguide/methods-of-provisioning.html
- AWS Control Tower: Provision accounts in the AWS Control Tower console - https://docs.aws.amazon.com/controltower/latest/userguide/account-create-console.html
- AWS Control Tower: Provision accounts in the Service Catalog console, with Account Factory - https://docs.aws.amazon.com/controltower/latest/userguide/provision-as-end-user.html
- AWS Control Tower: Configure Account Factory with Amazon VPC settings - https://docs.aws.amazon.com/controltower/latest/userguide/configuring-account-factory-with-VPC-settings.html
- AWS Control Tower: Overview of AWS Control Tower and VPCs - https://docs.aws.amazon.com/controltower/latest/userguide/vpc-concepts.html
- AWS Control Tower: Provision and manage accounts with Account Factory - https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html
- AWS Control Tower: Provision a new account with AFT - https://docs.aws.amazon.com/controltower/latest/userguide/aft-provision-account.html
- AWS Control Tower: Provision accounts with AWS Control Tower Account Factory for Terraform (AFT) - https://docs.aws.amazon.com/controltower/latest/userguide/taf-account-provisioning.html
- AWS Service Catalog API: ProvisionProduct - https://docs.aws.amazon.com/servicecatalog/latest/APIReference/API_ProvisionProduct.html
- AWS CLI: servicecatalog search-products - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/search-products.html
- Boto3 Service Catalog: search_products - https://docs.aws.amazon.com/boto3/latest/reference/services/servicecatalog/client/search_products.html
- Boto3 Service Catalog: provision_product - https://docs.aws.amazon.com/boto3/latest/reference/services/servicecatalog/client/provision_product.html
- Boto3 Service Catalog: list_provisioning_artifacts - https://docs.aws.amazon.com/boto3/latest/reference/services/servicecatalog/client/list_provisioning_artifacts.html
- Terraform AWS Provider: aws_controltower_landing_zone - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/controltower_landing_zone

## Issues Found
- The Account Factory settings list included an "account email template" and implied a default landing OU setting. AWS documentation describes Account Factory network configuration and OU allow-list controls, so the list was corrected.
- The Terraform `aws_controltower_landing_zone` example was presented as Account Factory network-default configuration. That resource configures a Control Tower landing zone manifest, not Account Factory VPC defaults, so the inaccurate snippet was replaced with the documented console-configurable VPC options.
- The console workflow used `AWS Control Tower > Account Factory > Create account`. Current AWS documentation describes creating accounts from `Organizations > Create resources > Create account` in the Control Tower console, so the steps were updated.
- The AWS CLI comment said the command listed provisioned product portfolios. `aws servicecatalog search-products` searches products available to the caller, so the comment was corrected.
- The Boto3 provisioning example assumed the first search result and last provisioning artifact were always the correct choices. It now selects the exact Account Factory product, handles launch paths when no default path exists, and selects the newest active non-deprecated artifact.
- The Boto3 monitoring example read `RecordErrors` from the top-level `describe_record` response. AWS returns record errors inside `RecordDetail`, so the code now reads `record['RecordDetail'].get('RecordErrors', [])`.
- The sequence diagram said Control Tower creates an SSO permission set during account provisioning. The documented behavior is that the specified IAM Identity Center user receives administrative access, so the diagram now says IAM Identity Center access is configured.
- The AFT account request example omitted `change_management_parameters`, which AWS documents as part of the account request parameters. The example now includes `change_reason` and `change_requested_by`.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against official AWS CLI documentation rather than local `--help` output. The post remains a high-level guide; production automation should add pagination, explicit error handling for missing products/artifacts/launch paths, and organization-specific validation for OU names and email patterns.
