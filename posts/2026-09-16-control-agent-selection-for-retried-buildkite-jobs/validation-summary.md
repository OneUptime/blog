# Validation Summary: How to Control Which Buildkite Agent Receives a Retried Job

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite self-hosted agents and queues
- Buildkite agent tags and targeting rules
- Buildkite retry agent affinity
- Buildkite agent and job priorities
- Buildkite environment variables
- YAML pipeline configuration
- Bash

## Sources Consulted
- [Buildkite agent prioritization](https://buildkite.com/docs/agent/self-hosted/prioritization)
- [Buildkite queues overview](https://buildkite.com/docs/agent/queues)
- [Buildkite agent start command reference](https://buildkite.com/docs/agent/cli/reference/start)
- [Buildkite environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables)
- [Buildkite job priority](https://buildkite.com/docs/pipelines/configure/workflows/job-priority)
- [Buildkite retry configuration and behavior](https://buildkite.com/docs/pipelines/configure/retry)
- [Buildkite pipeline step definitions](https://buildkite.com/docs/pipelines/configure/defining-steps)

## Issues Found
No technical issues found.

## Review Notes
The retry-affinity setting is a preference rather than a host-level isolation guarantee, as the post correctly emphasizes. The examples use valid Buildkite YAML agent queries and current environment variables. The custom tags shown (`architecture` and `diagnostic_pool`) require corresponding agent configuration, which the post also states. No version-specific or deprecated APIs are used.
