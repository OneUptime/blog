# Validation Summary: How to Set Up OIDC Authentication on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes API server authentication
- OpenID Connect (OIDC)
- Keycloak
- kubelogin / kubectl oidc-login
- Kubernetes RBAC
- Kubernetes audit logging

## Sources Consulted
- Kubernetes Authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes kube-apiserver CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubeconfig v1 ExecConfig reference: https://kubernetes.io/docs/reference/config-api/kubeconfig.v1
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Talos Linux configuration patching documentation: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- kubelogin README and usage documentation: https://github.com/int128/kubelogin and https://github.com/int128/kubelogin/blob/master/docs/usage.md
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- OpenID Connect Core 1.0 specification: https://openid.net/specs/openid-connect-core-1_0.html

## Issues Found
- Updated Keycloak client setup terminology from the older `Client Protocol` / `Access Type` fields to the current `Client type: OpenID Connect` and `Client authentication: On` terminology.
- Updated the kubelogin redirect URI examples to match kubelogin's documented default local callback ports: `http://localhost:8000` and `http://localhost:18000`.
- Replaced `kubectl get --raw /healthz` with `kubectl get --raw /readyz` because Kubernetes has deprecated `/healthz` since v1.16.
- Updated the kubeconfig exec credential API from `client.authentication.k8s.io/v1beta1` to stable `client.authentication.k8s.io/v1` and added the required `interactiveMode` field.
- Replaced the manual `kubectl oidc-login get-token | jq ...` JWT decoding example with `kubectl oidc-login setup`, which is the documented kubelogin command for printing ID token claims.
- Corrected token lifetime wording from access token lifetime to ID token lifetime, because kubelogin uses the ID token for Kubernetes authentication unless explicitly configured otherwise.
- Added Kubernetes `AuthenticationConfiguration` as a current direct multi-issuer option for Kubernetes v1.34 and newer.
- Removed the invalid `talosctl ping` troubleshooting command and replaced it with an API server log check for DNS, TLS, and OIDC discovery errors.
- Replaced the audit logging snippet with Talos' `cluster.apiServer.auditPolicy` configuration, since Kubernetes auditing requires an audit policy and Talos exposes a native machine configuration field for it.

## Review Notes
The core approach is technically valid: Talos can pass OIDC flags to kube-apiserver through `cluster.apiServer.extraArgs`, Kubernetes RBAC can bind OIDC groups using the configured group prefix, and kubelogin is an appropriate exec credential plugin for kubectl OIDC authentication. For production use, administrators should verify exact Keycloak scope mapper settings and token lifetimes against their Keycloak version and organization policy.
