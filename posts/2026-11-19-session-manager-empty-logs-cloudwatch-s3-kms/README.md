# Empty Session Manager Logs: CloudWatch, S3, KMS, and SSH Limitations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, CloudWatch, Troubleshooting

Description: Diagnose missing Session Manager transcripts by checking session modes, upload timing, document inputs, destination permissions, encryption, and local recovery evidence.

An empty log group does not establish that nobody ran commands. The session might use an unsupported recording mode, wait until termination to upload, target another destination, or fail during delivery. Start with the session ID, account, Region, and time window before changing preferences.

## Establish which evidence should exist

CloudTrail records Session Manager API activity, including session starts; it is not the shell transcript. Commands typed inside a session do not each become Systems Manager API events. [Session activity auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html)

Run Command stdout/stderr belongs to a separate execution and output configuration. SSM Agent's operational logs describe agent activity and errors; finding those in CloudWatch does not prove terminal recording is enabled. [Run Command output](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html), [agent logs](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

**Session Manager does not record SSH or port-forwarding payloads.** This includes SSH through `AWS-StartSSHSession` and database traffic through forwarding documents. Enabling S3 logging cannot make a tunnel produce a shell transcript. If payload auditing is required, use an approved recorded shell or separately configured OS, database, or application auditing, and restrict alternative session documents. [Recording limitations](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)

Find the actual session document with these workstation commands. Substitute your values; examples use AWS CLI v2 and Bash:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_session='replace-with-session-id'

for ssm_state in Active History; do
  aws --profile "$ssm_profile" --region "$ssm_region" ssm describe-sessions \
    --state "$ssm_state" --filters "key=SessionId,value=$ssm_session" \
    --query 'Sessions[].{Id:SessionId,Document:DocumentName,Status:Status,Start:StartDate,End:EndDate}' \
    --output json
done
```

History covers terminated sessions from the past 30 days. A missing result can mean the wrong account/Region or expired history. The API's `OutputUrl` fields are documented as reserved for future use: do not use an empty field as proof that delivery failed. [DescribeSessions reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-sessions.html)

## Check the document and delivery mode

The default shell uses `SSM-SessionManagerRunShell`. Inspect the document named in the session record; for parameterized documents, also compare the supplied `StartSession` parameters with document defaults. [Default preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html), [session parameters](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)

```bash
ssm_document='SSM-SessionManagerRunShell' # Replace with the observed name.
for ssm_version in '$DEFAULT' '$LATEST'; do
  if ssm_document_json=$(aws --profile "$ssm_profile" --region "$ssm_region" ssm get-document \
    --name "$ssm_document" --document-version "$ssm_version" \
    --document-format JSON --output json); then
    jq -e '{Name,DocumentVersion,DocumentType,Content:(.Content|fromjson)}' \
      <<< "$ssm_document_json" ||
      printf 'Unreadable document content: %s (%s)\n' "$ssm_document" "$ssm_version" >&2
  else
    printf 'Unavailable document: %s (%s)\n' "$ssm_document" "$ssm_version" >&2
  fi
done
```

This requires `ssm:GetDocument` and `jq`. Treat unavailable or unreadable output as missing evidence. Preserve successful output: current default/latest versions may differ, and neither proves which revision a historical session used. Correlate document changes with that session. [GetDocument options](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html)

For `Standard_Stream`, inspect these actual `inputs`:

| Input | Meaning for missing logs |
| --- | --- |
| `s3BucketName`, `s3KeyPrefix` | Destination for upload after the session ends |
| `cloudWatchLogGroupName` | Destination log group |
| `cloudWatchStreamingEnabled: true` | Continual CloudWatch delivery during the session |
| `cloudWatchStreamingEnabled: false` | CloudWatch upload after the session ends |
| `s3EncryptionEnabled`, `cloudWatchEncryptionEnabled` | Requirements on destination encryption |
| `kmsKeyId` | Additional encryption between client and managed node |

These are distinct controls, not interchangeable logging switches. [Session schema](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)

Prepare the existing bucket/log group, then configure Session Manager **Preferences → Edit** for the intended Region. Enable S3 logging and/or CloudWatch logging; choose **Stream session logs** or **Upload session logs** deliberately. Streaming produces JSON-formatted events and does not support `InteractiveCommands` sessions. Windows streaming requires PowerShell 5.1 or later and cannot operate with the PowerShell Transcription policy configured. [Streaming setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cwl-streaming.html), [upload setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html)

Streaming requires SSM Agent 3.0.284.0 or later; check the installed version when an older image lacks this behavior. [Agent prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)

## Separate the three encryption layers

Check the destination settings, using names from the document and skipping disabled destinations:

```bash
ssm_bucket='replace-with-configured-bucket'
ssm_group='/replace/with/configured/group'

