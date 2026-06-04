# Validation Summary: How to Configure GitLab CI Runners to Use Kubernetes Pod Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Runner
- GitLab Runner Helm chart
- Kubernetes executor
- Kubernetes pods, volumes, node selectors, tolerations, service accounts, security contexts, and Pod Security Standards
- Docker-in-Docker
- S3-backed GitLab Runner cache
- Prometheus runner metrics

## Sources Consulted
- GitLab Runner Helm chart documentation: https://docs.gitlab.com/runner/install/kubernetes/
- GitLab Runner Kubernetes executor documentation: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner advanced configuration documentation: https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Docker-in-Docker CI documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Runner Helm chart values: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/main/values.yaml
- GitLab runner tag matching documentation: https://docs.gitlab.com/ci/runners/configure_runners/
- Node.js release schedule: https://github.com/nodejs/release
- Go release history: https://go.dev/doc/devel/release

## Issues Found
- The post treated "pod templates" as a first-class GitLab Runner concept in places where the examples were standard Kubernetes executor pod settings. Updated the description and introductory explanation to refer to Kubernetes executor pod settings and runner/CI job configuration.
- Replaced deprecated Helm `runnerRegistrationToken` usage with current `runnerToken` usage for runner authentication tokens.
- Corrected Helm service account values from the old/invalid `rbac.serviceAccountName` pattern to the current `serviceAccount.create` and `serviceAccount.name` values.
- Replaced the `gitlab/gitlab-runner-helper:latest` helper image with the GitLab Container Registry helper image pattern tied to `${CI_RUNNER_VERSION}`.
- Fixed invalid TOML array syntax for `pod_annotations`; GitLab Runner expects a table.
- Replaced an unsafe mixed Docker socket/Docker-in-Docker example with GitLab's documented Docker-in-Docker pattern using `privileged = true` and a pinned `docker:24.0.5-dind` service.
- Updated stale example images from `golang:1.21` and `node:18` to supported current examples.
- Clarified that CI job `tags` must match runner tags assigned in GitLab; runner names alone do not select jobs.
- Rewrote `node_selector` and `node_tolerations` examples to use documented GitLab Runner TOML table syntax.
- Fixed service environment variable configuration; GitLab Runner service `environment` values belong on each service as a string array.
- Replaced unsupported generic `container_security_context` usage with `build_container_security_context` and nested `capabilities` syntax.
- Corrected the metrics example to enable the Helm chart runner metrics endpoint/PodMonitor instead of adding Prometheus annotations to job pods.
- Changed the `gitlab-runner list` description from job execution history to configured runner listing.

## Review Notes
All YAML examples and embedded `runners.config` TOML snippets were mechanically parsed after the edits. The multi-runner examples still assume the corresponding runners and tags have been created or assigned in GitLab, which is now noted in the post.
