# Validation Summary: Require TLS, IAM, and a Specific EFS Access Point in a File System Policy

## Status

validated

## Post Type

Technical guide with an IAM resource policy, AWS CLI commands, and Linux mount instructions.

## Technologies Covered

- Amazon Elastic File System (EFS) and EFS access points
- AWS Identity and Access Management (IAM) resource and identity policies
- AWS CLI
- EFS mount helper, NFS, and TLS
- POSIX user/group identities and directory permissions

## Sources Consulted

- [EFS IAM client authorization, actions, and supported condition keys](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS resource-based policy examples](https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html)
- [IAM condition operators and missing-key behavior](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)
- [IAM conditions with multiple context keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-logic-multiple-context-keys-or-values.html)
- [IAM cross-account policy evaluation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html)
- [EFS access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [EFS access-point enforced identities](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [AWS CLI describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)
- [AWS CLI put-file-system-policy](https://docs.aws.amazon.com/cli/latest/reference/efs/put-file-system-policy.html)
- [AWS CLI file-based parameters](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html)
- [Mounting EFS with IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html)
- [Mounting EFS access points](https://docs.aws.amazon.com/efs/latest/ug/mounting-access-points.html)

## Issues Found

- The fresh-client mount example used `/mnt/efs-check` without creating it or stating that it must exist. Added `sudo mkdir -p /mnt/efs-check` before the mount command and clarified that the EFS mount helper must be installed. AWS documents both prerequisites; otherwise the example can fail before testing the policy.

## Review Notes

- Parsed the policy example as JSON and checked all three shell blocks with `bash -n`. The policy fields, action names, resource ARNs, command flags, and mount options agree with AWS documentation. The example IDs are placeholders requiring substitution.
- Confirmed that separate explicit denies enforce TLS and the required access point independently. `StringNotEquals` also matches an absent access-point key; combining the two conditions in one statement would require both to match.
- Confirmed that EFS has no `iam` condition key. The supplied policy leaves anonymous requests without an allow, while authenticated same-account principals can also obtain permissions from applicable identity policies. The post correctly avoids claiming role exclusivity.
- Cross-account access requires an appropriate resource-policy grant as well as identity-side permission. The supplied policy grants only the illustrated same-account role; adapting it for a cross-account role requires changing that principal.
- Confirmed the distinction between client permissions and policy-management API permissions. The example does not grant or globally deny `ClientRootAccess`.
- Confirmed access-point identity replacement, the need for suitable POSIX permissions, and creation settings for a missing access-point root directory. Existing directory permissions are preserved.
- The documentation links resolve to the intended AWS resources. The author link resolves to the named GitHub profile. No deprecated APIs or version-specific incompatibilities were identified.
- Validation was documentation-based and included local syntax checks. No AWS resources were changed and no live NFS mounts were performed. Actual mount tests require reachable mount targets, appropriate credentials available to the helper, matching CLI region configuration, and suitable POSIX permissions. Existing organizational controls or explicit denies can further restrict access.
