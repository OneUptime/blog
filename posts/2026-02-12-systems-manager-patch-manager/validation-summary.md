# Validation Summary: How to Use Systems Manager Patch Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Systems Manager Patch Manager
- AWS Systems Manager Maintenance Windows
- AWS Systems Manager Run Command
- AWS CLI
- Amazon EC2 tags and patch groups
- Linux patch baselines for Amazon Linux 2 and Ubuntu Server

## Sources Consulted
- AWS Systems Manager Patch Manager overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html
- AWS Systems Manager predefined and custom patch baselines: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-predefined-and-custom-patch-baselines.html
- AWS Systems Manager Linux patch baseline rules: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-linux-rules.html
- AWS Systems Manager PatchRule API reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PatchRule.html
- AWS Systems Manager patch groups: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-patch-groups.html
- AWS Systems Manager AWS-RunPatchBaseline document: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html
- AWS CLI create-patch-baseline reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-patch-baseline.html
- AWS CLI describe-instance-patches reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-patches.html
- AWS CLI register-task-with-maintenance-window reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/register-task-with-maintenance-window.html
- AWS Systems Manager maintenance window schedule options: https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-schedule-options.html

## Issues Found
- The Ubuntu patch baseline example used `ApproveAfterDays`, but AWS documentation states auto-approval options are not supported for Ubuntu Server because reliable package release dates are unavailable. Removed the `ApproveAfterDays` fields from the Ubuntu example and clarified that the rules should filter by priority and section without approval delays.
- The examples used the `Patch Group` tag key. AWS supports both `Patch Group` and `PatchGroup`, but `PatchGroup` is required when EC2 tags are exposed in instance metadata. Updated the examples to use `PatchGroup` consistently.
- The kernel baseline was described as including only kernel patches, but its approval rules would also approve non-kernel critical security patches. Removed the broad approval rules so the baseline relies on the explicit `kernel*` approved-patches list.

## Review Notes
The AWS CLI is not installed in the local environment, so command validation was performed against current official AWS CLI and Systems Manager documentation instead of local `aws help` output.
