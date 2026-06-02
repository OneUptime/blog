# Validation Summary: How to Fix CloudFormation 'UPDATE_ROLLBACK_FAILED' Stack Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- CloudFormation stack rollback recovery
- CloudFormation resource import
- CloudFormation drift detection
- CloudFormation stack policies
- IAM roles
- EC2 security groups and network interfaces

## Sources Consulted
- AWS CLI Command Reference: continue-update-rollback - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/continue-update-rollback.html
- AWS CloudFormation API Reference: ContinueUpdateRollback - https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ContinueUpdateRollback.html
- AWS CloudFormation User Guide: Continue rolling back an update - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html
- AWS CloudFormation User Guide: Troubleshooting CloudFormation, update rollback failed - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html
- AWS CloudFormation User Guide: View CloudFormation stack events - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/view-stack-events.html
- AWS CLI Command Reference: delete-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CLI Command Reference: create-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CloudFormation User Guide: Import AWS resources into a CloudFormation stack manually - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-manually.html
- AWS CloudFormation User Guide: Detect drift on an entire CloudFormation stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/detect-drift-stack.html
- AWS CloudFormation User Guide: Prevent updates to stack resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html
- AWS CLI Command Reference: describe-stack-events - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-events.html
- AWS CLI Command Reference: describe-stack-drift-detection-status - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-drift-detection-status.html
- AWS CLI Command Reference: describe-network-interfaces - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html

## Issues Found
- The post originally said a stack in `UPDATE_ROLLBACK_FAILED` could not be deleted. AWS documentation says that in this state you can delete the stack or continue rollback, although updates are blocked until recovery. I changed the introduction to say the stack cannot be updated normally and can either continue rollback or be deleted.
- The post originally said skipped rollback resources are out of CloudFormation's control and should be imported back. AWS documentation says CloudFormation marks skipped resources as `UPDATE_COMPLETE`, but their actual state can be inconsistent with the stack template and must be reconciled before future updates. I changed this section to recommend syncing the resource and template state, and kept resource import only for unmanaged resources that need to be brought into a stack.
- The post originally recommended `delete-stack --retain-resources` directly from the unrecoverable rollback scenario and said it keeps the actual resources intact. AWS CLI documentation describes `--retain-resources` for stacks in `DELETE_FAILED`, retaining only the specified logical resources. I changed the guidance to delete the stack first, then use `--retain-resources` if deletion fails and the stack enters `DELETE_FAILED`.

## Review Notes
The AWS CLI commands and flags used for rollback continuation, event inspection, role selection, resource import, drift detection, stack policies, IAM role lookup, EC2 security group lookup, and network interface lookup are current and match official documentation. Resource import examples still require a valid full stack template, supported importable resource type, and `DeletionPolicy` on imported resources.
