# Validation Summary: How to Integrate GitLab CI/CD with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- GitLab CI/CD
- GitLab Runner
- Docker-in-Docker
- Helm

## Sources Consulted
- GitLab Runner Helm chart: https://docs.gitlab.com/runner/install/kubernetes/
- GitLab runner creation workflow migration: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab runner token overview: https://docs.gitlab.com/security/tokens/
- GitLab CI/CD Docker build with Kubernetes executor: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab deprecated CI/CD keywords: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab `rules` reference: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab CI/CD variables: https://docs.gitlab.com/ci/variables/
- Rancher kubeconfig workflow: https://ranchermanager.docs.rancher.com/v2.12/api/workflows/kubeconfigs
- Rancher kubectl / kubeconfig usage: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cli-with-rancher/kubectl-utility
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Kubernetes `kubectl set image`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes `kubectl rollout status`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl annotate`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy
- Helm `upgrade` command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The post used GitLab Runner registration tokens and `runnerRegistrationToken`, which are deprecated and can be disabled by default in GitLab 17.0+. I updated the installation step to use the current runner creation workflow and `runnerToken`.
- The runner setup implied the old token flow without accounting for current runner attributes being created in the UI. I clarified that the runner should be created in GitLab first and configured to run untagged so the untagged example jobs can be picked up.
- The Rancher kubeconfig example used an older v3 API action instead of a documented current workflow. I replaced it with the Rancher UI kubeconfig download flow and a local base64 encoding step.
- The Docker build job used an incomplete Docker-in-Docker example for the Kubernetes executor. I updated it to the documented `docker:24.0.5-cli` / `docker:24.0.5-dind` pattern and added the required `DOCKER_HOST`, `DOCKER_TLS_CERTDIR`, and health check settings.
- The pipeline used deprecated `only` clauses. I replaced them with current `workflow: rules` and job `rules`.
- The Helm example had a broken shell continuation because `--atomic \` was followed by an inline comment on the same line. I removed the invalid inline comment placement so the command is syntactically correct.
- The multi-cluster section claimed to use a matrix, but the snippet actually used a reusable YAML template. I corrected the description to match the implementation.
- The “Notify Rancher on Deployment” step posted to `/v3/clusters/<cluster-id>/clusterregistrationtokens`, which is for cluster registration tokens and not deployment status reporting. I replaced that section with a valid Kubernetes annotation example that Rancher can reflect because it manages the underlying cluster resources.
- The conclusion claimed the setup provides full audit trails in Rancher, which is broader than what the shown configuration guarantees. I narrowed the wording to match the behavior actually demonstrated.

## Review Notes
- GitLab currently recommends file-type CI/CD variables for tools like `kubectl`; the post still uses base64-encoded variables, which is technically workable but not the cleanest option.
- `kubectl` should stay within one minor version of the cluster control plane. The example now uses `1.34` with a note to match the cluster minor version.
- Rancher kubeconfig behavior depends on Rancher token settings. If kubeconfig token generation is disabled, the kubeconfig can require the Rancher CLI at runtime.
