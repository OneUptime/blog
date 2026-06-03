# Validation Summary: How to Handle CloudFormation Stack Update Rollbacks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- CloudFormation stack updates and rollbacks
- CloudFormation stack policies
- CloudFormation UpdateReplacePolicy and DeletionPolicy
- CloudWatch alarm rollback triggers
- JMESPath queries for AWS CLI output

## Sources Consulted
- AWS CloudFormation API Reference: ContinueUpdateRollback - https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ContinueUpdateRollback.html
- AWS CloudFormation User Guide: View CloudFormation stack events and stack status codes - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/view-stack-events.html
- AWS CLI Command Reference: cloudformation wait stack-rollback-complete - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-rollback-complete.html
- AWS CloudFormation User Guide: Roll back your CloudFormation stack on alarm breach with rollback triggers - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html
- AWS CloudFormation User Guide: Prevent updates to stack resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html
- AWS CloudFormation User Guide: UpdateReplacePolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatereplacepolicy.html
- AWS CloudFormation User Guide: Update CloudFormation stacks using change sets - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html

## Issues Found
- The post said a stack in `UPDATE_ROLLBACK_FAILED` cannot be deleted. AWS documentation states that in this status you can delete the stack or continue rollback. Updated the wording to say the stack cannot be updated or have new change sets created until recovery, and that the recovery options are continuing rollback or deleting the stack.
- The rollback-failure diagnostic query filtered for `UPDATE_ROLLBACK_FAILED`, but resources eligible for `ResourcesToSkip` are specifically resources in `UPDATE_FAILED` because rollback failed. Updated the query to show `UPDATE_FAILED` and `DELETE_FAILED` events.
- The explanation of `--resources-to-skip` said CloudFormation ignores skipped resources. AWS documents that CloudFormation sets skipped resources to `UPDATE_COMPLETE` and continues rollback. Updated the explanation and added the constraint that only resources in the correct rollback-failed `UPDATE_FAILED` state can be skipped.
- The skipped-resource reconciliation guidance suggested importing skipped resources back into the stack. Skipped resources are still represented in the stack, but their actual state may not match the template. Updated the guidance to reconcile the resource or template state, with resource import mentioned only for unmanaged replacement resources.
- The initial diagnostic comment claimed the command finds the first failure event, but the command lists matching failure events. Updated the comment to avoid implying chronological first-event selection.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference and AWS CloudFormation documentation instead of local `aws --help` output.
