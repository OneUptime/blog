# Validation Summary: How to Use kubectl create token for ServiceAccount Token Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- kubectl
- Kubernetes TokenRequest API
- Kubernetes RBAC
- Kubernetes Python client
- Bash
- JWT bearer tokens

## Sources Consulted
- Kubernetes kubectl reference: `kubectl create token` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes ServiceAccounts concept documentation - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Managing ServiceAccounts documentation - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes kube-apiserver reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Official Kubernetes Python client repository - https://github.com/kubernetes-client/python

## Issues Found
- The post said the default `kubectl create token` expiration is one hour. Official `kubectl create token` documentation says that if `--duration` is unset or zero, the server determines the lifetime automatically and may return a shorter or longer lifetime. Updated the wording to avoid promising a fixed default for this command.
- The post said most clusters allow tokens up to 24 hours by default. The official kube-apiserver reference documents `--service-account-max-token-expiration` as the configurable maximum, and the kubectl docs note that the server may adjust the requested lifetime. Replaced the unsupported generalization with a cluster-configuration caveat.
- The JWT troubleshooting command used `base64 -d` directly on the JWT payload segment. JWTs use base64url encoding and commonly omit padding, so that command is unreliable. Updated the example to translate base64url characters and add padding before decoding.
- The Python Kubernetes client example placed `Bearer` inside `configuration.api_key`. Updated it to set the token in `api_key` and `Bearer` in `api_key_prefix`, matching the generated client authentication pattern.

## Review Notes
The CI/CD example assumes the pipeline already has Kubernetes credentials with permission to create ServiceAccount tokens. That is operationally important, but the commands themselves are valid.
