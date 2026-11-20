# Validation Summary: How to Capture Complete SSM Run Command Output When the Console Truncates It

## Status
validated

## Post Type
Technical troubleshooting guide and tutorial.

## Technologies Covered
- AWS Systems Manager (SSM), Run Command, and SSM Agent
- AWS CLI v2
- Amazon S3 and CloudWatch Logs
- AWS IAM, EC2 instance profiles, AWS KMS, and VPC endpoints
- Bash, jq, and Python 3

## Sources Consulted
- [Run Command CloudWatch output configuration, delivery cadence, stream names, and permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)
- [GetCommandInvocation API: limits, step selection, and eventual consistency](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)
- [CommandPlugin API: output limits and destination fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandPlugin.html)
- [AWS CLI list-command-invocations](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html)
- [AWS CLI get-command-invocation](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-command-invocation.html)
- [AWS CLI list-objects-v2](https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html)
- [AWS CLI get-object](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html)
- [AWS CLI describe-log-streams](https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-streams.html)
- [AWS CLI get-log-events](https://docs.aws.amazon.com/cli/latest/reference/logs/get-log-events.html)
- [AWS CLI send-command](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)
- [Systems Manager instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html)
- [Running commands from the console: S3 writer identity](https://docs.aws.amazon.com/systems-manager/latest/userguide/running-commands-console.html)
- [S3 SSE-KMS encryption and permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [AmazonSSMManagedInstanceCore policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html)
- [Systems Manager VPC endpoint dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [SSM Agent logs and local output locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [jq manual: compact output, raw output, exit status, and array iteration](https://jqlang.org/manual/)
- [Python time.time](https://docs.python.org/3/library/time.html#time.time)

## Issues Found
No technical issues found.

## Review Notes
- Verified the documented stdout limit of 24,000 characters, stderr limit of 8,000 characters, and CommandPlugin.Output maximum length of 2,500. Inline fields do not expose pagination for the omitted output.
- Checked command names, flags, response fields, query expressions, JSON parameters, and CloudWatch configuration syntax against the AWS CLI v2 and API references. All six Bash code blocks passed local `bash -n` syntax checks.
- Confirmed that invocation, object, and stream listings support automatic pagination. The CloudWatch export correctly follows forward tokens, continues through empty pages, and uses an exclusive millisecond cutoff.
- Reviewed the export's error handling: a failed AWS request or jq command exits the subshell before the final rename, leaving the partial export. Existing output and partial filenames are checked before retrieval.
- Confirmed S3 object download syntax, node-side delivery permissions, separate reader permissions, KMS requirements, and network dependencies. The core SSM managed policy does not itself grant S3 or CloudWatch Logs delivery permissions.
- Confirmed stream naming, the default log group format, conditional stream creation, delivery cadence, and Linux/Windows local output locations.
- The post correctly identifies `--output-s3-region` as deprecated and ignored; none of the examples uses it.
- The examples require substituting actual account/profile, Region, command, node, step, bucket, key, group, and stream values. The illustrative log group must be replaced with the actual configured or default group, as the surrounding text instructs.
- Documentation and local syntax review only: commands were not executed against a live AWS account. IAM policies, destination connectivity, delayed delivery, and actual output completeness require verification in the reader's environment.
- The post already explains delayed-event limitations, recovery from remaining local files, and why mutating commands should not be replayed merely to recreate logs. README.md was left unchanged.
