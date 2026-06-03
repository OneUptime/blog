# Validation Summary: How to Set Up AWS Control Tower for Multi-Account Governance

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Control Tower
- AWS Organizations
- AWS IAM Identity Center
- AWS Service Catalog
- AWS Config
- AWS CloudTrail
- Amazon EventBridge
- AWS CLI
- AWS CloudFormation

## Sources Consulted
- AWS Control Tower User Guide: How AWS Control Tower works - https://docs.aws.amazon.com/controltower/latest/userguide/how-control-tower-works.html
- AWS Control Tower User Guide: Shared accounts - https://docs.aws.amazon.com/controltower/latest/userguide/what-shared.html
- AWS Control Tower User Guide: Register an existing organizational unit - https://docs.aws.amazon.com/controltower/latest/userguide/importing-existing.html
- AWS Control Tower User Guide: Examples for registering an OU with APIs - https://docs.aws.amazon.com/controltower/latest/userguide/walkthrough-baseline-steps.html
- AWS Control Tower API Reference: EnableBaseline - https://docs.aws.amazon.com/controltower/latest/APIReference/API_EnableBaseline.html
- AWS CLI Command Reference: controltower commands - https://docs.aws.amazon.com/cli/latest/reference/controltower/
- AWS CLI Command Reference: get-landing-zone - https://docs.aws.amazon.com/cli/latest/reference/controltower/get-landing-zone.html
- AWS CLI Command Reference: servicecatalog provision-product - https://docs.aws.amazon.com/cli/latest/reference/servicecatalog/provision-product.html
- AWS Control Tower User Guide: Account Factory provisioning - https://docs.aws.amazon.com/controltower/latest/userguide/automated-provisioning-walkthrough.html
- AWS Control Tower User Guide: Account Factory Customization - https://docs.aws.amazon.com/controltower/latest/userguide/af-customization-page.html
- AWS Control Tower User Guide: Lifecycle events - https://docs.aws.amazon.com/controltower/latest/userguide/lifecycle-events.html
- AWS Control Tower pricing - https://aws.amazon.com/controltower/pricing/
- AWS CloudTrail pricing and cost guidance - https://aws.amazon.com/cloudtrail/pricing/
- AWS Config pricing - https://aws.amazon.com/config/pricing/

## Issues Found
- The Audit account was described as having read-only access to all accounts. Updated this to match AWS documentation: it is a restricted security/compliance account with cross-account access intended for automated review workflows rather than manual sign-in to every account.
- The Account Factory `ManagedOrganizationalUnit` example used only the OU name. Updated it to the current `OU_NAME (OU_ID)` format documented by AWS.
- The OU registration example used a non-existent `aws controltower register-organizational-unit` CLI command. Replaced it with the current API workflow: get the OU ARN, find `AWSControlTowerBaseline`, find the Identity Center enabled baseline, and call `aws controltower enable-baseline`.
- The OU creation example did not capture the OU ID returned by AWS Organizations. Updated it to use the returned ID in the follow-on registration command.
- The drift check used `list-landing-zones` to query `driftStatus`, but that command returns the landing zone ARN, not the full drift details. Updated it to call `get-landing-zone` with the ARN and query `landingZone.driftStatus`.
- The Account Factory Customization description implied a blueprint is simply a CloudFormation template stored in a Service Catalog portfolio. Updated it to describe a CloudFormation-based Service Catalog product in a hub account, matching AWS AFC terminology.
- The CloudTrail cost description said CloudTrail charges per event with the first trail free. Updated it to distinguish first-copy management events from charged data events, network activity events, and additional management-event copies.
- The fixed $50-100/month cost estimate was too dependent on usage, regions, resource churn, and logging choices. Replaced it with guidance to model costs using AWS Pricing Calculator and Cost Explorer.

## Review Notes
The article is technically relevant and contains implementation details, CLI examples, and configuration snippets. Remaining caveat: the `BASELINE_VERSION` in the OU registration example must match the deployed Control Tower landing zone compatibility table for the reader's environment.
