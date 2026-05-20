# Validation Summary: How to Implement the Polyrepo Pattern with ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD
- Argo CD Application and AppProject resources
- Argo CD ApplicationSet SCM Provider and List generators
- Kubernetes manifests and Secrets
- Kustomize overlays and remote bases
- Helm chart dependencies
- GitHub CLI and GitHub organization webhooks
- jq

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup and repository credentials documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet SCM Provider generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitHub REST API organization webhooks documentation: https://docs.github.com/en/rest/orgs/webhooks
- GitHub CLI `gh api --help` local command output

## Issues Found
- The `argocd repo add` examples used HTTPS repository URLs together with `--ssh-private-key-path`. Argo CD documents SSH private-key auth for SSH-style repository URLs, so the examples now use `git@github.com:org/service-a-config.git` and `git@github.com:org/service-b-config.git`.
- The repository credential template snippet said it could be placed in `argocd-cm` or as a Secret. Current declarative setup uses Kubernetes Secrets labeled with `argocd.argoproj.io/secret-type: repo-creds`, so the comment now says `As a Secret`.
- The GitHub organization webhook command passed `events='["push"]'`. GitHub expects `events` as an array, and `gh api` documents `key[]=value` syntax for array fields, so the command now uses `--field events[]=push`.
- The monitoring command used `argocd app list -l team=team-a`, but the examples organize applications by Argo CD project and do not set a `team=team-a` label. It now uses `argocd app list -p team-a`, which matches the shown `project: team-a` configuration.

## Review Notes
The remaining Argo CD Application, ApplicationSet, AppProject, Kustomize, Helm dependency, webhook endpoint, and `jq` examples are consistent with the referenced documentation. In a production post, it may be useful to mention that ApplicationSet SCM Provider token permissions and GitHub organization webhook creation require suitable GitHub permissions, but the examples are technically valid as written.
