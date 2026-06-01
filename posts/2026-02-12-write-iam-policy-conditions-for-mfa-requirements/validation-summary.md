# Validation Summary: How to Write IAM Policy Conditions for MFA Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM JSON policies and condition operators
- AWS Security Token Service (STS)
- AWS CLI
- Multi-factor authentication (MFA)

## Sources Consulted
- AWS IAM User Guide: AWS global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM User Guide: IAM JSON policy condition operators - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM User Guide: IAM users self-manage MFA policy examples - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_iam_mfa-selfmanage.html
- AWS CLI Command Reference: sts get-session-token - https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html
- AWS CLI Command Reference: sts assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI Command Reference: iam simulate-custom-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html
- AWS IAM API Reference: SimulateCustomPolicy - https://docs.aws.amazon.com/IAM/latest/APIReference/API_SimulateCustomPolicy.html

## Issues Found
- The MFA helper script exported credentials inside the script process. If executed normally, those environment variables would not persist for later CLI commands. Updated the text to say the script should be sourced, and added `source mfa-login.sh`.
- The time-based MFA example denied only when `aws:MultiFactorAuthAge` was greater than 300. Because that key is not present for long-term access key requests, the example could fail to deny non-MFA long-term credential requests if another policy allowed the action. Added a separate `BoolIfExists` deny for requests without MFA and kept the age-based deny for stale MFA sessions.

## Review Notes
The core `BoolIfExists` deny pattern, STS `GetSessionToken` flow, role trust policy MFA condition, and policy simulator context-entry examples match current AWS documentation. The helper script assumes `jq` is installed and that the MFA device ARN follows the local `$USER` value, which is acceptable for an example but should be adapted in production environments.
