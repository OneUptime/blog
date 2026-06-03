# Validation Summary: How to Add Manual Approval Steps to CodePipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodePipeline
- AWS CodePipeline manual approval actions
- Amazon SNS
- AWS IAM
- AWS CLI
- AWS Lambda
- Slack webhooks
- JSON pipeline declarations
- Python

## Sources Consulted
- AWS CodePipeline User Guide: Add a manual approval action to a stage - https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html
- AWS CodePipeline User Guide: Add a manual approval action to a pipeline - https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html
- AWS CodePipeline User Guide: Approve or reject an approval action - https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-approve-or-reject.html
- AWS CodePipeline User Guide: JSON data format for manual approval notifications - https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-json-format.html
- AWS CodePipeline User Guide: Action declaration - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-requirements.html
- AWS CodePipeline User Guide: Pipeline declaration - https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-requirements.html
- AWS CodePipeline User Guide: Quotas in AWS CodePipeline - https://docs.aws.amazon.com/codepipeline/latest/userguide/limits.html
- AWS CodePipeline API Reference: ActionDeclaration - https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_ActionDeclaration.html
- AWS CLI Command Reference: codepipeline put-approval-result - https://docs.aws.amazon.com/cli/latest/reference/codepipeline/put-approval-result.html
- AWS CLI Command Reference: sns subscribe - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html

## Issues Found
- Several example ARNs used a 9-digit placeholder account ID (`123456789`). AWS IAM role ARN validation expects 12-digit account IDs, and AWS examples use 12-digit IDs. Updated the SNS, CodePipeline, and CodeStar connection ARNs to use `123456789012`.
- The post described seven days as the maximum manual approval timeout. AWS CodePipeline now documents a 7-day default for manual approval actions, but the action timeout can be overridden with `timeoutInMinutes` from 5 minutes up to 86400 minutes (60 days). Updated the timeout explanation, diagram label, approval action examples, and best-practice note.
- The complete pipeline JSON omitted the required `artifactStore` or `artifactStores` field. Added an `artifactStore` block with an S3 artifact bucket location.
- The SNS notification setup omitted the prerequisite that the CodePipeline service role must be allowed to publish to the SNS topic. Added a focused `sns:Publish` policy statement for the approval notification topic.

## Review Notes
The AWS CLI commands and shorthand syntax for `put-approval-result` are consistent with the AWS CLI reference. The token retrieval query matches the documented `latestExecution.token` location for non-PARALLEL pipeline execution modes; for pipelines using `executionMode` `PARALLEL`, AWS CLI documentation notes that approvers must use the action execution `externalExecutionId` instead.
