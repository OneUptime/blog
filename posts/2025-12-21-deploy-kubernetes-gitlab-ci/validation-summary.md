# Validation Summary: How to Deploy to Kubernetes from GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, predefined variables, environments, `extends`)
- Kubernetes (`kubectl`, Deployments, ServiceAccounts, RBAC)
- Helm 3
- Kustomize
- Docker-in-Docker (dind) image builds
- Deployment strategies (rolling update, blue-green, canary)

## Sources Consulted
- kubectl reference — config set-cluster/set-credentials/set-context, set image, rollout, patch, scale, create token: https://kubernetes.io/docs/reference/kubectl/
- `kubectl create token` (GA since v1.24) and `--duration` flag: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/#bound-service-account-token-volume
- Kubernetes RBAC (ClusterRole / ClusterRoleBinding): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- GitLab CI/CD predefined variables (`CI_REGISTRY_IMAGE`, `CI_COMMIT_SHA`, `CI_COMMIT_REF_SLUG`, `CI_REGISTRY_USER/PASSWORD/`): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab environments (`on_stop`, `action: stop`, dynamic environments): https://docs.gitlab.com/ee/ci/environments/
- GitLab Docker-in-Docker / TLS (`DOCKER_HOST`, `DOCKER_TLS_CERTDIR`): https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- Helm CLI (`helm upgrade --install`, `--set`, `--wait`, `--timeout`, `-f`): https://helm.sh/docs/helm/helm_upgrade/
- Kustomize (`kustomization.yaml`, `kustomize edit set image`, `kubectl apply -k`): https://kubectl.docs.kubernetes.io/references/kustomize/

## Issues Found
No technical issues found. All kubectl/Helm/Kustomize commands, GitLab CI keywords, predefined variables, RBAC manifests, and deployment-strategy snippets are syntactically correct and use current (non-deprecated) APIs.

## Review Notes
- **Kustomize binary availability**: The Kustomize example sets `image: bitnami/kubectl:latest` and then runs `kustomize edit set image ...`. The `bitnami/kubectl` image ships `kubectl` (which has built-in kustomize via `kubectl apply -k`) but not the standalone `kustomize` CLI, so `kustomize edit` would require installing that binary (or switching to an image that bundles it). The commands themselves are correct; this is an environment/image caveat, not a syntax error, so the example was left unchanged.
- **Token duration cap**: `kubectl create token --duration=8760h` (1 year) is valid, but the API server enforces a maximum via `--service-account-max-token-expiration`; clusters may issue a shorter token with a warning. Worth flagging to readers but not an error.
- **Docker dind TLS**: The complete-pipeline example sets `DOCKER_HOST: tcp://docker:2376` and `DOCKER_TLS_CERTDIR: "/certs"`, which is the standard GitLab TLS dind config and works as written. Some setups additionally export `DOCKER_TLS_VERIFY`/`DOCKER_CERT_PATH`, but the dind image handles this with the certs directory.
- Several intermediate Helm/`kubectl apply` snippets omit cluster-credential setup (shown earlier under "Setting Up Kubernetes Credentials"); this is expected for focused illustrative snippets, not an error.
- The `extensions` apiGroup in the RBAC rule is legacy (Deployments now live under `apps`), but listing it alongside `apps` is harmless and grants no invalid permissions.
