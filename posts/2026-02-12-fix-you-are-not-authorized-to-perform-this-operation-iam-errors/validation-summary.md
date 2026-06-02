# Validation Summary: How to Fix 'You are not authorized to perform this operation' IAM Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS CLI
- AWS Security Token Service (STS)
- AWS Organizations service control policies (SCPs)
- IAM policy simulator
- IAM permissions boundaries
- AWS CloudTrail

## Sources Consulted
- AWS IAM User Guide: Policy evaluation logic - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
- AWS IAM User Guide: How AWS enforcement code logic evaluates requests - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
- AWS IAM User Guide: Troubleshoot access denied error messages - https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html
- AWS IAM User Guide: Permissions boundaries for IAM entities - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM User Guide: IAM policy testing with the IAM policy simulator - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html
- AWS IAM User Guide: AWS global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CLI Command Reference: sts get-caller-identity - https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI Command Reference: iam simulate-principal-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI Command Reference: cloudtrail lookup-events - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CLI Command Reference: sts decode-authorization-message - https://docs.aws.amazon.com/cli/latest/reference/sts/decode-authorization-message.html
- AWS Organizations User Guide: Service control policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS CloudTrail User Guide: Viewing recent management events with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS CloudTrail User Guide: CloudTrail record contents - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html

## Issues Found
- Several example IAM ARNs used a 9-digit placeholder account ID (`123456789`). AWS account IDs in IAM ARNs are 12 digits, and AWS documentation examples use 12-digit account IDs. Updated those examples to `123456789012`.
- The CloudTrail section said CloudTrail logs every API call with authorization details and includes details about which policy caused the denial. AWS CloudTrail records API activity and denial events can include `errorCode` and `errorMessage`, but detailed policy evaluation is not generally provided by CloudTrail. Updated the wording to point readers to the access denied message, IAM Policy Simulator, or `sts decode-authorization-message` when available.

## Review Notes
The AWS CLI command names and options in the post match current AWS CLI documentation. The IAM explanations for explicit deny precedence, implicit deny behavior, SCPs, permissions boundaries, and `aws:RequestedRegion` are consistent with AWS IAM documentation. The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
