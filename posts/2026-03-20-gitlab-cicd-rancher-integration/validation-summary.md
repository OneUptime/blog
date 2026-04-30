# Validation Summary: How to Integrate GitLab CI/CD with Rancher

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Rancher
- GitLab CI/CD
- GitLab Container Registry
- Kubernetes RBAC and ServiceAccounts
- `kubectl`
- Docker-in-Docker

## Sources Consulted
- Rancher JWT authentication for downstream service account tokens: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/jwt-authentication.html
- Rancher cluster access and proxy-based kubeconfig behavior: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-admin/manage-clusters/access-clusters/access-clusters.html and https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/about-rancher/architecture/communicating-with-downstream-clusters.html
- Rancher API audit logging: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/observability/logging/enable-api-audit-log.html
- Kubernetes service accounts and legacy token secrets: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/ and https://kubernetes.io/docs/concepts/security/service-accounts/
- `kubectl` config commands: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/ , https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-credentials/ , and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/
- `kubectl` rollout and image update commands: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/ , https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/ , and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- GitLab deprecated CI keywords and `rules`: https://docs.gitlab.com/ci/yaml/deprecated_keywords/ and https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docker-in-Docker guidance: https://docs.gitlab.com/ci/docker/using_docker_build/ and https://docs.gitlab.com/ci/docker/authenticate_registry/
- GitLab CI/CD variables and masking: https://docs.gitlab.com/ci/variables/ and https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab container registry authentication: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/

## Issues Found
- The post said Rancher `v2.7+`, but the documented flow uses a Kubernetes service account token against Rancher’s `/k8s/clusters/...` proxy URL. Rancher only supports downstream service account JWT authentication through that proxy in Rancher `v2.9.0+`, so the prerequisite was corrected to `v2.9+`.
- The post did not mention that Rancher JWT Authentication must be enabled for the target cluster when using a downstream service account token with the Rancher proxy URL. Added that requirement to Step 1.
- The Step 1 heading said the service account was created “in Rancher”, but the manifest actually creates a Kubernetes `ServiceAccount` and `RoleBinding` in the downstream cluster namespace. Reworded the heading to match the actual resources.
- The Kubernetes 1.24 note was imprecise. Kubernetes 1.24 stopped auto-generating service account token Secrets; it did not introduce a new “create a long-lived token” workflow. Reworded the note to reflect the actual behavior change.
- The `KUBE_SERVER` description called the endpoint a cluster API URL, but the example value is specifically Rancher’s cluster proxy URL. Clarified the variable description.
- The GitLab CI example used floating `docker:24` and `docker:24-dind` tags and omitted required Docker-in-Docker connection variables. Updated the example to pinned `docker:24.0.5-cli` and `docker:24.0.5-dind` images, added `DOCKER_HOST` and `DOCKER_TLS_CERTDIR`, and added a prerequisite for a privileged runner.
- The registry login command used the older `-p` form. Replaced it with `--password-stdin`, matching current GitLab guidance.
- The deploy job used deprecated `only` syntax. Replaced it with `rules`.
- The description said “GitOps-style delivery”, but the tutorial implements a push-based CI deployment with `kubectl`, not a GitOps pull-based reconciliation flow. Reworded this to “continuous delivery”.

## Review Notes
- The static `kubernetes.io/service-account-token` Secret pattern remains supported, but current Kubernetes guidance prefers short-lived tokens from `kubectl create token` when an expiring token is acceptable.
- The deploy example still uses `--insecure-skip-tls-verify=true` and `bitnami/kubectl:latest`. Those choices are workable for an example, but production pipelines should prefer a trusted CA bundle and a pinned `kubectl` image version matched to the cluster.
