# Validation Summary: How to Debug Buildkite Jobs Waiting for an Agent

## Status

validated

## Post Type

Technical troubleshooting guide with YAML configuration and shell commands.

## Technologies Covered

- Buildkite Pipelines, self-hosted and hosted agents, clusters, queues, and agent tags
- Buildkite agent CLI, hooks, input dependencies, and concurrency groups
- YAML and Bash
- Linux systemd services and journal logs
- Kubernetes agent controllers and pod scheduling
- CI/CD capacity planning

## Sources Consulted

- [Buildkite queues overview](https://buildkite.com/docs/agent/queues): root and step targeting, queue keys, single-queue clustered agents, and deprecated unclustered queues.
- [Buildkite agent configuration](https://buildkite.com/docs/agent/self-hosted/configure): tokens, tags, environment variables, and worker configuration.
- [Command step](https://buildkite.com/docs/pipelines/configure/step-types/command-step): command, label, agents, step keys, and dependencies.
- [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency): limited jobs and concurrency group ordering.
- [Agent start CLI](https://buildkite.com/docs/agent/cli/reference/start): comma-separated tags and matching all requested agent criteria.
- [Agent pipeline CLI](https://buildkite.com/docs/agent/cli/reference/pipeline): upload dry runs and variable interpolation.
- [Agent version upgrade guide](https://buildkite.com/docs/agent/v3-v4-upgrade-guide): the version-reporting command.
- [Input step](https://buildkite.com/docs/pipelines/configure/step-types/input-step): explicit dependencies and build completion.
- [Clusters overview](https://buildkite.com/docs/pipelines/security/clusters): pipeline and agent isolation and queue organization.
- [Migration from unclustered agents](https://buildkite.com/docs/pipelines/security/clusters/migrate-from-unclustered-to-clustered-agents).
- [Agent hooks](https://buildkite.com/docs/agent/hooks): hooks execute for command jobs and can override commands.
- [Ubuntu agent installation](https://buildkite.com/docs/agent/self-hosted/install/ubuntu): service name and journal logging.
- [Kubernetes agent troubleshooting](https://buildkite.com/docs/agent/self-hosted/agent-stack-k8s/troubleshooting): pending pods, capacity constraints, controller issues, and image startup failures.
- [systemctl manual source](https://github.com/systemd/systemd/blob/main/man/systemctl.xml), [journalctl manual source](https://github.com/systemd/systemd/blob/main/man/journalctl.xml), and [shared options](https://github.com/systemd/systemd/blob/main/man/standard-options.xml): status, unit filtering, line limits, and pager suppression. The rendered manual website returned HTTP 403, so upstream manual sources were used.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the author link resolves to the intended profile.

## Issues Found

1. The input troubleshooting sentence could imply that an unsubmitted input step automatically prevents command jobs from running. Replaced it with an explicit dependency condition and clarified that input steps prevent build completion without automatically blocking other steps. This follows the documented input-step semantics.
2. The probe guidance claimed that choosing a harmless command prevents accidental use of deployment privileges. Agent and repository hooks still execute for probe jobs and can perform privileged actions or replace the command. Corrected the sentence to account for these hooks.

## Review Notes

- Both YAML examples use valid Buildkite fields and string-valued agent rules. The root queue and step override behave as described; Docker installation alone does not advertise a Docker tag.
- The agent start command uses supported comma-separated tags. It assumes an installed agent with normal configuration, an injected cluster token, and an existing self-hosted queue. Actual registered settings remain the appropriate diagnostic evidence.
- The unclustered multi-queue model is explicitly marked deprecated in the official queue documentation. The post correctly discourages using it for clustered agents.
- The CLI supports dry-run output; its default output format is JSON, with YAML available through the format option. No incorrect dry-run command is supplied in the post.
- A successful probe is evidence of queue capacity at that moment, not proof that every other scheduling constraint has been eliminated. The earlier state and dependency checks remain necessary.
- The capacity and resource-contention advice is operational guidance, not a guarantee of throughput. The post specifies no exact software version requiring a version-specific correction.
- All external links in the post resolved to the intended resources. Parsed both YAML blocks and checked both Bash blocks with bash -n. Validated the JSON fields and reviewed the final diff.
- No live Buildkite jobs were launched, agents registered, or system services changed. The example unit-test and packaging scripts are project-specific placeholders whose contents are outside this review.
