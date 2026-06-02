# Validation Summary: How to Integrate GuardDuty with Security Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon GuardDuty
- AWS Security Hub CSPM
- AWS Security Finding Format (ASFF)
- AWS CLI
- Amazon EventBridge
- AWS Lambda with Python and boto3
- Terraform AWS Provider

## Sources Consulted
- Amazon GuardDuty User Guide: Integrating with AWS Security Hub CSPM - https://docs.aws.amazon.com/guardduty/latest/ug/securityhub-integration.html
- AWS Security Hub User Guide: Defining a rule in EventBridge - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-define-rule.html
- AWS Security Hub User Guide: AWS service integrations with Security Hub CSPM - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html
- AWS CLI Command Reference: enable-import-findings-for-product - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/securityhub/enable-import-findings-for-product.html
- AWS CLI Command Reference: get-findings - https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-findings.html
- AWS CLI Command Reference: batch-update-findings - https://awscli.amazonaws.com/v2/documentation/api/2.8.7/reference/securityhub/batch-update-findings.html
- AWS CLI User Guide examples for Security Hub - https://docs.aws.amazon.com/cli/latest/userguide/cli_securityhub_code_examples.html
- Terraform Registry: aws_securityhub_product_subscription - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_product_subscription
- Terraform Registry: aws_region data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region

## Issues Found
- The EventBridge custom action rule filtered on `detail.actionName`, but AWS documents Security Hub custom action event patterns as matching the custom action ARN in the top-level `resources` array. Updated the `create-action-target` command to capture `ActionTargetArn` and changed the `put-rule` event pattern to use `resources`.
- The Terraform example used `data.aws_region.current.name`. In the current Terraform AWS Provider documentation, the current-region value is exposed through the newer `region` attribute in examples, while `name` is deprecated as an argument. Updated the product ARN interpolation to `data.aws_region.current.region`.

## Review Notes
- The post's main claims about GuardDuty findings flowing automatically to Security Hub after both services are enabled in the same account and Region are consistent with AWS documentation.
- AWS CLI was not installed in the local environment, so command shapes were verified against official AWS CLI documentation rather than local `--help` output.
