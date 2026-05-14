# Validation Summary: How to Integrate Flux CD with GitLab CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- GitLab CI/CD
- GitLab Container Registry
- Kubernetes
- Docker-in-Docker
- OCI artifacts
- Flux notification webhooks
- Flux image automation resources

## Sources Consulted
- Flux GitLab bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/gitlab/
- Flux `flux bootstrap gitlab` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux `flux push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `flux tag artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Provider documentation for GitLab commit status: https://fluxcd.io/flux/components/notification/providers/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab container registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab CI/CD `rules` documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docker-in-Docker registry authentication documentation: https://docs.gitlab.com/ci/docker/authenticate_registry/

## Issues Found
- The Flux bootstrap examples used `--personal` with `--owner=my-group`. Flux documents `--personal` for personal GitLab accounts; group-owned projects should omit it. Removed `--personal` from the group examples.
- The GitLab CI OCI artifact examples used Flux CLI image `ghcr.io/fluxcd/flux-cli:v2.2.0`, which is outdated. Updated the examples to `v2.8.6`, the current Flux release available at review time.
- The `flux push artifact --revision` examples used `$CI_COMMIT_BRANCH/$CI_COMMIT_SHA`, but Flux expects a revision in `<branch|tag>@sha1:<commit-sha>` format. Updated the examples to `$CI_COMMIT_REF_NAME@sha1:$CI_COMMIT_SHA`.
- The Flux GitLab `Receiver` events used lowercase slugs (`push`, `tag_push`). Flux matches the `X-Gitlab-Event` header values, so the correct values are `Push Hook` and `Tag Push Hook`. Updated the receiver manifest.
- The webhook URL example pointed directly at an internal notification-controller service. Flux documents that the generated webhook path must be exposed through an external ingress or equivalent endpoint. Updated the example URL to use a public notification-controller ingress plus the generated webhook path.
- The GitLab CI `notify-flux` job redefined `FLUX_WEBHOOK_URL` and `FLUX_WEBHOOK_TOKEN` as self-referential job variables. Removed the redundant variables block; the values should be configured as GitLab CI/CD variables.
- The GitLab notification provider used a path-based project URL. Flux documents that current GitLab installations should use the project ID in the provider address. Updated the example to `https://gitlab.com/12345678`.
- The deployment referenced `gitlab-pull-secret` in the `my-app` namespace, but the article only created `gitlab-registry-secret` in `flux-system`. Kubernetes image pull secrets must exist in the workload namespace. Added commands to create the namespace and `gitlab-pull-secret`.
- The deployment included a Flux image policy marker without configuring ImageUpdateAutomation, which would not update the OCI-published manifest by itself. Removed the marker and added a note that the manifest bundle pushed to OCI must reference the intended image tag.
- The Docker-in-Docker pipeline requires a suitably configured privileged runner or equivalent image builder. Added this prerequisite.

## Review Notes
The examples are now aligned with current Flux v2.8 documentation and GitLab CI/CD behavior. The guide still uses simplified example image tags and registry paths; real deployments should choose either CI-rendered OCI manifests or Flux ImageUpdateAutomation consistently to avoid ambiguity about where image tag updates are made.
