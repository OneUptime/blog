# Validation Summary: How to Authenticate OpenTofu with Vault Using Kubernetes Auth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault Kubernetes auth method
- Vault Agent Injector
- Kubernetes service accounts and RBAC
- Tekton TaskRun
- YAML and HCL configuration

## Sources Consulted
- Vault Kubernetes auth method docs: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault Kubernetes auth API docs: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- Vault provider documentation in the official provider repository: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/index.html.markdown
- Vault provider resource docs for Kubernetes auth config: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/kubernetes_auth_backend_config.md
- Vault provider resource docs for Kubernetes auth roles: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/kubernetes_auth_backend_role.html.md
- Kubernetes projected volumes docs: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes service accounts administration docs: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Tekton migration docs for `v1beta1` to `v1`: https://github.com/tektoncd/pipeline/blob/main/docs/migrating-v1beta1-to-v1.md
- Vault AWS secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/aws

## Issues Found
- The post used `auth_login_kubernetes` in the Vault provider examples, but the documented provider interface uses the generic `auth_login` block with `path = "auth/kubernetes/login"`. I replaced both provider snippets accordingly.
- The Vault Kubernetes auth config used `disable_iss_validation = true`, which is deprecated in current Vault Kubernetes auth documentation. I replaced that with `disable_local_ca_jwt = true` to match the documented pattern where Vault uses the login JWT for TokenReview.
- The service account example incorrectly put `vault.hashicorp.com/role` on the Kubernetes service account. That annotation is for pod annotations used by Vault Agent Injector, so I removed it from the service account example and kept the role annotation in the pod template example.
- The RBAC comment was incorrect about what `system:auth-delegator` is for. I corrected it to describe the actual TokenReview requirement when Vault uses the login JWT as the reviewer token.
- The Vault role set `audience = "vault"` while the main OpenTofu example used the default mounted service account token. Kubernetes defaults that token audience to the API server, so the examples were mismatched. I made the role audience conditional and tied it explicitly to the projected-token section.
- The Tekton example used deprecated `tekton.dev/v1beta1`. I updated it to `tekton.dev/v1` and corrected the note about `VAULT_TOKEN`.
- The Argo CD section showed an incomplete Deployment and used `security_token` in the Vault template. I made the Deployment snippet structurally valid and corrected the AWS credential field to `session_token`, which matches Vault’s documented AWS secrets output.
- The projected service account token example only declared a volume and did not mount it. I added the required `volumeMounts` context and updated the paired Vault provider example to use the corrected login syntax.

## Review Notes
- The README now uses `skip_child_token = true` in the Vault provider examples so the Kubernetes-authenticated token does not also need `auth/token/create`. If you want the provider’s default child-token behavior instead, the Vault token issued by the Kubernetes auth role must be allowed to create child tokens.
- The examples still use in-cluster `http://` Vault addresses for simplicity. Production deployments should normally use TLS.
