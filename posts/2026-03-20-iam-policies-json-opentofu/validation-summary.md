# Validation Summary: How to Create IAM Policies with JSON Documents in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Identity and Access Management (IAM)
- AWS Command Line Interface (AWS CLI)
- Amazon S3
- Amazon EC2

## Sources Consulted
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM policy variables and tags: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM policy evaluation logic for implicit and explicit deny: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_AccessPolicyLanguage_Interplay.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS CLI `get-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/get-policy.html
- AWS CLI `get-policy-version`: https://docs.aws.amazon.com/cli/latest/reference/iam/get-policy-version.html

## Issues Found
- The Step 2 policy mixed an MFA-based explicit deny into a policy that is later attached to an EC2 role. `aws:MultiFactorAuthPresent` is only present for requests made with temporary credentials that support MFA, and `BoolIfExists` with `Deny` would incorrectly deny role-based access. I removed that statement.
- The Step 2 description said the policy allowed S3 access "from within the VPC," but `aws:SourceVpce` restricts requests to a specific VPC endpoint, not to all traffic originating from the VPC. I corrected the description to match the condition key's behavior.
- The Step 3 example referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added the missing data source so the example is internally complete.
- The Step 3 description referred generically to the "current user," but the example relies on `${aws:username}`, which is not present for assumed roles and several non-IAM-user principal types. I clarified that the policy is for an IAM user.
- The Step 5 comment said the AWS CLI command "Validate[d] the policy syntax," but `aws iam get-policy-version` retrieves a managed policy version; it does not perform standalone IAM policy syntax validation. I changed the example to retrieve the current default policy version explicitly by combining `get-policy` and `get-policy-version`.
- The conclusion said to start by "denying everything," which is misleading because IAM already applies implicit deny by default. I corrected the least-privilege guidance to start from the minimum required allows and add explicit denies only when needed.

## Review Notes
- `aws:SourceVpce` works only when the request actually travels through a VPC endpoint. In more advanced service-to-service flows that use forward access sessions, AWS recommends allowing for `aws:ViaAWSService` or `aws:CalledVia` as needed.
- `${aws:username}` is appropriate only when the calling principal type provides that key in the request context. For role-based or federated access patterns, principal tags or other condition keys are often a better fit.
