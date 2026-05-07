# Validation Summary: How to Use Podman in Buildkite Pipelines

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Buildkite pipelines
- Buildkite self-hosted agents
- Buildkite hooks
- Bash
- PostgreSQL container image

## Sources Consulted
- Buildkite Docs: Self-hosted agents - https://buildkite.com/docs/agent/self-hosted
- Buildkite Docs: Command step - https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite Docs: Depends on - https://buildkite.com/docs/pipelines/configure/depends-on
- Buildkite Docs: Agent hooks - https://buildkite.com/docs/agent/hooks
- Buildkite Docs: `buildkite-agent pipeline upload` - https://buildkite.com/docs/agent/cli/reference/pipeline
- Buildkite Docs: Agent configuration - https://buildkite.com/docs/agent/self-hosted/configure
- Podman Docs: `podman` rootless mode - https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Podman Docs: `podman build` - https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman Docs: `podman login` - https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- Podman Docs: `podman network create` - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman Docs: `podman container prune` - https://docs.podman.io/en/v4.4/markdown/podman-container-prune.1.html
- Podman Docs: `podman image prune` - https://docs.podman.io/en/v5.1.2/markdown/podman-image-prune.1.html
- Podman Docs: `podman info` - https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Docker Official Image docs: PostgreSQL - https://hub.docker.com/_/postgres/

## Issues Found
- The original pipeline examples assumed a Podman image built in one Buildkite step would be available in later steps. Buildkite documents that command steps can run on different agents, so I changed the examples to build and use the image in the same step where needed.
- The original `depends_on` usage referenced step labels. Buildkite dependencies are defined with step keys, so I removed the invalid label-based dependencies while simplifying the examples.
- The Ubuntu provisioning example was incomplete for rootless Podman. I added `uidmap`, `slirp4netns`, and subordinate UID/GID setup for the `buildkite-agent` user because Podman documents those as rootless prerequisites.
- The "Using Buildkite Plugins with Podman" section was technically incorrect because it showed a repository hook, not a Buildkite plugin. I renamed the section and adjusted the description to match the implementation.
- The hook comments did not match the actual Podman commands. `podman container prune` removes stopped containers, and `podman image prune` without `-a` removes dangling images, so I corrected the comments.
- The integration test examples used a fixed `sleep 5` and cleanup commands that would not reliably run after failures. I replaced them with readiness loops and `trap`-based cleanup so the examples are more reliable.

## Review Notes
- Buildkite now supports the `if_changed` step attribute, which can cover some changed-file workflows without custom dynamic pipeline generation. The dynamic pipeline example in the post is still technically valid after the fixes.
