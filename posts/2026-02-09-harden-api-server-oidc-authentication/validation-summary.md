# Validation Summary: How to Harden the Kubernetes API Server with OIDC Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server authentication
- OpenID Connect (OIDC)
- Kubernetes RBAC
- kubectl exec credential plugins
- kubelogin / oidc-login
- Google OAuth / Google Workspace
- Microsoft Entra ID / Azure AD
- Microsoft Graph Conditional Access policies
- Keycloak
- Kubernetes audit logging
- Kubernetes API server metrics

## Sources Consulted
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes kube-apiserver flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Client Authentication v1 ExecCredential API: https://kubernetes.io/docs/reference/config-api/client-authentication.v1/
- Kubernetes kubectl config set-credentials reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-credentials/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Microsoft Azure CLI az ad app documentation: https://learn.microsoft.com/en-us/cli/azure/ad/app
- Microsoft Graph create conditionalAccessPolicy documentation: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-policies
- Microsoft Entra Conditional Access overview and grant controls: https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview and https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant

## Issues Found
- The opening described Kubernetes service account tokens as "basic authentication" and implied all service account tokens lack short-lived-token behavior. Changed this to "bearer-token authentication" and scoped the risk to long-lived or shared service account tokens.
- The Google OIDC API server example set `--oidc-groups-prefix=google:` and the RBAC example used `google:admin@example.com`, but the username claim was not prefixed. Added `--oidc-username-prefix=google:` so the RBAC username matches the configured authenticator output.
- The Google example assumed a `groups` claim is always present. Added a note that group flags should only be set when the identity provider includes a groups claim in ID tokens.
- The kubectl exec credential example used `client.authentication.k8s.io/v1beta1`. Updated it to the stable `client.authentication.k8s.io/v1` API and added the required `--exec-interactive-mode=IfAvailable`.
- The `--oidc-signing-algs` comment said "Sign token requests", but the flag configures accepted JWT signing algorithms. Updated the comment.
- The Azure Conditional Access example used `az ad conditional-access policy create`, which is not a current Azure CLI command. Replaced it with an `az rest` call to the Microsoft Graph Conditional Access policy API.
- The token validation section included nonexistent kube-apiserver flags `--oidc-insecure-skip-verify` and `--oidc-max-token-expiration`. Removed those flags and replaced the expiry guidance with a note to require short-lived ID tokens in the identity provider policy.
- The monitoring PromQL used nonexistent metric names `apiserver_authentication_attempts_total`. Updated the examples to use Kubernetes metrics documented as `authentication_attempts` and `authenticated_user_requests`.
- The audit policy comment implied direct OIDC login events are audited as TokenReview resources. Reworded it to say it audits TokenReview requests.
- The troubleshooting section labeled an API discovery request as OIDC configuration verification. Changed the label to API server reachability.

## Review Notes
- The OIDC command-line flags are still supported, but current Kubernetes documentation also recommends `--authentication-config` for newer JWT authenticator capabilities such as multiple issuers and CEL-based claim validation.
- Provider-specific group claims vary. Google and Microsoft Entra deployments may need additional identity-provider configuration before the `groups` claim examples work.
