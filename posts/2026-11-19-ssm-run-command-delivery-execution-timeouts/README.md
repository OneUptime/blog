# SSM `DeliveryTimedOut` vs. `ExecutionTimedOut`: Which Clock Expired?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Run Command, Troubleshooting

Description: Diagnose SSM Run Command timeouts using request and document limits, expiry timestamps, plugin evidence, concurrency, and error thresholds.

A Run Command result of `TimedOut` does not identify the expired clock. Inspect `StatusDetails`: `Delivery Timed Out` and `Execution Timed Out` have different meanings and different effects on the fleet's error threshold. The compact names in this article's title are also used in AWS documentation. [Invocation status fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandInvocation.html)

There is a crucial qualification: AWS relies on the agent's terminal document response to establish delivery. A missing response can produce a delivery timeout even when work started. Treat the status as evidence about the control path, not proof that a deployment or migration made no changes. [Timeout reporting](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

## Read the command, node, and step separately

Run these Bash examples from an authorized workstation. Replace the profile, Region, command UUID, and target with the failed request's values:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_command='00000000-0000-0000-0000-000000000000'
ssm_target='i-0123456789abcdef0'

aws --profile "$ssm_profile" --region "$ssm_region" ssm list-commands \
  --command-id "$ssm_command" --output json \
  --query 'Commands[0].{Status:Status,Detail:StatusDetails,Requested:RequestedDateTime,Expires:ExpiresAfter,Timeout:TimeoutSeconds,Document:DocumentName,Version:DocumentVersion,Parameters:Parameters,Concurrency:MaxConcurrency,MaxErrors:MaxErrors,Targets:TargetCount,Completed:CompletedCount,Errors:ErrorCount,DeliveryTimeouts:DeliveryTimedOutCount}'

aws --profile "$ssm_profile" --region "$ssm_region" ssm list-command-invocations \
  --command-id "$ssm_command" --details --output json \
  --query 'CommandInvocations[].{Node:InstanceId,Status:Status,Detail:StatusDetails,Plugins:CommandPlugins[].{Name:Name,Status:Status,Detail:StatusDetails,Code:ResponseCode}}'
```

The first query shows the parent request; the second inventories each node and its plugins. Keep pagination enabled to inspect the whole fleet. `CompletedCount` counts terminal outcomes, including failures; it is not a success counter. `ErrorCount` includes failed executions and execution timeouts, while delivery timeouts have their own counter. [List commands](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-commands.html), [list invocations](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html), [command counters](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_Command.html)

Copy the affected plugin's actual `Name` into the next command:

```bash
ssm_step='replace-with-CommandPlugins-Name'

aws --profile "$ssm_profile" --region "$ssm_region" ssm get-command-invocation \
  --command-id "$ssm_command" --instance-id "$ssm_target" \
  --plugin-name "$ssm_step" --output json \
  --query '{Status:Status,Detail:StatusDetails,Code:ResponseCode,Started:ExecutionStartDateTime,Ended:ExecutionEndDateTime,Elapsed:ExecutionElapsedTime,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'
```

`get-command-invocation` reports a plugin's execution. For multiple steps, supply the step name, not an action such as `aws:runShellScript`. A `ResponseCode` of `-1` means execution has not started or the node did not receive the command; it does not identify the underlying fault. Empty output alone is inconclusive, especially before completion. Run Command is eventually consistent, so retry an early missing result with a short delay before concluding that the invocation is absent. [GetCommandInvocation semantics](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)

## Identify the two configured limits

| Setting | Where it belongs | Purpose |
| --- | --- | --- |
| `TimeoutSeconds` / `--timeout-seconds` | `SendCommand` request | Governs whether a command that has not started may still run; contributes to overall expiry |
| `executionTimeout` | A document parameter, when defined | Supplies that document's execution allowance |
| `timeoutSeconds` | An `aws:runShellScript` step's inputs | Limits the script's execution; commonly references `{{ executionTimeout }}` |
| `--cli-read-timeout` | Local AWS CLI option | Limits socket reads by the CLI; does not extend remote script execution |

The request field and document input differ in both location and capitalization. `executionTimeout` is not a universal top-level `send-command` flag. Inspect your document rather than assuming every document exposes it. [SendCommand fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_SendCommand.html), [shell plugin inputs](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html#aws-runShellScript), [CLI timeout options](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)

Use the recorded document name and a numeric version known to have run in the failed command. If `DocumentVersion` is empty, `$DEFAULT`, or `$LATEST`, first recover the incident-time version or saved document content from your execution records. Those selectors can resolve differently after document updates, so fetching today's default or latest content does not establish the old timeout settings. [Versioned document updates](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html), [command response examples](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-commands.html)

```bash
ssm_document='replace-with-recorded-document-name'
ssm_version='replace-with-incident-time-numeric-version'

