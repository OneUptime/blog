# How to Capture Complete SSM Run Command Output When the Console Truncates It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Run Command, CloudWatch, S3

Description: Capture and retrieve SSM Run Command output from S3 and CloudWatch Logs, with correct limits, permissions, stream selection, and pagination.

Run Command's inline output is a preview. AWS documents a default limit of 24,000 characters; configure S3 or CloudWatch Logs when sending the command to retain longer output. [Output destinations](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)

Switching to the CLI does not remove the limits:

| Response field | Maximum returned content |
| --- | --- |
| `GetCommandInvocation.StandardOutputContent` | First 24,000 characters of stdout |
| `GetCommandInvocation.StandardErrorContent` | First 8,000 characters of stderr |
| `CommandPlugin.Output` in invocation listings | Maximum length 2,500 |

AWS specifies characters/string lengths here, not an equivalent byte allowance. These fields have no continuation token for the remaining text. [Invocation fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html), [plugin fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandPlugin.html)

## Identify the command, node, and step

Run these Bash examples from your workstation with AWS CLI v2. Substitute the original command's account/profile, Region, and UUID:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_command='00000000-0000-0000-0000-000000000000'

aws --profile "$ssm_profile" --region "$ssm_region" ssm list-command-invocations \
  --command-id "$ssm_command" --details --output json \
  --query 'CommandInvocations[].{Node:InstanceId,Logging:CloudWatchOutputConfig,Plugins:CommandPlugins[].{Name:Name,Status:StatusDetails,Code:ResponseCode,Bucket:OutputS3BucketName,Prefix:OutputS3KeyPrefix,StdoutURL:StandardOutputUrl,StderrURL:StandardErrorUrl}}'
```

Keep automatic pagination enabled: do not add `--no-paginate` or an unhandled `--max-items` limit. Inspect every intended node and plugin, not only `CommandPlugins[0]`. Repeat retrieval for each node/step pair in a separate local directory to prevent overwrites. [Invocation listing](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html)

For an individual step, copy its returned `Name` into `--plugin-name`:

```bash
ssm_node='i-0123456789abcdef0'
ssm_step='replace-with-returned-Name'

aws --profile "$ssm_profile" --region "$ssm_region" ssm get-command-invocation \
  --command-id "$ssm_command" --instance-id "$ssm_node" \
  --plugin-name "$ssm_step" --output json
```

For multistep documents, use the step name rather than guessing the action name. Run Command is eventually consistent: retry a newly missing invocation after a short delay. An empty inline field while execution is unfinished does not establish that the script emitted nothing. [GetCommandInvocation semantics](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)

## Download the actual S3 objects

When S3 logging was configured, inspect the selected plugin's stdout/stderr URLs and bucket/prefix fields. Discover object keys rather than constructing a path from the document name. Match the command, node, and step before downloading. [Plugin output locations](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandPlugin.html)

```bash
ssm_bucket='replace-with-returned-bucket'
ssm_prefix='replace-with-returned-prefix'

aws --profile "$ssm_profile" --region "$ssm_region" s3api list-objects-v2 \
  --bucket "$ssm_bucket" --prefix "$ssm_prefix" --output json \
  --query 'Contents[].{Key:Key,Bytes:Size}'

ssm_stdout_key='copy-exact-stdout-key-from-listing'
ssm_stderr_key='copy-exact-stderr-key-from-listing'
aws --profile "$ssm_profile" --region "$ssm_region" s3api get-object \
  --bucket "$ssm_bucket" --key "$ssm_stdout_key" ./stdout.txt
aws --profile "$ssm_profile" --region "$ssm_region" s3api get-object \
  --bucket "$ssm_bucket" --key "$ssm_stderr_key" ./stderr.txt
```

Run each download only for an object that exists. Confirm the selected step has finished and check for upload errors before treating its files as complete. Listing is automatically paginated; `get-object` writes the object's content to the positional filename and prints response metadata separately. This avoids copying truncated inline text or formatting output through `--output text`. [List objects](https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html), [download objects](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html)

## Read CloudWatch streams through the final page

CloudWatch streams follow `CommandID/InstanceID/PluginID/stdout` and `/stderr`. Set `ssm_group` from the returned configuration; without an explicit group, the default is `/aws/ssm/DOCUMENT_NAME`. Discover the exact streams:

```bash
ssm_group='/aws/ssm/run-command'
aws --profile "$ssm_profile" --region "$ssm_region" logs describe-log-streams \
  --log-group-name "$ssm_group" \
  --log-stream-name-prefix "$ssm_command/$ssm_node/" \
  --query 'logStreams[].logStreamName' --output json
```

Keep this listing paginated too. [Stream discovery](https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-streams.html)

SSM uploads every 30 seconds or when its buffer exceeds 200 KB, whichever occurs first. Streams appear only when data exists; absent stderr can be normal. Allow delivery time after execution and investigate upload failures before declaring a missing stream empty. [Delivery behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)

`get-log-events` requires explicit token handling. The following Bash example needs `jq` and Python 3. Select one discovered stream and choose a fresh output filename for every export, including retries and the other stream:

```bash
ssm_stream='copy-exact-stream-name'
ssm_file='stdout-events.jsonl'
ssm_end_ms=$(python3 -c 'import time; print(int(time.time()*1000))')

