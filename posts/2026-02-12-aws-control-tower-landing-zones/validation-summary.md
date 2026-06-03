# Validation Summary: How to Set Up AWS Control Tower Landing Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Control Tower
- AWS Organizations
- AWS IAM Identity Center
- AWS Service Catalog / Account Factory
- AWS CloudTrail
- AWS Config
- AWS CloudFormation
- AWS GuardDuty
- AWS Security Hub
- AWS CLI
- Customizations for AWS Control Tower (CfCT)

## Sources Consulted
- AWS Control Tower User Guide: Manage Accounts Through AWS Organizations - https://docs.aws.amazon.com/controltower/latest/userguide/organizations.html
- AWS Control Tower User Guide: Examples: Register an AWS Control Tower OU with APIs only - https://docs.aws.amazon.com/controltower/latest/userguide/walkthrough-baseline-steps.html
- AWS CLI Command Reference: controltower - https://docs.aws.amazon.com/cli/latest/reference/controltower/
- AWS CLI Command Reference: enable-baseline - https://docs.aws.amazon.com/cli/latest/reference/controltower/enable-baseline.html
- AWS CLI Command Reference: list-landing-zones - https://docs.aws.amazon.com/cli/latest/reference/controltower/list-landing-zones.html
- AWS CLI Command Reference: get-landing-zone - https://docs.aws.amazon.com/cli/latest/reference/controltower/get-landing-zone.html
- AWS CLI Command Reference: enable-control - https://docs.aws.amazon.com/cli/latest/reference/controltower/enable-control.html
- AWS Control Tower Controls Reference: Control API examples - https://docs.aws.amazon.com/controltower/latest/controlreference/control-api-examples-short.html
- AWS Control Tower Controls Reference: Identifiers for legacy controls - https://docs.aws.amazon.com/controltower/latest/controlreference/identifiers-for-legacy-controls.html
- AWS Control Tower User Guide: Provision and manage accounts with Account Factory - https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html
- AWS Control Tower User Guide: Working with AWS IAM Identity Center and AWS Control Tower - https://docs.aws.amazon.com/controltower/latest/userguide/sso.html
- AWS Control Tower User Guide: The CfCT manifest file - https://docs.aws.amazon.com/controltower/latest/userguide/the-manifest-file.html
- AWS Control Tower User Guide: Detect and resolve drift in AWS Control Tower - https://docs.aws.amazon.com/controltower/latest/userguide/drift.html
- AWS CloudFormation Resource Reference: AWS::GuardDuty::Detector, AWS::SecurityHub::Hub, AWS::Config::ConfigRule - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html

## Issues Found
- The landing zone status command used `list-landing-zones` fields that are not returned by the current AWS CLI. I changed it to fetch the landing zone ARN with `list-landing-zones` and then call `get-landing-zone` for status, drift, and version.
- The OU registration command used `aws controltower register-organizational-unit`, which is not a current AWS CLI Control Tower command. I replaced it with the documented `enable-baseline` flow for applying `AWSControlTowerBaseline` to an OU.
- The guardrail listing comment said "available guardrails" while the command lists enabled controls for a target OU. I changed the wording to "enabled guardrails."
- Two detective controls were described as if they directly enforce or disallow behavior. I changed the comments for the S3 account-level public access block and restricted common ports controls to describe detection behavior accurately.
- The CloudFormation Config rule comment said it required encryption on new S3 buckets, but the rule detects non-compliance. I changed the comment to "Detect S3 buckets without server-side encryption."
- The monitoring section described `list-landing-zone-operations` as a drift check. I replaced it with `get-landing-zone` and the documented `driftStatus.status` field.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
- The post still uses regional AWS Control Tower control identifiers. AWS documentation now also recommends global Control Catalog identifiers for many controls, but regional identifiers remain documented for legacy controls.
