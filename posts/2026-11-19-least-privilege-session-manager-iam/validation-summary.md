# Validation Summary: Least-Privilege Session Manager IAM by Tags, Documents, and Actions

## Status
validated

## Post Type
Technical guide with an IAM identity-policy example and AWS CLI commands.

## Technologies Covered
- AWS Systems Manager Session Manager and SSM Agent
- AWS Identity and Access Management (IAM), permissions boundaries, and AWS Organizations SCPs
- Amazon EC2 resource tags and instance profiles
- AWS IAM Identity Center and AWS STS assumed-role identities
- AWS Key Management Service (KMS)
- AWS CLI and the Session Manager plugin
- SSM Messages data channels, SSH, and port forwarding
- Linux/macOS and Windows operating-system permissions

## Sources Consulted
- [AWS node-role guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [Caller KMS requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [Default session document](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html)
- [Systems Manager authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)
- [IAM condition behavior](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)
- [Message Gateway programmatic authorization reference](https://servicereference.us-east-1.amazonaws.com/v1/ssmmessages/ssmmessages.json)
- [Session termination behavior](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_TerminateSession.html)
- [Ownership and session-ID rules](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html)
- [Role session naming controls](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html#ck_rolesessionname)
- [IAM evaluation rules](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [EC2 tagging authorization](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html)
- [Default OS privileges](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-ssm-user-permissions.html)
- [Run As behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html)
- [Restricted-command documents](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-restrict-command-access.html)
- [Session modes](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
- [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [Simulator limitations](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html)
- [AWS CLI get-caller-identity reference](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [SSH connections through Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. The post contains substantive implementation guidance and qualifies for technical validation. README.md was left unchanged.
- Parsed the complete IAM JSON example successfully and checked the Bash command block with `bash -n`. Compared the actions, resource ARN formats, condition keys, and CLI options with official AWS references. These checks validate syntax and documented behavior; they do not establish live authorization results.
- Confirmed that `StartSession` supports EC2 instance resources and resource-tag conditions. Both required tag comparisons must succeed, and the separate document statement avoids applying instance-tag requirements to the document. The exact account-owned `SSM-SessionManagerRunShell` document ARN matches the configured-default-document model described by AWS.
- Confirmed the documented purpose of `ssm:SessionDocumentAccessCheck` and the missing-key behavior of `BoolIfExists`. The post correctly avoids treating this Allow condition as an explicit deny and calls for testing both explicit and omitted document names.
- Confirmed session ARN authorization for `ResumeSession` and `TerminateSession`. AWS's recommended ownership example uses `ssm:resourceTag/aws:ssmmessages:session-id` with `${aws:userid}` for IAM users and roles, including Identity Center roles. The role ID and role-session-name composition supports the post's warning about shared role session names and its distinction from session ARN prefixes.
- Retrieved the SSM Messages programmatic authorization JSON directly over HTTPS. It lists the session resource for `OpenDataChannel` and both AWS-supplied session condition keys on that resource. This independently supports grouping the channel and lifecycle actions in the ownership statement.
- Confirmed that the three listed discovery actions have no resource-level authorization support, so their permissions require `Resource: "*"`. Confirmed that terminating a session closes the data connection and prevents resumption; changing instance tags does not change the example's separate session-ownership permissions.
- Confirmed the separation between caller and node permissions, caller `kms:GenerateDataKey` versus node `kms:Decrypt`, node-side logging permissions, additive identity-policy allows, and the limiting role of permissions boundaries and applicable SCPs. The example explicitly assumes optional KMS session-data encryption is disabled.
- Confirmed the need to protect EC2 tagging operations, including tagging during provisioning. Verified default `ssm-user` administrative privileges, Linux/macOS Run As behavior without fallback, and AWS's caveat about operating-system and directory restrictions.
- Confirmed the `InteractiveCommands` session type, the separate execution path offered by Run Command, and the quickstart explanation for agent-update `SendCommand` permissions. Verified the SSH and both port-forwarding document names and the absence of Session Manager payload logging for those connection modes.
- Verified `sts get-caller-identity`, `ssm start-session`, `--profile`, `--region`, `--target`, and `--document-name` against AWS CLI documentation. The interactive session command requires the Session Manager plugin, a configured profile, an eligible managed node, and the configured document, as the post explains.
- All URLs in the post returned HTTP 200, including the author link; the AWS documentation and programmatic reference point to the relevant subjects. The post does not pin software versions, and no deprecated API or CLI option was identified.
- No AWS policies were deployed, sessions started, or live allow/deny tests performed. No IAM simulator or Access Analyzer validation was run. Account-specific behavior, effective permissions, node connectivity, document preferences, and actual SSO identities still require the controlled live verification described in the post. AWS explicitly cautions that simulator results can differ from the live environment.
