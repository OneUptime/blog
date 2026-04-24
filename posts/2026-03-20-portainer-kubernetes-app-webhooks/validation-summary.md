# Validation Summary: How to Set Up Application Webhooks in Portainer for Kubernetes - App

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- Webhooks
- GitOps
- GitHub Actions
- GitLab CI/CD
- `curl`

## Sources Consulted
- Portainer Kubernetes application webhooks: https://docs.portainer.io/sts/user/kubernetes/applications/webhooks
- Portainer Kubernetes applications from Git / GitOps updates: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer API access tokens: https://docs.portainer.io/2.21/api/access
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes image pull behavior: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes patching Deployments: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- GitHub Actions workflow syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions secrets: https://docs.github.com/en/actions/concepts/security/about-secrets
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The post treated Kubernetes application webhooks like generic Portainer service/container webhooks. I corrected the setup flow to match Portainer's official Kubernetes application webhook behavior: the application must be Git-deployed, GitOps updates must be enabled, and `Webhook` must be selected as the update mechanism.
- The webhook URL path was incorrect. I changed the examples from `/api/webhooks/...` to `/api/stacks/webhooks/...`, which is the path shown in Portainer's Kubernetes webhook documentation.
- The webhook behavior explanation incorrectly said Portainer pulls the latest registry image tag and updates the Deployment directly. I corrected this to explain that the webhook triggers Portainer's GitOps update flow, applies detected Git changes, optionally reapplies the manifest when `Always apply manifest` is enabled, and supports `rollout-restart`.
- The deployment guidance around mutable tags was too broad. I updated the text to clarify that the webhook does not independently discover new image tags, and that mutable-tag workflows depend on appropriate Kubernetes pull policy plus a restart/redeploy.
- The "Use Portainer API for More Control" example used a full-object `PUT` built from `kubectl get ... | jq ...`, which is brittle and not the safest documented update pattern. I replaced it with a targeted Kubernetes `PATCH` request sent through Portainer's API gateway using `application/strategic-merge-patch+json`.
- One code block was labeled as `bash` even though it contained a GitHub Actions YAML step. I changed that fence to `yaml`.
- The webhook failure-handling example assumed an exact `HTTP 200` response. I updated it to accept any `2xx` response instead.

## Review Notes
- The corrected CI examples now use `?rollout-restart=all`, which aligns with Portainer's documented rolling restart option for Kubernetes application webhooks.
- If a team uses immutable image tags, their pipeline still needs to update the manifest in Git before triggering the webhook; otherwise Portainer will continue to apply the Git-defined image reference.
- Direct Kubernetes API changes made through Portainer can be overwritten later by GitOps reconciliation for Git-managed applications.
