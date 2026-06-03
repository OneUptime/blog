# Validation Summary: How to Build RBAC Roles for CI/CD Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ServiceAccounts and service account token Secrets
- kubectl configuration, apply, rollout, and auth commands
- Helm release permissions
- Argo CD / GitOps RBAC patterns
- GitHub Actions deployment workflows
- jq audit-log filtering

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount token task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl config set-cluster documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/
- kubectl config use-context documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- kubectl apply documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl rollout status documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl auth can-i documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Helm RBAC documentation: https://helm.sh/docs/topics/rbac/
- Helm changes since Helm 2 / Helm 3 storage documentation: https://helm.sh/docs/faq/changes_since_helm2/
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/security-for-github-actions/security-guides/about-secrets
- GitHub Marketplace documentation for actions/checkout: https://github.com/marketplace/actions/checkout

## Issues Found
- `kubectl rollout status` watches rollout status by default, but the deployment roles did not grant `watch` on Deployments. Added `watch` to the Deployment permissions in the production, staging, Helm, and GitHub Actions RBAC examples.
- The production, staging, and GitHub Actions examples implied that CI/CD needs broad Secret read access because Deployments reference Secrets. Kubernetes does not require a deployer to read a Secret merely to create or update a Deployment that references it. Removed broad Secret read permissions from those minimal RBAC examples and updated the permission test to expect `no` for generic Secret access unless explicitly granted.
- The GitHub Actions workflow used `actions/checkout@v3`, decoded `KUBE_TOKEN` as base64, disabled TLS verification, and created a context without switching to it. Updated the workflow to use current `actions/checkout@v6`, consume the token as the raw secret value produced by the rotation example, configure a certificate authority instead of `--insecure-skip-tls-verify=true`, and run `kubectl config use-context production`.
- The credential rotation example deleted both the old token Secret and the newly created replacement token Secret after updating CI/CD, which would invalidate the rotated credential. Removed deletion of the new token Secret.
- Removing the GitHub Actions Secret permission initially left the RoleBinding in the same YAML document as the Role. Restored the `---` YAML document separator.

## Review Notes
Kubernetes still supports manually created long-lived `kubernetes.io/service-account-token` Secrets, but the official documentation recommends TokenRequest-based short-lived service account tokens when possible. The post remains valid because it explicitly covers long-lived CI/CD tokens, but a future update could add short-lived or OIDC-based CI/CD authentication patterns.
