# Validation Summary: Kubernetes API Server Returns 401 Unauthorized: Trace Token Issuer, Audience, and Clock Skew

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes API server
- kubectl and kubeconfig
- JSON Web Tokens (JWT)
- OpenID Connect (OIDC) authentication and discovery
- Kubernetes ServiceAccount TokenRequest tokens
- Kubernetes audit logging and webhook authentication
- systemd time synchronization diagnostics

## Sources Consulted

- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Managing Service Accounts](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes: kubectl create token](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/)
- [Kubernetes: kube-apiserver command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes: kubeconfig (v1) API](https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [systemd: timedatectl manual source](https://github.com/systemd/systemd/blob/main/man/timedatectl.xml)

## Issues Found

- The kubeconfig discussion implied that `kubectl config view --minify` was categorically safe to share. Although raw credential and certificate data is redacted unless `--raw` is used, credential-plugin arguments or environment entries can contain sensitive values. The text now tells readers to inspect the output before sharing it.
- The issuer-discovery checklist named only `/.well-known/openid-configuration`, which could be read as a fixed host-root URL and did not account for structured authentication's `issuer.discoveryURL` override. It now refers to the configured discovery endpoint and explains the normal issuer-relative default.

## Review Notes

- Structured authentication is current and stable in Kubernetes v1.34 and later; it first appeared in v1.29. The statement that `--authentication-config` cannot be combined with `--oidc-*` flags matches current documentation.
- `kubectl create token`, `--duration`, and `--audience` are current. Requested token lifetime can be adjusted by the server, and omitting `--audience` requests a token for the Kubernetes API server.
- ServiceAccount audience defaults depend on API server configuration: when `--service-account-issuer` is set and `--api-audiences` is omitted, the accepted audience defaults to the issuer URL.
