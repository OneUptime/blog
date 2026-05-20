# Validation Summary: ArgoCD vs Jenkins: Why GitOps Beats Traditional CI/CD

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Jenkins Pipeline
- Docker CLI
- Git

## Sources Consulted
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD app history command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD app rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cluster_add/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- OpenGitOps principles: https://opengitops.dev/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Docker image push reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/

## Issues Found
- The Jenkins examples built `myapp:${BUILD_NUMBER}` but pushed and deployed `myregistry/myapp:${BUILD_NUMBER}`. Updated the build commands to tag the image as `myregistry/myapp:${BUILD_NUMBER}` so the later `docker push` commands refer to an image that exists locally.
- The Argo CD Application YAML examples omitted `repoURL`, `targetRevision`, and a destination cluster (`server` or `name`). Added `repoURL`, `targetRevision`, `project`, and `destination.server` fields so the examples match the Argo CD Application specification.
- The security section said ArgoCD runs inside the cluster and does not need external credentials in a way that could be read as universally true. Revised it to clarify that Argo CD uses Kubernetes permissions for managed clusters and that CI systems no longer need cluster credentials for deployment.
- The single-source-of-truth and audit-trail wording implied Git alone always proves what is currently live. Revised it to distinguish desired state in Git from live state and sync history in Argo CD.

## Review Notes
The Jenkins Pipeline syntax, `argocd app history`, `argocd app rollback`, `kubectl set image`, `kubectl apply`, and `kubectl rollout undo` examples are consistent with current official documentation. The internal OneUptime links returned HTTP 200 during validation.
