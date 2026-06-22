# Validation Summary: How to Fix 'Deployment' Pipeline Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- GitHub Actions
- GitLab CI/CD
- AWS IAM OIDC authentication
- AWS CLI and ECS deployments
- Kubernetes RBAC, Deployments, image pull policies, kubectl
- Docker Buildx and Docker image push workflows
- Node.js build memory configuration
- Bash retry logic
- Kubeconform manifest validation

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Docs: Store and share data with workflow artifacts - https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitLab Docs: Troubleshooting CI/CD variables and debug logging - https://docs.gitlab.com/ci/variables/variables_troubleshooting/
- Kubernetes Docs: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Docs: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Docs: Container images and imagePullPolicy - https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Docs: kubectl apply reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Docker Docs: docker buildx build reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Kubeconform project documentation - https://github.com/yannh/kubeconform

## Issues Found
- The AWS IAM role ARN used a 9-digit account ID. AWS account IDs are 12 digits, so the example was changed to `123456789012`.
- The GitLab CI Docker build example used legacy `docker build --memory` and `--memory-swap` flags. Current Docker documentation points `docker build` to Buildx/BuildKit, where per-step build limits use `--resource`. The snippet now uses `docker buildx build --load --resource memory=4g --resource memory-swap=4g`.
- The multiline Docker build command in the GitLab CI example was changed to a block scalar so the shell receives the intended line continuations.
- The retry script used `kubectl apply --timeout=120s`, which is not an `apply` option. It now uses the global `--request-timeout=120s` flag.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. These fields were added.
- The manifest validation example used Kubeval, whose latest release is from 2021. It was replaced with Kubeconform and the matching `-strict` command syntax for a more current manifest validation tool.

## Review Notes
The examples are illustrative and still require environment-specific setup such as AWS IAM trust policies, Kubernetes contexts, registry credentials, and GitLab runner capabilities. Docker Buildx `--resource` limits require a BuildKit daemon that supports per-step resource limits and apply to individual build steps rather than the whole build.
