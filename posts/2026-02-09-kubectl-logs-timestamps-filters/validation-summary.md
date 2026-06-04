# Validation Summary: How to Configure kubectl logs with Timestamps and Since-Time Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes pod and container logs
- Shell pipelines with grep, awk, jq, curl, head, tail, sort, uniq, and diff

## Sources Consulted
- Kubernetes generated kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- RFC 3339 date and time format: https://www.rfc-editor.org/rfc/rfc3339

## Issues Found
- Selector-based `kubectl logs` examples described retrieving logs across a time window, but the Kubernetes reference documents that `--tail` defaults to 10 when a selector is provided. I added `--tail=-1` to selector examples that are intended to return all logs matching `--since` or `--since-time`.
- The deployment investigation example used `.metadata.creationTimestamp` while describing "after a deployment", which can be confused with later rollouts. I changed the comment and variable name to clarify that the timestamp is the Deployment resource creation time.
- The "busiest 5-minute window" command grouped timestamps by minute, not by five-minute intervals. I changed the comment to "busiest minute" to match the command.
- The "Check initialization logs" example used `--tail=50 | head -20`, which returns the earliest lines from the last 50 log entries rather than true container initialization logs. I changed the comment to describe the actual output.
- The JSON export example built JSON with awk without escaping quotes, backslashes, or other JSON-sensitive characters from log messages. I replaced it with a `jq -R -c capture(...)` pipeline that emits valid JSON lines for timestamped log lines.
- The streaming example used `read line` and `curl -d`, which can alter backslashes and treats data as form data. I changed it to `IFS= read -r line` and `--data-binary` for safer log forwarding.

## Review Notes
The current Kubernetes generated reference confirms the main `kubectl logs` flags used in the post, including `--timestamps`, `--since-time`, `--since`, `--tail`, `--follow`, `--prefix`, `--all-containers`, `--previous`, and `-l/--selector`. The local environment did not have `kubectl` installed, so command validation was performed against official Kubernetes documentation rather than local `kubectl --help` output.
