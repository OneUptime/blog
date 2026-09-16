# Validation Summary: How to Reuse a Buildkite Agent for Steps That Need a Large Local Workspace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite Agent
- Dynamic pipeline uploads
- Bash
- Python
- Git checkout behavior

## Sources Consulted
- [Buildkite Agent `start` command and agent targeting](https://buildkite.com/docs/agent/cli/reference/start)
- [Buildkite environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables)
- [Buildkite dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Buildkite Agent `pipeline` command](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Buildkite explicit dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Buildkite Git checkout configuration](https://buildkite.com/docs/pipelines/configure/git-checkout)

## Issues Found
- The preparation command and upload example were presented as separate shell executions even though the generator relies on `LOCAL_WORKSPACE` exported by the preparation script. A child Bash process cannot modify its parent's environment. Changed the command to a wrapper that sources the preparation script and runs generation and upload in the same shell.
- The workspace validation used a string-prefix check, which can accept paths containing traversal components and does not account for symlinks. Changed it to resolve the root and workspace, require both to exist, and verify that the workspace is a proper child of the permitted root.

## Review Notes
- Native `checkout.skip` requires Buildkite Agent v3.136.0 or newer, as stated. Under the agent's `strict` checkout override mode, a job-level skip setting can be ignored; the default `from-job` mode permits it unless the agent configuration forces checkout behavior.
- The ownership tag must remain unique among eligible active agents, and the design intentionally trades availability for local disk affinity.
