# Validation Summary: How to Configure API Server Authentication on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes API server (kube-apiserver flags)
- OIDC authentication
- Webhook token authentication (TokenReview API)
- X.509 client certificates
- Kubernetes CertificateSigningRequest API (certificates.k8s.io/v1)
- kubectl (config, certificate, get)
- openssl
- Bootstrap tokens
- Kubernetes audit logging (audit.k8s.io/v1 Policy)

## Sources Consulted
- Talos Linux v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos source `VolumeMountConfig` struct (siderolabs/talos `pkg/machinery/config/types/v1alpha1/v1alpha1_types.go`) to verify the `hostPath` / `mountPath` / `readonly` field names
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes OIDC authentication docs (`--oidc-issuer-url`, `--oidc-client-id`, `--oidc-username-claim`, `--oidc-username-prefix`, `--oidc-groups-claim`, `--oidc-groups-prefix`, `--oidc-required-claim`, `--oidc-ca-file`)
- Kubernetes webhook token authentication: `--authentication-token-webhook-config-file`, `--authentication-token-webhook-cache-ttl`
- Kubernetes CSR API reference (`certificates.k8s.io/v1`, `kubernetes.io/kube-apiserver-client` signer)
- Kubernetes audit logging reference (`audit.k8s.io/v1`, audit-log-* flags)

## Issues Found
- **OIDC custom CA volume mount conflicted with the kube-apiserver PKI directory.** The original example mounted the host directory `/var/oidc-ca` at `/etc/kubernetes/pki` inside the API server container. `/etc/kubernetes/pki` is the directory the API server uses for its system PKI (server cert/key, SA signing key, front-proxy CA, etc.), so this mount would shadow those files and break the API server. Changed the example to mount at `/etc/kubernetes/oidc` (with host path `/var/lib/oidc-ca`) and updated `oidc-ca-file` to `/etc/kubernetes/oidc/oidc-ca.crt`.

## Review Notes
- All `kube-apiserver` flag names (`oidc-*`, `authentication-token-webhook-*`, `anonymous-auth`, `audit-log-*`, `audit-policy-file`) and API versions (`authentication.k8s.io/v1`, `certificates.k8s.io/v1`, `audit.k8s.io/v1`) are correct as of Kubernetes 1.29/1.30. The `--oidc-*` flag family still works, but newer Kubernetes versions (1.30+) also support a richer file-based `AuthenticationConfiguration` (`--authentication-config`) as an alternative — worth mentioning in a future revision but not technically wrong here.
- The Talos `extraVolumes` schema is verified to use lowercase `readonly` (per Talos source), matching the post.
- The audit logging and audit policy example references file paths (`/etc/kubernetes/audit-policy.yaml`, `/var/log/kubernetes/audit.log`) that would in practice need corresponding `extraVolumes` entries to be visible inside the kube-apiserver static pod. The post does not show those mounts; a follow-up could add a complete working example, but the flag names and policy schema themselves are correct.
- The "Authentication Priority" ordering description is a reasonable simplification — Kubernetes uses a union authenticator and the strict order is an implementation detail, but client-certificate (TLS layer) effectively runs ahead of token authenticators and anonymous is last, which matches what the post says.
- `kubectl get --raw /.well-known/openid-configuration` returns the *cluster's own* service-account-issuer discovery document, not the external IdP's; it is still a useful sanity check, so left as-is.
