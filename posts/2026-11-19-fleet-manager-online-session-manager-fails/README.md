# Node Appears in Fleet Manager but Session Manager Fails: Check `ssmmessages`, Session Preferences, and Agent Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, EC2, Troubleshooting

Description: Diagnose Session Manager failures on an online managed node by checking messaging channels, the selected session document, logging, KMS, Run As, and agent evidence.

A node in Fleet Manager is registered with Systems Manager. Even a recent `Online` heartbeat does not prove that an interactive session can open its channels, initialize logging, and start a shell. AWS documents heartbeat reporting through `UpdateInstanceInformation` separately from the `ssmmessages` operations used for session channels. [Message API reference](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

This guide focuses on standard shell sessions to Linux EC2 instances that already report online. For missing nodes or stale heartbeats, start with the [layered TargetNotConnected investigation](https://oneuptime.com/blog/post/2026-11-19-aws-ssm-targetnotconnected-layered-troubleshooting/view).

## Compare heartbeat and session readiness

On your workstation, use the same account, Region, and target as Fleet Manager. Replace these example values:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_target='i-0123456789abcdef0'

aws --profile "$ssm_profile" --region "$ssm_region" ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$ssm_target" \
  --query 'InstanceInformationList[].{Ping:PingStatus,LastPing:LastPingDateTime,Agent:AgentVersion}'

aws --profile "$ssm_profile" --region "$ssm_region" ssm get-connection-status \
  --target "$ssm_target"
```

The first command reports agent status and heartbeat time; the second checks Session Manager connection readiness. Neither executes the shell or validates every preference dependency. An authorization error from either diagnostic command concerns your caller's permissions, so do not interpret it as an offline agent. [Managed-node lookup](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html), [connection status](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-connection-status.html)

Record the failed attempt's time, exact error, caller role, and session ID if one was returned. This makes the next log inspection useful.

## Check both sides of the session channel

The node needs `ssmmessages:CreateControlChannel`, `CreateDataChannel`, `OpenControlChannel`, and `OpenDataChannel`. Your caller separately needs `ssm:StartSession` for the target and applicable session document, plus the session-channel permissions appropriate to its access method. Fleet visibility does not imply these permissions. Compare the effective node role and caller role with AWS's [node policy](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html) and [caller policy examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html).

For a standard commercial Region, check the agent's path to `ssmmessages.REGION.amazonaws.com` over outbound HTTPS. With PrivateLink, check private DNS, the endpoint policy, and the endpoint security group's inbound TCP 443 rule. A successful unsigned HTTPS probe establishes transport progress, not an authorized WebSocket session. [Endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

Run Command working is useful evidence, but its success does not exercise all session dependencies. In older Regions, agent message delivery can also use `ec2messages`; agent 3.3.40.0 and later prefers `ssmmessages` when available. [Message routing behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

## Read the document used by the failing session

Account preferences are stored in an SSM document per Region. For the default shell, look for `SSM-SessionManagerRunShell`, which AWS creates when you configure Session Manager or save preferences. A custom document selected in the console or passed through `--document-name` supplies its own preferences. Inspect the selected document in the target account and Region. [Regional preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/preference-setting-permissions.html), [default document](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html), [custom preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-preferences-cli.html)

The diagnostic identity needs `ssm:GetDocument`; a denied read does not establish a bad document. If the default preferences document is missing, check whether preferences were ever saved and whether the failing request explicitly named it. The read failure alone does not establish the session failure's cause. This workstation example retrieves both current version selectors and uses `jq` to decode the JSON string returned in `Content`:

```bash
ssm_document='SSM-SessionManagerRunShell'

for ssm_version in '$DEFAULT' '$LATEST'; do
  aws --profile "$ssm_profile" --region "$ssm_region" ssm get-document \
    --name "$ssm_document" --document-version "$ssm_version" \
    --document-format JSON --output json > "session-document-${ssm_version}.json" &&
  jq '{Name,DocumentType,DocumentVersion,Content:(.Content|fromjson)}' \
    "session-document-${ssm_version}.json"
done
```

Preserve both returned version numbers and contents; `$DEFAULT` and `$LATEST` can differ after an update. These are current documents, not proof of the revision used by a historical failure. `StartSession` has no separate document-version parameter, so correlate configuration changes with the attempt and agent evidence rather than assuming a retrieved revision was used. [StartSession request](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html), [preference update example](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-configure-preferences-cli.html). The document type must be `Session`; ordinary shell preferences use `sessionType: Standard_Stream`. A `Command` document such as `AWS-RunShellScript` cannot be used with `StartSession`. [GetDocument options](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html), [session schema](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)

## Follow the dependencies enabled in its inputs

Read the actual values, including any supplied runtime parameters:

| Preference | Dependency to investigate |
| --- | --- |
| `s3BucketName` | Existing bucket, node access to S3, and permissions to write the configured prefix |
| `cloudWatchLogGroupName` | Existing log group, node access to CloudWatch Logs, and stream/write permissions |
| `s3EncryptionEnabled` / `cloudWatchEncryptionEnabled` | Destination encryption satisfies the enabled requirement |
| `kmsKeyId` | Session-data key access for both caller and node |
| `runAsEnabled` | An effective OS username that exists on the target |

These fields have different jobs: `kmsKeyId` encrypts data between the client and node; the S3 and CloudWatch flags require encrypted log destinations. They do not configure those destinations for you. For CloudWatch encryption, inspect the KMS key associated with the log group separately from `kmsKeyId`. [CloudWatch logging](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html), [preference definitions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)

For logging, inspect the **node's** permissions. AWS's example includes `s3:PutObject`, `s3:GetEncryptionConfiguration`, and CloudWatch Logs describe, stream creation, and event-writing actions. A successful bucket or log-group lookup from your administrator workstation does not establish node access. [Logging permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

For session-data KMS encryption, the caller needs `kms:GenerateDataKey` and the node needs `kms:Decrypt` on the selected key. Check the key policy, IAM policies, and any applicable KMS grants; an IAM allow alone has no effect unless the key policy enables it. Encryption on an S3 bucket or CloudWatch log group involves its own destination configuration and key permissions. [Caller KMS permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html), [node KMS permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html), [key policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)

A private node also needs a route to each enabled dependency: S3, CloudWatch Logs, and KMS as applicable. Where there is no public egress, inspect the corresponding VPC endpoints. AWS specifically identifies unreachable logging destinations, deleted destinations, and encryption mismatches as possible causes of a blank session. [Optional endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html), [blank-screen troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

## Resolve the effective Run As user

With Run As enabled, inspect `SSMSessionRunAs` session tags first, then the IAM role/user tag, before assuming `runAsDefaultUser` applies. For an assumed role, a session tag takes precedence over the role tag. The selected tag overrides the configured default OS account. Verify that account on the node through an existing recovery connection or a working Run Command path:

```bash
getent passwd application-operator
id application-operator
```

Replace the name with the effective user. Session Manager does not create that account or fall back to `ssm-user` when Run As fails. Also review `shellProfile.linux` for startup commands that could hang or exit the shell. [Run As behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html), [shell profile configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)

## Correlate the failure with agent logs

On the affected Linux node, inspect the failure window:

```bash
sudo ls -lt /var/log/amazon/ssm/
sudo tail -n 200 /var/log/amazon/ssm/amazon-ssm-agent.log
```

Read the session worker logs when present, matching timestamps and the session ID. Channel authorization failures point toward the node role or endpoint policy; DNS, TLS, or connection errors point toward transport. Use logging or KMS error details to identify the failing service and action before changing permissions. A worker timeout accompanied by `too many open files` warrants host resource investigation. [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html), [worker troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

After repairing the identified dependency, repeat the original session with the same caller and document. CLI sessions require the local Session Manager plugin. Verify a usable shell, the intended OS user, and configured log delivery; S3 output arrives after the session ends, while CloudWatch delivery depends on the streaming preference. [Starting sessions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html), [logging behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)
