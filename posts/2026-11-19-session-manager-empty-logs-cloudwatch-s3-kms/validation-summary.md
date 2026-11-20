# Validation Summary: Empty Session Manager Logs: CloudWatch, S3, KMS, and SSH Limitations

## Status

validated

## Post Type

Technical troubleshooting guide with AWS CLI and Bash examples.

## Technologies Covered

- AWS Systems Manager Session Manager, session documents, and SSM Agent
- Amazon CloudWatch Logs and Amazon S3
- AWS Key Management Service (KMS) and IAM
- AWS CloudTrail and Systems Manager Run Command
- AWS PrivateLink and VPC endpoints
- AWS CLI v2, Bash, jq, and JMESPath
- SSH, port forwarding, and Windows PowerShell

## Sources Consulted

- [Session activity auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html)
- [Run Command output](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)
- [agent logs](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [Recording limitations](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
- [DescribeSessions reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-sessions.html)
- [Default preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-default-session-document.html)
- [session parameters](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
- [GetDocument options](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html)
- [Session schema](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)
- [Streaming setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cwl-streaming.html)
- [upload setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html)
- [Agent prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- [Bucket lookup](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-encryption.html)
- [log-group lookup](https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-groups.html)
- [Caller permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [node permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [Session S3 configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-s3.html)
- [S3 KMS permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [CloudWatch KMS configuration](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)
- [Optional endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
- [troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)
- [Temporary transcript files](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-disk.html)
- [retention](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-disk-retention.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

- The CloudWatch encryption paragraph described restricting the KMS key policy by the log group's encryption context as mandatory. AWS documents this restriction as a security best practice and also provides an account-scoped example. Changed the sentence to distinguish the required CloudWatch Logs service-principal access from the recommended account or log-group restriction. No commands or other technical content required changes.

## Review Notes

- Confirmed that CloudTrail API events, Run Command output, SSM Agent operational logs, and Session Manager transcripts represent different evidence. SSH and port-forwarding payloads cannot be recorded by Session Manager.
- Verified the AWS CLI command names, flags, filter syntax, response fields, document-version selectors, and JSON output handling against the official CLI references. Session history covers the past 30 days, and the output URL fields remain documented as reserved for future use.
- All four Bash code blocks passed local `bash -n` checks. The jq expression successfully decoded a representative GetDocument response with JSON-encoded Content. Single-quoted version selectors preserve the literal `$DEFAULT` and `$LATEST` values.
- Confirmed the Standard_Stream input names, S3 upload timing, CloudWatch streaming versus end-of-session uploads, and the distinction between session-data encryption and destination encryption.
- Confirmed the documented streaming minimum of SSM Agent 3.0.284.0, PowerShell 5.1 on Windows, the PowerShell Transcription policy restriction, and lack of streaming support for InteractiveCommands.
- Checked the node logging permissions, caller and node session-encryption permissions, S3 SSE-KMS upload/read permissions, and CloudWatch service and caller KMS permissions. Cross-account S3 configurations can require additional bucket/key policies and the documented PutObjectAcl permission; the post's listed actions are not a complete cross-account policy.
- Verified destination networking dependencies, deleted-destination and encryption-mismatch failures, operational log directories, the Linux temporary transcript path, configurable retention, and AWS's screen utility guidance for truncated logs.
- All AWS documentation links in the post resolved to the intended resources. No deprecated command or configuration field was identified.
- Validation used official documentation and local syntax/data-processing checks. No live AWS session, IAM policy deployment, KMS operation, or end-to-end S3/CloudWatch delivery test was performed. The marker procedure remains the operational check for a reader's own environment.
