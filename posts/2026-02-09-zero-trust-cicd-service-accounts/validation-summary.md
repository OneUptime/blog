# Validation Summary: How to Use Zero-Trust CI/CD by Restricting Pipeline Service Account Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ServiceAccounts and TokenRequest API
- Kubernetes audit policies
- Kubernetes NetworkPolicy
- GitHub Actions OIDC
- Amazon EKS access entries and AWS IAM roles
- OPA Gatekeeper
- Conftest and Rego

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes service account documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- AWS CLI `eks create-access-entry` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-access-entry.html
- AWS CLI `eks update-kubeconfig` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates
- Conftest documentation: https://www.conftest.dev/

## Issues Found
- The RBAC Role used `resourceNames` together with the top-level `create` verb for Deployments. Kubernetes RBAC cannot restrict top-level create requests by resource name, so the example would not authorize creation as written. Removed `create`, `list`, and `watch` from that resource-specific Deployment rule and kept `get`, `update`, and `patch`.
- The workload identity example incorrectly implied that GitHub Actions OIDC could be represented by Kubernetes service account annotations, and then used `kubectl --as` without granting impersonation permissions. Replaced this with an EKS access-entry flow that maps the IAM role to a Kubernetes group bound to the scoped Role, and removed `--as` from the deployment command.
- The Gatekeeper `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a structural OpenAPI schema. Added `validation.openAPIV3Schema.type: object`.
- The just-in-time deployment command omitted the namespace while the examples scope the Deployment to `myapp-production`. Added `-n myapp-production`.
- The Kubernetes audit policy used a wildcard-like username (`system:serviceaccount:*:*-deployer`), but audit policy `users` entries are explicit user names rather than glob patterns. Replaced it with another explicit service account example.
- The audit log `jq` command ended with a dangling shell pipe and used the singular resource name `deployment`; Kubernetes audit `objectRef.resource` uses the plural resource name. Removed the dangling pipe and changed the selector to `deployments`.
- The NetworkPolicy example tried to allow API server egress via a `kube-system` namespace selector and registry access via a same-namespace pod selector. Replaced these with `ipBlock` placeholders so the example matches Kubernetes NetworkPolicy semantics for endpoint/CIDR-based egress.
- The service account token rotation section described deleting token Secrets and relying on Kubernetes to automatically create replacements. Modern Kubernetes no longer automatically creates long-lived service account token Secrets. Replaced the section with short-lived token issuance using `kubectl create token --duration=10m` and added a note that long-lived token Secrets are not recommended.

## Review Notes
The Conftest example uses pre-Rego-v1 rule syntax and pins Conftest v0.48.0, where that style is appropriate. For newer Conftest or OPA versions, the policy can be migrated to Rego v1 syntax such as `deny contains msg if { ... }`.