aws --profile "$ssm_profile" --region "$ssm_region" s3api get-bucket-encryption \
  --bucket "$ssm_bucket"
aws --profile "$ssm_profile" --region "$ssm_region" logs describe-log-groups \
  --log-group-name-prefix "$ssm_group" \
  --query 'logGroups[].{Name:logGroupName,KMS:kmsKeyId}' --output json
```

Match the exact log-group name because the lookup accepts a prefix. These reads establish configuration under your diagnostic identity, not the node's ability to upload. [Bucket lookup](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-encryption.html), [log-group lookup](https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-groups.html)

- **Session data:** `kmsKeyId` requires `kms:GenerateDataKey` for the session caller and `kms:Decrypt` for the node, with compatible key-policy access. It does not select the S3 or CloudWatch encryption key. [Caller permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html), [node permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- **S3 objects:** the bucket's encryption configuration selects SSE-S3 or SSE-KMS. For SSE-KMS, the uploader needs `kms:GenerateDataKey`; multipart uploads also need `kms:Decrypt`. Readers need `kms:Decrypt` separately. [Session S3 configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-s3.html), [S3 KMS permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- **CloudWatch logs:** default service-side encryption does not replace the KMS association required by Session Manager's encrypted-group option. Inspect the group's `kmsKeyId`. Its key policy must permit `logs.REGION.amazonaws.com`; AWS recommends scoping access to the intended account or log group using the encryption context. AWS separately documents KMS permissions for identities reading/writing through Logs, using `kms:ViaService`. A disabled key can prevent reading existing events. [Session encryption option](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html), [CloudWatch KMS configuration](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)

## Follow the failed delivery operation

The node's credentials need `s3:PutObject` for the configured object prefix and `s3:GetEncryptionConfiguration` for the bucket. For CloudWatch, the node needs `logs:DescribeLogGroups`, `logs:DescribeLogStreams`, `logs:CreateLogStream`, and `logs:PutLogEvents`. Check resource policies and applicable denies alongside IAM allows. Your workstation's read access is separate. [Session logging permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

On a private node, working session channels do not establish access to the configured S3 or CloudWatch destination. Check those dependencies' DNS, HTTPS routes, VPC endpoints, endpoint policies, and security groups. When `kmsKeyId` enables session-data encryption, also check the node's KMS connectivity for its decrypt call. When destination encryption uses KMS, S3 or CloudWatch calls KMS, so that alone does not require a node-to-KMS endpoint. Deleted destinations and encryption mismatches can also prevent session initialization. [Optional endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html), [troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

Correlate the original session ID and timestamps with `/var/log/amazon/ssm/` on Linux or `%PROGRAMDATA%\Amazon\SSM\Logs\` on Windows. An upload denial identifies a different problem from a reader's denied download. [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

## Verify with a harmless transcript

After repairing the identified issue, start a new approved standard shell using the intended caller and document. CLI access requires the Session Manager plugin. [Starting sessions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html) In a Linux shell, type a unique, non-sensitive marker, then end the session:

```bash
printf 'session-log-probe-20261119-001\n'
exit
```

Record its new session ID. Inspect the configured CloudWatch group for the marker and matching session/time, allowing delivery time; after termination, inspect the configured S3 prefix and read the matching object. Verify each enabled destination separately. A marker confirms that test's capture path, not completeness of every historical session.

For an older missing transcript, preserve any surviving `ipcTempFile.log` under `/var/lib/amazon/ssm/TARGET_ID/session/orchestration/SESSION_ID/Standard_Stream/` on Linux. Retention is configurable and cleanup may already have removed it. Enabling logging now cannot recreate unrecorded payloads. [Temporary transcript files](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-disk.html), [retention](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-disk-retention.html)

If transcripts exist but are truncated, AWS also calls out the `screen` utility on Linux/macOS. Check that dependency before treating partial output as complete. Do not replay a production mutation merely to regenerate evidence. [Recording requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
