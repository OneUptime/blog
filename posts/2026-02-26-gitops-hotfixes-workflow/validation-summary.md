# Validation Summary: How to Handle Hotfixes in a GitOps Workflow

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments and ConfigMaps
- GitHub Actions
- Docker CLI
- yq
- Git

## Sources Consulted
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD parameter overrides documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/parameters/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions `GITHUB_TOKEN` and workflow permissions documentation: https://docs.github.com/en/actions/security-guides/automatic-token-authentication
- GitHub branch protection rules documentation: https://docs.github.com/github/administering-a-repository/enabling-branch-restrictions
- Docker build, tag, and publish documentation: https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker `docker image push` command reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker `docker login` command reference: https://docs.docker.com/reference/cli/docker/login/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The GitHub Actions hotfix pipeline pushed a Docker image without first authenticating to a registry. Added a non-interactive `docker login` step using `--password-stdin`, matching Docker CLI guidance.
- The GitHub Actions example cloned the GitOps repository over anonymous HTTPS and then pushed to it, which would fail for a private repository or any repository requiring authentication. Updated the clone URL to use a `GITOPS_TOKEN` secret and added Git author configuration so the commit command works in CI.
- The Argo CD normal deployment sync window used `schedule: '0 9-17 * * 1-5'` with `duration: 8h`, which starts overlapping 8-hour windows hourly from 09:00 through 17:00 rather than one 09:00-17:00 window. Changed it to `schedule: '0 9 * * 1-5'` with `duration: 8h`.
- The Kubernetes config-only examples were partial edits to existing manifests but could be read as complete standalone manifests. Clarified the comments so the examples are understood as edits to existing Deployment and ConfigMap manifests.

## Review Notes
- Argo CD parameter overrides are technically supported, but Argo CD's documentation notes that many teams consider them an anti-pattern for GitOps production workflows because the source of truth becomes Git plus Argo CD overrides. The post mitigates this by presenting them as temporary and requiring cleanup.
- The Docker and GitHub Actions examples assume the referenced secrets exist and have access to the registry and GitOps repository.
