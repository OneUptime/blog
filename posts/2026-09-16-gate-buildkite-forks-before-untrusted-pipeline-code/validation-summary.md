# Validation Summary: How to Gate Buildkite Fork Builds Before Untrusted Pipeline Code Runs

## Status
validated

## Post Type
Security guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite Agent
- GitHub pull requests and fork builds
- YAML pipeline configuration
- Kubernetes worker isolation
- OIDC, secrets, artifacts, and signed pipelines

## Sources Consulted
- [Buildkite dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Buildkite block step reference](https://buildkite.com/docs/pipelines/configure/step-types/block-step)
- [Buildkite step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Buildkite conditionals](https://buildkite.com/docs/pipelines/configure/conditionals)
- [Buildkite Git checkout](https://buildkite.com/docs/pipelines/configure/git-checkout)
- [Buildkite agent hooks](https://buildkite.com/docs/agent/hooks)
- [Buildkite pipeline CLI reference](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Buildkite signed pipelines](https://buildkite.com/docs/agent/self-hosted/security/signed-pipelines)
- [Buildkite security controls](https://buildkite.com/docs/pipelines/best-practices/security-controls)
- [Buildkite agent management best practices](https://buildkite.com/docs/pipelines/best-practices/agent-management)

## Issues Found
- The introduction said plugins may already have executed before a block in the uploaded pull-request pipeline. A plugin referenced only by that newly uploaded pipeline does not execute before the upload. Removed “plugins” from that sentence; repository hooks and fork-controlled generator code remain valid pre-upload execution risks.

## Review Notes
The YAML fields, fork-detection condition, `buildkite-agent pipeline upload` command, block-step team restriction, and skipped-dependency behavior match current Buildkite documentation. The queue and cluster guidance correctly treats routing labels as insufficient without infrastructure-level isolation. No version-specific claims require qualification.
