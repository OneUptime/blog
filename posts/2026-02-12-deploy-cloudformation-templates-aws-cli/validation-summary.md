# Validation Summary: How to Deploy CloudFormation Templates with the AWS CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI v2
- AWS CloudFormation
- CloudFormation stacks, templates, parameters, capabilities, waiters, change sets, tags, and stack events
- Amazon S3 for CloudFormation template and artifact storage
- Bash scripting

## Sources Consulted
- AWS CLI Command Reference: cloudformation create-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI Command Reference: cloudformation update-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack.html
- AWS CLI Command Reference: cloudformation deploy - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- AWS CLI Command Reference: cloudformation package - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html
- AWS CLI Command Reference: cloudformation validate-template - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/validate-template.html
- AWS CLI Command Reference: cloudformation wait stack-create-complete - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-create-complete.html
- AWS CLI Command Reference: cloudformation describe-stack-events - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-events.html
- AWS CloudFormation quotas - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS CloudFormation resource tagging - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-resource-tags.html
- AWS CLI installation guide - https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

## Issues Found
- The `--no-fail-on-empty-changeset` description said the flag prevents `deploy` from returning an error when there is nothing to update. Current AWS CLI v2 documentation says the zero exit-code behavior is the default and is also the behavior when `--no-fail-on-empty-changeset` is specified. Updated the wording to say the flag ensures a zero exit code.
- The `--tags` description said tags apply to all resources in the stack. AWS CloudFormation documentation says stack-level tag propagation varies by resource type and applies only where supported. Updated the wording to say CloudFormation propagates stack-level tags to supported resources.

## Review Notes
The AWS CLI was not installed in the local workspace, so command verification was performed against current official AWS CLI v2 and CloudFormation documentation. The remaining commands, flags, parameter formats, template size limits, waiter usage, IAM capabilities, S3 template URL usage, and Bash syntax are technically correct as written.