aws --profile "$ssm_profile" --region "$ssm_region" ssm get-document \
  --name "$ssm_document" --document-version "$ssm_version" \
  --document-format JSON --query Content --output text
```

Read parameter defaults alongside the submitted `Parameters`, then inspect each step's inputs. For schema 2.2 shell steps, look under `mainSteps[].inputs.timeoutSeconds`; older schema 1.2 documents use `runtimeConfig`. A custom document can hard-code the value or expose a differently named parameter. [Get document](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html), [document schemas and inputs](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html#aws-runShellScript)

## Reconstruct the timeout timeline

AWS documents total timeout as the request timeout plus the document execution timeout. Its `AWS-RunShellScript` example uses 600 + 3600 = 4200 seconds. This is not permission for the script itself to run for 4200 seconds. Document type and version affect processing, so avoid inventing a universal formula for arbitrary multistep documents. [Timeout calculation](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

Use the returned `ExpiresAfter` for the actual command. AWS states that expiry transitions remaining `Pending`, `Delayed`, and `InProgress` invocations to delivery timeout. [ExpiresAfter](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_Command.html)

For an illustrative single shell step configured with request timeout 120 seconds and execution timeout 300 seconds, suppose the recorded request is at 10:00:00 and expiry is 10:07:00:

| Evidence | Interpretation |
| --- | --- |
| Step starts at 10:00:20; agent reports execution timeout around 10:05:20 | The 300-second execution allowance expired |
| No terminal response; invocation expires around 10:07:00 | Overall expiry produces delivery timeout |
| Local logs show execution, but no terminal response reaches SSM | Delivery timeout does not establish that nothing ran |

These are illustrative sequences, not promises about exact status-update timing. AWS requires an agent execution-timeout response to report `ExecutionTimedOut`. [Agent response requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

## Account for the fleet queue and error threshold

`MaxConcurrency` restricts simultaneous executions, and AWS ramps delivery through its queue. A small concurrency limit and long-running earlier invocations can delay later targets; inspect their statuses and the shared expiry before diagnosing every waiting node as disconnected. Split large batches or choose a suitable delivery allowance when queueing is the constraint. Raise concurrency only if the workload can tolerate it. [Concurrency controls](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html)

Execution timeouts count against `MaxErrors`; delivery timeouts do not. `Terminated` means the parent exceeded its error limit and canceled subsequent invocations. With `--max-errors '0'`, the first counted error stops further dispatch, while invocations already running may finish. [Invocation outcomes](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandInvocation.html), [error controls](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html)

Parent status is an aggregate: `Success` can coexist with timed-out nodes. Assess every intended target and its plugins, especially when verifying a deployment. [Aggregation rules](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

## Repair the cause before another attempt

For delivery problems, correlate agent availability, credentials, DNS, and messaging connectivity with the incident time. For execution problems, inspect the script's last output, dependencies, locks, and resource pressure. On Linux, agent logs are under `/var/log/amazon/ssm/`, and local command output is under `/var/lib/amazon/ssm/`. Match the command ID and timestamps. [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

After repair, this read-only probe makes both limits explicit on one selected Linux node:

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ssm send-command \
  --instance-ids "$ssm_target" --document-name 'AWS-RunShellScript' \
  --document-version '$DEFAULT' --timeout-seconds 120 \
  --parameters '{"commands":["date -u","uptime"],"executionTimeout":["300"]}' \
  --max-concurrency '1' --max-errors '0' --output json
```

Single quotes preserve `$DEFAULT` literally in Bash. Inspect the new command's expiry and invocation results using the same workflow. [CLI parameters](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)

Before retrying a mutating command, verify its process and application state, reconcile partial changes, and establish that repetition is safe. Even `CancelCommand` does not guarantee that the underlying process stopped. A larger timeout is appropriate only when the original operation legitimately needs more time. [Cancellation guarantees](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CancelCommand.html)
