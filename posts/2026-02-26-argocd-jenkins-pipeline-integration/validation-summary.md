# Validation Summary: How to Integrate ArgoCD with Jenkins Pipeline

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- Jenkins Pipeline / Jenkinsfile
- GitOps
- Kubernetes
- Kustomize
- Docker Pipeline plugin
- Argo CD CLI and REST API
- Jenkins credentials binding

## Sources Consulted
- Argo CD command reference for `argocd login`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD command reference for `argocd app wait`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Using a Jenkinsfile documentation, including credential interpolation guidance: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins Credentials Binding Plugin documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Kustomize v5.3.0 `edit set image --help` output from the official release binary: https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz

## Issues Found
- The prerequisites referred to an "ArgoCD service account" for the API token. Argo CD automation tokens are more accurately tied to an Argo CD account or project role, so this was changed to "ArgoCD account or project role token."
- The credential setup instructions used uppercase placeholder IDs that did not match the Jenkinsfile examples. Updated the listed Jenkins credential IDs to `argocd-token`, `argocd-server`, and `git-deploy-creds` so the examples are internally consistent.
- Several Jenkins `sh """ ... """` snippets interpolated credentials such as `ARGOCD_TOKEN`, `ARGOCD_SERVER`, `GIT_USER`, and `GIT_PASS` through Groovy before execution. Jenkins documents this as unsafe because secrets can be exposed in process arguments. Updated the snippets to let the shell expand bound environment variables and added `set +x` in credential-handling shell blocks.
- The shared-library `login` helper interpolated the Argo CD token into a Groovy string. Updated it to read `ARGOCD_SERVER` and `ARGOCD_TOKEN` from the environment inside a single-quoted shell block, matching Jenkins credential-binding guidance.

## Review Notes
- The Argo CD CLI flags used in the post, including `--auth-token`, `--grpc-web`, `--insecure`, `app get --refresh`, `app sync`, and `app wait --sync --health --timeout`, match official command references.
- The Kustomize `edit set image ${IMAGE_NAME}=${IMAGE_NAME}:${IMAGE_TAG}` syntax matches the v5.3.0 command help.
- The REST API examples use the documented bearer-token authorization model. The `/api/v1/applications/{name}/sync` endpoint is consistent with Argo CD's Applications API behavior, though production pipelines should also check HTTP status codes from `curl`.
