# Validation Summary: How to Prioritize Buildkite Release Jobs Over Pull Request Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite self-hosted agents and queues
- Buildkite hosted agents
- Dynamic pipeline uploads with `buildkite-agent`
- Job priority, dependencies, and concurrency groups
- CI/CD release and deployment scheduling

## Sources Consulted
- [Buildkite job priority documentation](https://buildkite.com/docs/pipelines/configure/workflows/job-priority)
- [Buildkite command step documentation](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Buildkite dependency documentation](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Buildkite dynamic pipelines documentation](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Buildkite pipeline upload CLI reference](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Buildkite queues overview](https://buildkite.com/docs/agent/queues)
- [Buildkite hosted agents documentation](https://buildkite.com/docs/agent/buildkite-hosted)
- [Buildkite concurrency documentation](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency)

## Issues Found
- The discussion of priority and concurrency groups could imply that priority reorders jobs in the default concurrency mode. Clarified that `ordered`, the default, preserves creation order and that priority takes precedence for concurrency-slot admission only with `concurrency_method: eager`. The deployment example retains the ordered default because deployment order matters.

## Review Notes
- The YAML command-step fields (`key`, `depends_on`, `priority`, `agents`, `concurrency`, and `concurrency_group`) are current and valid.
- The default priority of `0`, preference for higher integer values, top-level pipeline priority, lack of preemption, and dependency behavior agree with the official documentation.
- The `buildkite-agent pipeline upload .buildkite/release.yml` command is valid, and prioritizing both the bootstrap upload step and dynamically uploaded release steps correctly treats them as separate scheduling decisions.
- The hosted-agent best-effort caveat and capacity qualification agree with Buildkite's hosted-agent documentation.
- The statement that a clustered self-hosted agent can be assigned to only one self-hosted queue is current. Buildkite separately documents multi-queue listening for deprecated unclustered agents, which is outside the post's stated within-cluster context.
