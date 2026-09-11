# Validation Summary: Why Buildkite env set Fails When the Job API Socket Is Missing

## Status

validated

## Post Type

Technical troubleshooting guide with Bash and Buildkite CLI examples.

## Technologies Covered

- Buildkite agent v3 and v4, Job API, job hooks, and build metadata
- Buildkite Docker plugin and Unix domain sockets
- Bash environment variables and process inheritance
- Python environment access

## Sources Consulted

- Buildkite environment command reference: https://buildkite.com/docs/agent/cli/reference/env
- Buildkite agent hooks and environment propagation: https://buildkite.com/docs/agent/hooks
- Buildkite v4.0.3 Job API client source (raw equivalent of the linked GitHub file): https://raw.githubusercontent.com/buildkite/agent/v4.0.3/jobapi/client.go
- Official Docker plugin documentation, including Job API mounting and Windows exclusions: https://github.com/buildkite-plugins/docker-buildkite-plugin
- Buildkite build metadata documentation: https://buildkite.com/docs/pipelines/configure/build-meta-data
- Buildkite command step reference, including env and depends_on: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Python os.environ reference: https://docs.python.org/3/library/os.html#os.environ
- Installed Bash builtin documentation: help export, help test, and help command. GNU's online Bash manual could not be retrieved.

## Issues Found

- The cross-step verification advice implied that jobs on the same agent could share a shell process and conceal a scope error. Replaced that sentence with a check that the dependent consumer retrieves the metadata value, explaining that build metadata is available across agents without sharing a process. Running the consumer on another agent is not required for correct metadata propagation.

## Review Notes

- Confirmed the documented v3.115.2 availability and the v4.0.3 client's socket/token requirements. The cited v4 source exists; it is a version-pinned implementation reference, not a claim about the latest release.
- Confirmed env set syntax, immediate inspection through env get, and propagation to subsequent job phases rather than the calling shell.
- Confirmed shell-hook export capture, return versus exit behavior, and Job API use for non-shell hook environment updates.
- Confirmed metadata set/get syntax, build-wide scope, producer-before-consumer ordering, and the step env map. The example stores a non-sensitive region value.
- Confirmed automatic Docker plugin socket mounting and related environment forwarding, including the documented Windows limitation. Actual behavior depends on the installed plugin version and accessible mounts.
- All six Bash code blocks passed bash -n. Executed the shell export/Python child-process example successfully; it printed eu-west-1.
- Buildkite job API calls, hook execution, metadata sharing, and Docker integration were checked against official documentation and source, not exercised in a live Buildkite job.
- The Buildkite documentation and Docker plugin links resolved to the intended resources. The GitHub source page could not be retrieved by the browser tool, but its exact tagged raw source was successfully retrieved.
