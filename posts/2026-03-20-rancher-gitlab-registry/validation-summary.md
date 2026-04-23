# Validation Summary: How to Configure GitLab Container Registry with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab Container Registry
- GitLab CI/CD
- GitLab deploy tokens and personal access tokens
- Kubernetes
- `kubectl`
- Rancher Fleet

## Sources Consulted
- GitLab deploy tokens: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab container registry authentication: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab build and push container images: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab container registry administration: https://docs.gitlab.com/administration/packages/container_registry/
- GitLab Projects API: https://docs.gitlab.com/api/projects/
- GitLab reduce container registry storage: https://docs.gitlab.com/user/packages/container_registry/reduce_container_registry_storage/
- GitLab container registry naming convention: https://docs.gitlab.com/user/packages/container_registry/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- Kubernetes `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes images and `imagePullSecrets`: https://kubernetes.io/docs/concepts/containers/images/
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml

## Issues Found
- The post used the deploy token name as the Docker registry username in multiple commands. I changed those examples to use `<deploy-token-username>` and `<group-deploy-token-username>` because GitLab deploy tokens have a separate username value, which is generated automatically unless you set a custom one.
- The automated secret-creation example used `CI_DEPLOY_USER` and `CI_DEPLOY_PASSWORD` without the required `gitlab-deploy-token` setup. I changed that example to use explicit masked CI/CD variables (`GITLAB_REGISTRY_USER` and `GITLAB_REGISTRY_PASSWORD`) so the workflow works for ordinary deploy tokens as written.
- The cleanup policy API example used the wrong request attribute (`container_expiration_policy`). I changed it to `container_expiration_policy_attributes` and added `name_regex_delete`, which matches the current GitLab Projects API and cleanup-policy documentation.
- The registry login examples used token-name-based usernames and older password flag usage. I updated the relevant commands to use the saved deploy-token username and `--password-stdin`, which matches current GitLab authentication guidance.
- The post assumed the GitLab CI build example could be used without mentioning its runner requirement. I added the missing prerequisite that the sample Docker-in-Docker job needs a GitLab Runner configured for DinD.
- The image-format comment in the Deployment example was too GitLab.com-specific. I updated it to the generic GitLab container registry format used by both GitLab.com and self-managed instances.

## Review Notes
- The Fleet example is syntactically valid, but the `helm.values.image` and `helm.values.imagePullSecrets` keys are chart-specific. They work only if the referenced chart exposes those values.
- The Deployment manifest still uses `latest`, which is valid but less reproducible than a commit-specific or release tag. The CI deploy job already updates the Deployment to the commit-tagged image, which is the stronger pattern operationally.
