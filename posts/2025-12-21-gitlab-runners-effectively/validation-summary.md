# Validation Summary: How to Use GitLab Runners Effectively

## Status
validated

## Post Type
Guide / Tutorial — a configuration and best-practices walkthrough for deploying, registering, configuring, scaling, and securing GitLab Runners.

## Technologies Covered
- GitLab Runner (config.toml, CLI)
- GitLab CI/CD (`.gitlab-ci.yml`)
- Docker executor
- Kubernetes executor
- Docker Machine (`docker+machine`) autoscaling
- Shell executor
- Helm (GitLab Runner chart)
- S3 / GCS / local caching
- Prometheus metrics

## Sources Consulted
- GitLab Runner Kubernetes executor docs — https://docs.gitlab.com/runner/executors/kubernetes/ (resource request/limit field names, `pod_spec` syntax)
- GitLab Runner install on Kubernetes (Helm) — https://docs.gitlab.com/runner/install/kubernetes/ (`runnerToken` values key)
- GitLab Runner advanced configuration / `config.toml` reference (cache, docker-machine autoscaling, session server, Prometheus listener)
- GitLab Runner registration docs (authentication-token `glrt-` workflow, `--tag-list`, `--run-untagged`, `--locked`)

## Issues Found
1. **Invalid Kubernetes resource-request configuration.** The "Resource Requests (Kubernetes)" snippet used a single-bracket `[runners.kubernetes.pod_spec]` table with a `containers = '''...'''` heredoc. This is not valid GitLab Runner configuration. Per the Kubernetes executor docs, container resources are set with the dedicated `cpu_request` / `memory_request` / `cpu_limit` / `memory_limit` fields directly under `[runners.kubernetes]`. (The real `pod_spec` feature is an array of tables — `[[runners.kubernetes.pod_spec]]` — using `name` / `patch` / `patch_type`, not a `containers` field.) Replaced the block with the standard resource fields, which also matches the correct usage already shown in the post's "Kubernetes Autoscaling" section.
2. **Malformed Markdown headers.** "Resource Management" and "Resource Requests (Kubernetes)" were missing their `##`/`###` prefixes and rendered as body text. Restored them to `## Resource Management` and `### Resource Requests (Kubernetes)` to match the rest of the document structure.

## Review Notes
- The non-interactive registration uses the current authentication-token workflow (`--token "glrt-..."`), which is correct for modern GitLab Runner versions; the deprecated `--registration-token` flow is appropriately avoided.
- The Helm install uses `runnerToken`, which is the correct values key for the authentication-token workflow (the older `runnerRegistrationToken` is deprecated).
- Cache configuration field casing (`Type`, `Path`, `Shared`, `ServerAddress`, `BucketName`, `BucketLocation`) and docker-machine autoscaling fields (`IdleCount`, `IdleTime`, `MaxBuilds`, `MachineOptions`, `[[runners.machine.autoscaling]]` with `Periods`/`Timezone`) match the `config.toml` reference and are correct.
- The `latest` download URL and the embedded examples are fine as illustrative snippets; readers should still pin runner versions and avoid `privileged = true` / Docker-socket mounting in production, which the post itself flags in the Security Best Practices section.
