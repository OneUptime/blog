# Validation Summary: How to Detect and Fix CloudFormation Drift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation drift detection
- AWS CLI CloudFormation commands
- CloudFormation templates
- Amazon EventBridge scheduled rules
- AWS Lambda with Python 3.12
- Amazon SNS notifications
- AWS IAM policies

## Sources Consulted
- AWS CloudFormation User Guide: Detect unmanaged configuration changes to stacks and resources with drift detection: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html
- AWS CloudFormation User Guide: Detect drift on an entire CloudFormation stack: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/detect-drift-stack.html
- AWS CloudFormation User Guide: Detect drift on individual stack resources: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/detect-drift-resource.html
- AWS CloudFormation User Guide: Using drift-aware change sets: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/drift-aware-change-sets.html
- AWS CLI Command Reference: describe-stack-resource-drifts: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-resource-drifts.html
- AWS CLI Command Reference: create-change-set: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CLI Command Reference: deploy: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- AWS CloudFormation Template Reference: AWS::Events::Rule: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS Lambda Developer Guide: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The "List all resources" CLI comment was inaccurate because the command filters for `MODIFIED` and `DELETED` resources. Changed it to "List drifted resources and their drift status."
- The `NOT_CHECKED` description was too narrow. AWS documents it as resources CloudFormation has not checked, including unsupported resource types. Updated the table description.
- The individual resource drift detection section stated that it is faster than full-stack drift detection. AWS documents the use case but does not guarantee speed. Changed this to "can be faster."
- The remediation section recommended normal `update-stack` or `deploy` commands to re-apply the current template. Current AWS documentation provides drift-aware change sets with `--deployment-mode REVERT_DRIFT` for bringing actual resource states back in line with template definitions. Replaced the normal update/deploy examples with `create-change-set` and `execute-change-set`.
- The automated Lambda example had `Timeout: 120` but the code could sleep for up to 300 seconds while polling drift detection. Increased the timeout to 360 seconds so the sample can complete its polling loop.

## Review Notes
The examples are otherwise technically consistent with current AWS documentation. Drift detection still has important service limitations: only explicitly defined resource properties are checked, unsupported resource types are not checked, and nested stacks require separate drift detection.
