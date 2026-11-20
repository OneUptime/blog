# Validation Summary: Fleet Manager Online but Session Manager Fails: `ssmmessages` Checks

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI and Linux shell commands.

## Technologies Covered
- AWS Systems Manager, Fleet Manager, Session Manager, and SSM Agent
- Amazon EC2 and Linux user accounts
- AWS IAM policies, role tags, and session tags
- AWS PrivateLink, VPC endpoints, DNS, and HTTPS/WebSocket connectivity
- Amazon S3, Amazon CloudWatch Logs, and AWS KMS
- AWS CLI, Bash, jq, and JSON session documents

## Sources Consulted
- [Message API reference](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [Managed-node lookup](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html)
- [connection status](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-connection-status.html)
- [node policy](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [caller policy examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [Endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [Regional preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/preference-setting-permissions.html)
- [default document](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html)
- [custom preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-preferences-cli.html)
- [StartSession request](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html)
- [preference update example](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-configure-preferences-cli.html)
- [GetDocument options](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html)
- [session schema](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)
- [CloudWatch logging](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html)
- [key policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)
- [Optional endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
- [blank-screen troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)
- [Run As behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html)
- [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [Starting sessions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
- [jq manual](https://jqlang.org/manual/)
- [Linux getent manual](https://man7.org/linux/man-pages/man1/getent.1.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed the entire post against the linked AWS CLI, API, and service documentation. README.md was left unchanged.
- Confirmed that heartbeat reporting and Session Manager channel readiness are separate checks. The diagnostic commands use supported flags, filter keys, and response fields; neither proves that a shell and all configured dependencies will initialize successfully.
- Verified node channel permissions separately from caller permissions, HTTPS connectivity, endpoint security groups and policies, and optional S3, Logs, and KMS connectivity.
- Confirmed the version-specific routing claim: SSM Agent 3.3.40.0 and later prefers ssmmessages when available; ec2messages is supported only in Regions launched before 2024.
- Verified regional preferences, custom document selection, Session document type, Standard_Stream, and the supported GetDocument version selectors. StartSession has no separate document-version request parameter. Current document versions do not establish the configuration used for an earlier failure.
- Confirmed the distinction between session-data KMS encryption and destination encryption, node logging permissions, caller GenerateDataKey access, node Decrypt access, and key-policy requirements.
- Verified Run As tag precedence and account-existence requirements, the absence of fallback after Run As failure, and shellProfile.linux semantics.
- Confirmed agent log locations, the documented worker timeout/resource symptom, CLI plugin requirements, and S3 versus CloudWatch log-delivery timing.
- All four Bash code blocks passed bash -n. The exact jq expression successfully decoded a representative GetDocument Content string and retained the metadata. No live AWS API calls, session establishment, IAM evaluation, or log-delivery tests were performed; those require a configured account and target node.
- AWS documentation links resolved to the relevant resources. The related OneUptime article exists locally at posts/2026-11-19-aws-ssm-targetnotconnected-layered-troubleshooting/README.md, but its public URL was inaccessible through the browser tool; live publication remains unverified. The author-profile URL is structurally plausible and is not a technical source.
- GNU Coreutils web pages could not be retrieved during review. The id, ls, and tail invocations use standard Linux command syntax; getent usage was additionally checked against the Linux manual.