(
  set -e
  if [[ -e "$ssm_file" || -L "$ssm_file" || -e "$ssm_file.partial" || -L "$ssm_file.partial" ]]; then
    printf 'Choose a fresh output filename for each export.\n' >&2
    exit 1
  fi
  ssm_token=''
  ssm_token_arg=()
  : > "$ssm_file.partial"
  while :; do
    ssm_page=$(aws --profile "$ssm_profile" --region "$ssm_region" \
      logs get-log-events --log-group-name "$ssm_group" \
      --log-stream-name "$ssm_stream" --start-from-head \
      --end-time "$ssm_end_ms" "${ssm_token_arg[@]}" --output json)
    jq -c '.events[]' <<< "$ssm_page" >> "$ssm_file.partial"
    ssm_next=$(jq -er '.nextForwardToken' <<< "$ssm_page")
    [[ "$ssm_next" == "$ssm_token" ]] && break
    ssm_token="$ssm_next"
    ssm_token_arg=(--next-token "$ssm_token")
  done
  mv "$ssm_file.partial" "$ssm_file"
)
```

An empty page is not the stopping condition: stop when the returned forward token equals the supplied token. The fixed, exclusive end time is in milliseconds since the Unix epoch and bounds active streams. This exports available events before that cutoff, including their timestamps; it does not guarantee that delayed events have arrived. After delivery settles, repeat the export with a later cutoff and a fresh filename. Once retrieval starts, a failed request leaves a `.partial` file and no completed file for that export. Use S3 when you need the captured output file. [GetLogEvents pagination](https://docs.aws.amazon.com/cli/latest/reference/logs/get-log-events.html)

## Configure capture before the next execution

Prepare an existing bucket and log group. Delivery permissions belong to the credentials SSM Agent uses on the node. For EC2 configured with an instance profile, S3 writes use that profile, not the sender's permissions. Grant `s3:PutObject` for the output prefix and applicable bucket/encryption permissions using AWS's [instance-permission guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html). SSE-KMS also requires key permissions for upload and download. [Writer identity](https://docs.aws.amazon.com/systems-manager/latest/userguide/running-commands-console.html), [SSE-KMS permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)

`AmazonSSMManagedInstanceCore` alone grants neither S3 nor CloudWatch Logs delivery access. The node's Logs policy needs `logs:DescribeLogGroups` with `Resource: "*"`; scope `logs:CreateLogStream`, `logs:DescribeLogStreams`, and `logs:PutLogEvents` to the destination. Include `logs:CreateLogGroup` if creating groups. The caller separately needs command/read permissions and destination read access. [Core policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html), [Logs policy example](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)

Working SSM connectivity does not prove upload connectivity. Nodes without internet egress need reachable S3 and `logs` endpoints, functioning DNS, HTTPS egress, and endpoint/resource policies permitting the destination operations. [Endpoint dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

This harmless Linux probe tests both channels:

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ssm send-command \
  --instance-ids "$ssm_node" --document-name 'AWS-RunShellScript' \
  --parameters '{"commands":["echo capture-stdout; echo capture-stderr >&2"]}' \
  --output-s3-bucket-name "$ssm_bucket" \
  --output-s3-key-prefix 'run-command' \
  --cloud-watch-output-config "CloudWatchOutputEnabled=true,CloudWatchLogGroupName=$ssm_group" \
  --query 'Command.CommandId' --output text
```

Use its new command ID to verify both markers. Both destinations can be enabled together. `--output-s3-region` is deprecated and ignored; SSM discovers the bucket Region. [SendCommand options](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)

## Interpret missing output carefully

A successful quiet step can have empty stdout and stderr. Check step status, return code, both channels, and delivery errors before concluding that nothing was printed:

| Evidence | Next check |
| --- | --- |
| Upload denied in agent logs | Node credentials, bucket/log-group policy, and encryption permissions |
| Download denied at the workstation | Reader permissions; S3 listing needs `s3:ListBucket`, downloading needs `s3:GetObject` |
| Running step or recently missing stream | Original invocation and delivery progress; output can still arrive |
| Successful quiet step with no delivery errors | Confirm the script was expected to produce no output |

The S3 read permissions apply independently of the writer. [Listing permissions](https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html), [download permissions](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html)

If destinations were absent, enabling them now cannot reconstruct the old remote output. Remaining local files may help: Linux output is under `/var/lib/amazon/ssm/`, with agent logs under `/var/log/amazon/ssm/`; Windows uses `%PROGRAMDATA%\Amazon\SSM\InstanceData\` and `Logs\`. Match the original command ID and preserve files before cleanup. Recovery depends on what remains. [Local output locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

Do not replay a deployment, migration, or other mutating command solely to regenerate logs. Reconcile its actual effects first, then configure capture for a separately justified execution.
