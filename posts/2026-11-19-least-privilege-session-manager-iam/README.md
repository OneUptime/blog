# Least-Privilege Session Manager IAM by Tags, Documents, and Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, IAM, Security

Description: Build scoped Session Manager permissions for tagged EC2 instances, approved session documents, and caller-owned sessions while closing common authorization bypasses.

A policy allowing `ssm:StartSession` on an instance answers only part of the access question. You also need to control the session document, the session channel, and who can resume or terminate the session. These permissions address different resources.

This example grants a dedicated operator role CLI shell access to development instances in one account and Region. It assumes no other policy grants broader Systems Manager access. It is an identity policy, not an organization-wide access ceiling.

## Separate the caller from the managed node

Attach the operator policy to the identity running the CLI. The EC2 instance's role separately authorizes SSM Agent to report status and create/open messaging channels. Logging needs node-side permissions too. [AWS node-role guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

If preferences enable KMS encryption of session data, add `kms:GenerateDataKey` for the caller on that key and `kms:Decrypt` for the node, with compatible key-policy access. The example assumes that optional session-data encryption is disabled. [Caller KMS requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)

## Scope instances and documents independently

Have an administrator configure `SSM-SessionManagerRunShell` in the target account and Region first. That document stores default shell preferences and is used when the caller omits `--document-name`. [Default session document](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html)

Replace the account, Region, and tag values below. Both tags must match. The document permission has a separate statement so instance tag conditions are not imposed on the document.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StartOnApprovedInstances",
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": "arn:aws:ec2:us-east-1:111122223333:instance/*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/Environment": "development",
          "ssm:resourceTag/Team": "payments"
        },
        "BoolIfExists": {
          "ssm:SessionDocumentAccessCheck": "true"
        }
      }
    },
    {
      "Sid": "UseApprovedShellDocument",
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": "arn:aws:ssm:us-east-1:111122223333:document/SSM-SessionManagerRunShell"
    },
    {
      "Sid": "OperateOwnSessions",
      "Effect": "Allow",
      "Action": [
        "ssmmessages:OpenDataChannel",
        "ssm:ResumeSession",
        "ssm:TerminateSession"
      ],
      "Resource": "arn:aws:ssm:us-east-1:111122223333:session/*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/aws:ssmmessages:session-id": "${aws:userid}"
        }
      }
    }
  ]
}
```

`StartSession` supports `ssm:resourceTag` conditions on EC2 instance resources. The session document needs authorization too. This example covers EC2 instances, not hybrid managed-node or ECS task ARNs. [Systems Manager authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)

`StringEquals` fails when a required tag is absent, and its value comparison is case-sensitive. Changing those conditions to `StringEqualsIfExists` would make a missing tag satisfy the condition. [IAM condition behavior](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)

`ssm:SessionDocumentAccessCheck` checks permission to the default or requested session configuration document; it does not select a document by name. `BoolIfExists` passes when the key is absent. Keep the exact document ARN and test explicit and omitted document names; this condition is not an unconditional deny. [Condition-key definition](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html), [IfExists semantics](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)

## Match each action to its resource

`ResumeSession` and `TerminateSession` authorize against session ARNs, not instance ARNs. Their supported session conditions are AWS's owner and target-ID tags; an instance's `Environment` tag is not a session ownership condition. [Action/resource support](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)

The current [Message Gateway programmatic authorization reference](https://servicereference.us-east-1.amazonaws.com/v1/ssmmessages/ssmmessages.json) lists the session resource and these system-tag conditions for `OpenDataChannel`. That is why the caller's channel permission is scoped to owned sessions.

The instance tag checks apply to session starts. Changing or removing those tags does not revoke the permissions in `OperateOwnSessions`, which checks only session ownership. When revoking access, also terminate existing sessions: `TerminateSession` closes the data connection and prevents resumption. [Session termination behavior](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_TerminateSession.html)

AWS recommends matching the system owner tag to `${aws:userid}`. For an IAM user this is a unique user ID; for an assumed role it is `role-id:role-session-name`. This works with IAM Identity Center roles without relying on `${aws:username}`, which is unavailable for role sessions. Session ARN prefixes follow different naming rules, so `session/${aws:userid}-*` is not a portable substitute. [Ownership and session-ID rules](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html)

Control role session names through the identity provider or trust policy. Because `aws:userid` includes the session name, two callers assuming the same role with the same name have the same ownership identity. A changed name also changes the ownership comparison. [Role session naming controls](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html#ck_rolesessionname)

Console discovery is separate. `ssm:DescribeSessions`, `ssm:DescribeInstanceInformation`, and `ssm:ListDocuments` require `Resource: "*"`; an instance ARN does not filter their results. Add discovery permissions only for the interface you support. [Systems Manager action table](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)

## Close the other paths to access

Identity-policy allows accumulate. Attaching this policy alongside `ssm:*` does not narrow that grant. For a mandatory ceiling, use a reviewed permissions boundary or applicable SCP, with explicit denies where needed. Boundaries limit identity-policy permissions; they do not grant access. Protect these controls from operator modification. [IAM evaluation rules](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

Protect `Environment` and `Team` from unauthorized `ec2:CreateTags` and `ec2:DeleteTags` calls, including provisioning paths. Otherwise, changing production instance tags can make it eligible. Restrict permitted keys and values using supported tagging conditions. [EC2 tagging authorization](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html)

The approved document gives a shell; IAM does not authorize each command typed inside it. By default, that shell uses `ssm-user`, which SSM Agent grants sudo access on Linux/macOS or Administrators membership on Windows. Restricting the IAM target and document therefore does not create a low-privilege OS account. Remove unnecessary local administrative permissions, or configure Run As on Linux/macOS with an appropriately restricted existing OS account. Run As fails if the selected account is unavailable and does not fall back to `ssm-user`; AWS also cautions that OS and directory policies such as login restrictions might not apply to these sessions. [Default OS privileges](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-ssm-user-permissions.html), [Run As behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html)

For limited operations, use a constrained custom `InteractiveCommands` Session document and appropriate OS permissions. Remove default-shell access when adopting that model, and restrict document creation, updates, and default-version changes. [Restricted-command documents](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-restrict-command-access.html)

Review `ssm:SendCommand` separately: access to `AWS-RunShellScript` or `AWS-RunPowerShellScript` can provide another execution path. Ordinary CLI shell access does not require broad Run Command permission; AWS identifies agent updates from the EC2 console as one reason its examples include `SendCommand`. [Quickstart policy notes](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)

Also review `AWS-StartSSHSession`, `AWS-StartPortForwardingSession`, and `AWS-StartPortForwardingSessionToRemoteHost`, plus custom equivalents. They enable alternative connection modes, and Session Manager does not record SSH or port-forwarding payloads as shell transcripts. [Session modes](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)

## Test the denied cases too

With a configured CLI and Session Manager plugin, test the intended role:

```bash
aws --profile payments-dev sts get-caller-identity

aws --profile payments-dev --region us-east-1 ssm start-session \
  --target i-0123456789abcdef0 \
  --document-name SSM-SessionManagerRunShell
```

Replace the example instance ID. The plugin is required for this interactive command. [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)

In a controlled test account, verify an allowed instance, a wrong tag, a missing tag, an unapproved document, and an omitted document name. Test resuming/terminating your own session and another caller's session, then repeat with the actual SSO or assumed-role identity. Retain the caller ID, request, and observed result.

A simulator checks policy logic, but supplied condition values do not prove what Session Manager puts into a live request. AWS recommends live verification after simulation. JSON parsing and policy validation alone do not establish that authorization boundaries work in your account. [Simulator limitations](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html)
