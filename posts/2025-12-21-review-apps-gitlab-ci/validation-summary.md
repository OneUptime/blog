# Validation Summary: How to Set Up Review Apps in GitLab CI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, dynamic environments, review apps)
- GitLab predefined CI/CD variables (`CI_COMMIT_REF_SLUG`, `CI_PIPELINE_SOURCE`, `CI_REGISTRY_IMAGE`, etc.)
- Kubernetes (Deployment, Service, Ingress, namespaces)
- Helm
- kubectl
- Docker / Docker Compose / Docker-in-Docker (dind)
- Traefik (ingress labels)
- cert-manager (Let's Encrypt)
- PostgreSQL / Redis
- Playwright (E2E testing)
- jq (scheduled cleanup script)

## Sources Consulted
- GitLab Docs — Environments and deployments / Review apps: https://docs.gitlab.com/ci/environments/
- GitLab Docs — `on_stop`, `action: stop`, `auto_stop_in`, `deployment_tier` keywords: https://docs.gitlab.com/ci/yaml/
- GitLab Docs — Where variables can be used (variable expansion uses Go `os.Expand`, no bash parameter substitution): https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- GitLab Forum — Using bash substitution parameter in `.gitlab-ci.yml`: https://forum.gitlab.com/t/using-bash-substitution-parameter-in-gitlab-ci-yml/31599
- Docker Hub — `alpine/helm` image (does not bundle kubectl; recommends `alpine/k8s` when both are needed): https://hub.docker.com/r/alpine/helm
- Docker Hub — `bitnami/kubectl`, `alpine/k8s`, `mcr.microsoft.com/playwright` images

## Issues Found
1. **Bash parameter substitution in the GitLab `variables:` block (Shared Database with Schema Isolation section).** The post defined `REVIEW_SCHEMA: review_${CI_COMMIT_REF_SLUG//-/_}` in the top-level `variables:` block. GitLab expands CI variables with Go's `os.Expand()`, which only understands `$VAR` / `${VAR}` and does **not** support bash pattern substitution (`${VAR//-/_}`). The value would have been left literal and broken. Fixed by moving the schema-name computation into the `script:` block (where it runs in the shell and bash substitution works), matching the same pattern already used correctly in the Ephemeral Databases section. Added a brief comment explaining why.

2. **`kubectl delete namespace` in the Helm `stop_review` job (Kubernetes Review Apps → Using Helm).** The job ran on `image: alpine/helm:3.13`, which does not include the `kubectl` binary, so the command could never succeed. It also referenced a per-branch namespace (`$KUBE_NAMESPACE-$CI_COMMIT_REF_SLUG`) that was never created — the deploy job used the shared `$KUBE_NAMESPACE` (`review-apps`) via `--create-namespace`. Removed the erroneous line; `helm uninstall` already removes the release's resources from the shared namespace, leaving a consistent and working example.

## Review Notes
- `auto_stop_in: 1 week` and `auto_stop_in: 3 days` are valid GitLab human-readable durations; the timer resets on each successful deployment, so the "after 3 days of inactivity" comment is accurate.
- `deployment_tier: development`, `on_stop`, `action: stop`, and the `rules: if: $CI_PIPELINE_SOURCE == "merge_request_event"` patterns are all current, correct GitLab CI syntax.
- The `bitnami/kubectl:latest` and `alpine/helm:3.13` examples mix `kubectl`/`helm` only where each image actually provides the needed tool after the fix. For real-world combined use, `alpine/k8s` (bundles both helm and kubectl) is a convenient alternative — worth mentioning but not an error.
- `docker-compose` (v1, hyphenated) is used in the Docker Compose section. It still works on runners that have it installed but is superseded by the `docker compose` (v2) plugin; consider updating in a future revision. Not changed, as it is environment-dependent and the job is tagged to a specific `docker-host` runner.
- The scheduled-cleanup `jq` filter (`fromdateiso8601 < (now - 604800)`) is correct (604800 = 7 days in seconds). It assumes namespaces are labeled `app=review-app`, which the inline kubectl example labels on pods/services rather than namespaces — a minor illustrative inconsistency, left as-is.
- Image tags referenced (`docker:24.0`, `docker:24.0-dind`, `mcr.microsoft.com/playwright:v1.40.0`, `postgres:15-alpine`, `redis:7-alpine`) are all valid, real tags. The dind setup with `DOCKER_HOST`/`DOCKER_TLS_CERTDIR` is correct.
- The Mermaid diagram syntax (`-->|Yes|` edge labels) is valid.
