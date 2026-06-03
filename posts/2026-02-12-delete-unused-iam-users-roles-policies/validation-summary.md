# Validation Summary: How to Delete Unused IAM Users, Roles, and Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS IAM
- AWS CLI
- Boto3 for Python
- IAM credential reports
- IAM service last accessed / Access Advisor data
- IAM users, roles, managed policies, MFA devices, SSH public keys, and service-specific credentials

## Sources Consulted
- AWS IAM User Guide: Generate credential reports for your AWS account - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- Boto3 IAM `generate_credential_report` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/generate_credential_report.html
- AWS CLI v2 `generate-service-last-accessed-details` reference - https://docs.aws.amazon.com/cli/latest/reference/iam/generate-service-last-accessed-details.html
- AWS CLI v2 `get-service-last-accessed-details` reference - https://docs.aws.amazon.com/cli/latest/reference/iam/get-service-last-accessed-details.html
- AWS IAM User Guide: Refine permissions using last accessed information - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_last-accessed.html
- AWS IAM API `DeleteUser` reference - https://docs.aws.amazon.com/IAM/latest/APIReference/API_DeleteUser.html
- AWS IAM User Guide: Remove or deactivate an IAM user - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_remove.html
- AWS IAM API `RoleLastUsed` reference - https://docs.aws.amazon.com/IAM/latest/APIReference/API_RoleLastUsed.html
- Boto3 IAM `ListRoles` paginator reference - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/paginator/ListRoles.html
- AWS CLI v2 `list-policies` reference - https://docs.aws.amazon.com/cli/latest/reference/iam/list-policies.html

## Issues Found
- The credential report example used a fixed 10-second sleep after `generate_credential_report`. Boto3 returns a `State` value of `STARTED`, `INPROGRESS`, or `COMPLETE`, so I changed the example to poll until `COMPLETE` before calling `get_credential_report`.
- The Access Advisor example used a fixed 5-second sleep and described the data as services a user actually accessed. AWS documents service last accessed data as access attempts and exposes `JobStatus`, so I changed the text to "attempted to access" and updated the command to wait for `COMPLETED` or fail on `FAILED`.
- The full user deletion script claimed to remove all associated resources but omitted SSH public keys and service-specific credentials, both of which AWS lists as items to remove before programmatic user deletion. I added deletion loops for both resource types.
- The MFA deletion loop always reported MFA device deletion even though `delete-virtual-mfa-device` applies only to virtual MFA devices. I changed the output to distinguish deleted virtual MFA devices from MFA devices that were only deactivated.
- The role cleanup section said it used the Access Advisor API but the code used `RoleLastUsed` data. I corrected the wording, added the IAM tracking-period caveat, and changed `list_roles(MaxItems=1000)` to the Boto3 paginator so accounts with more than one page of roles are handled correctly.

## Review Notes
The remaining examples use current AWS IAM and AWS CLI operations. The role last-used and service last-accessed data have IAM tracking-period limitations, so deletion decisions should still be paired with CloudTrail review and application owner confirmation.
