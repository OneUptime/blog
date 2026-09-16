# Validation Summary: How to Retry Buildkite Jobs After Agent Shutdown Without Retrying Test Timeouts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite self-hosted agents
- Buildkite automatic retry configuration
- YAML
- Bash
- Linux process signals and exit statuses

## Sources Consulted
- [Buildkite retry documentation](https://buildkite.com/docs/pipelines/configure/retry)
- [Buildkite build timeouts documentation](https://buildkite.com/docs/pipelines/configure/build-timeouts)
- [Buildkite agent configuration reference](https://buildkite.com/docs/agent/self-hosted/configure)
- [Buildkite agent v3 to v4 upgrade guide](https://buildkite.com/docs/agent/v3-v4-upgrade-guide)
- [Buildkite changelog: Signal and signal reason in automatic retry rules](https://buildkite.com/resources/changelog/193-signal-and-signal-reason-in-automatic-retry-rules/)
- [GNU Bash manual: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [GNU Coreutils manual: timeout invocation](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html)

## Issues Found
No technical issues found.

## Review Notes
- The retry rules match Buildkite's documented clean-agent-stop and lost-agent pattern. Because an omitted `exit_status` defaults to `"*"`, the `agent_stop` rule matches statuses 1 through 255 but not lost-agent status `-1`; the following rule handles `-1` only when `signal_reason` is `none`.
- The discussion of cancellation and timeouts is consistent with Buildkite's current behavior: `cancel` can identify a timeout that finishes in a retryable state, while canceled jobs and jobs in canceled builds are not automatically retried.
- The agent timeout terminology reflects Buildkite agent v4 (`cancel-signal-timeout` and `cancel-cleanup-timeout`). Agent v3 installations use older configuration names, so operators should consult the linked upgrade guide when applying that advice to v3.
