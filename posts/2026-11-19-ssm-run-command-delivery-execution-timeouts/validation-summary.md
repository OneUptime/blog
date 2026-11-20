# Validation Summary: SSM `DeliveryTimedOut` vs. `ExecutionTimedOut`: Which Clock Expired?

## Status

validated

## Post Type

Technical troubleshooting guide with Bash and AWS CLI examples.

## Technologies Covered

- AWS Systems Manager (SSM) Run Command and SSM Agent
- AWS CLI and JMESPath response queries
- SSM Command documents, schema versions 1.2 and 2.2, and `aws:runShellScript`
- Bash quoting and Linux diagnostic commands
- Fleet concurrency, error thresholds, and timeout reporting

## Sources Consulted

- [Understanding command statuses and timeout values](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)
- [Command API response fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_Command.html)
- [CommandInvocation API response fields](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CommandInvocation.html)
- [GetCommandInvocation API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)
- [SendCommand API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_SendCommand.html)
- [CancelCommand API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CancelCommand.html)
- [Run commands at scale](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html)
- [Command document plugin reference: aws:runShellScript](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html#aws-runShellScript)
- [Document schemas, features, and examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html)
- [Viewing SSM Agent logs](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [AWS CLI list-commands](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-commands.html)
- [AWS CLI list-command-invocations](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html)
- [AWS CLI get-command-invocation](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-command-invocation.html)
- [AWS CLI get-document](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-document.html)
- [AWS CLI send-command](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)

## Issues Found

No technical issues found.

## Review Notes

- Verified the distinction between `Status` and `StatusDetails`, terminal agent response requirements, and the different effects of delivery and execution timeouts on `MaxErrors`. A delivery timeout does not establish that no work occurred.
- Confirmed `ExpiresAfter`, terminal completion counts, separate delivery timeout counts, plugin selection, response code `-1`, and eventual consistency against the API references.
- Checked all five CLI commands, flags, response field names, JMESPath expressions, and the JSON parameter structure against official references. All four Bash code blocks passed `bash -n`; a local argument-recording stub also exercised shell expansion without sending commands to AWS, including literal preservation of `$DEFAULT`.
- Confirmed the distinction between request `TimeoutSeconds`, document parameter `executionTimeout`, plugin input `timeoutSeconds`, and the CLI socket read timeout. The explicit request value of 120 seconds is within the documented range.
- Confirmed schema 2.2 `mainSteps` and schema 1.2 `runtimeConfig` layouts. The warning to recover the incident-time document version is appropriate because default and latest selectors can change.
- The timeout arithmetic and timestamps are explicitly illustrative. AWS's timeout guide includes differing default-timeout statements; the post correctly attributes 600 + 3600 to the documented example instead of asserting a universal default, and uses the returned expiry for incident analysis.
- Verified concurrency ramp-up, stopping further dispatch after the first counted error with `MaxErrors=0`, completion of already-running invocations, and the need to examine individual outcomes despite aggregate success.
- Confirmed Linux agent log/output locations and the lack of a guaranteed process stop from `CancelCommand`. The probe's `date -u` and `uptime` commands inspect system state.
- All cited AWS documentation URLs resolved to the intended resources, including the shell-plugin anchor. The author profile URL is unrelated to technical validation.
- No live AWS requests or managed-node executions were performed. An additional offline output-skeleton check with installed AWS CLI 2.38.1 failed because its generated `Command` response used an invalid placeholder command ID and timeout value. This is a skeleton-generation limitation, not an error in the article's supplied arguments; runtime behavior was reviewed against official documentation.
- README.md was left unchanged because no technical correction was needed.
