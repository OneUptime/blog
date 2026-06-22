# Validation Summary: How to Fix 'Artifact Versioning' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Semantic Versioning
- Conventional Commits
- semantic-release
- Git
- GitHub Actions
- Docker and Docker Buildx
- Open Container Initiative image labels
- Go
- Helm
- Kubernetes Deployments and rollbacks
- Amazon ECR lifecycle policies

## Sources Consulted
- Semantic Versioning 2.0.0: https://semver.org/
- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- semantic-release configuration documentation: https://semantic-release.gitbook.io/semantic-release/usage/configuration
- docker/metadata-action documentation: https://github.com/docker/metadata-action
- Docker Build variables and Dockerfile reference: https://docs.docker.com/build/building/variables/ and https://docs.docker.com/reference/dockerfile/
- Docker GitHub Actions tag and label management: https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Git describe documentation: https://git-scm.com/docs/git-describe
- Helm chart documentation: https://helm.sh/docs/topics/charts/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl rollout undo documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- kubectl rollout history documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Amazon ECR lifecycle policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Amazon ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html

## Issues Found
- The Git version script failed in repositories with no tags because it used the fallback tag `v0.0.0` in a `git rev-list v0.0.0..HEAD` range. I changed it to detect whether a tag exists and count from `HEAD` when no tag is present.
- The Docker metadata-action example claimed it would never create `latest`, but the action's default `flavor` can generate `latest` automatically for SemVer tags. I added `flavor: latest=false`.
- The Docker metadata-action snippet mentioned PR tagging but only configured branch refs. I added `type=ref,event=pr`.
- The GitHub Actions Docker build pushed images on `pull_request` events. I changed `push` to skip pushes for pull requests.
- The multi-stage Dockerfile used build args in the final stage without redeclaring them there. I added `ARG VERSION`, `ARG GIT_SHA`, and `ARG BUILD_DATE` after the final `FROM`.
- The Helm section said chart versions should be synchronized with application versions, while Helm treats `version` and `appVersion` as separate fields. I changed the wording to say they are tracked separately.
- The Kubernetes Deployment example used `deployment.kubernetes.io/revision-history` as if it configured retained rollout history. I removed that annotation and added `spec.revisionHistoryLimit: 10`.
- The rollback script parsed the previous revision while labeling it as the current revision. I changed it to read the last numeric revision from `kubectl rollout history`.
- The ECR lifecycle policy was shown as YAML, but ECR lifecycle policies are JSON documents. I converted the example to valid JSON.

## Review Notes
- The examples use older action and base image major versions, such as `docker/build-push-action@v5`, `docker/metadata-action@v5`, `golang:1.21-alpine`, and `alpine:3.19`. These are not inherently invalid in the examples, but future maintenance should consider updating them to currently preferred versions.
