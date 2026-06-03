# Validation Summary: How to Use ServiceAccount Tokens for Kubernetes API Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes ServiceAccount tokens and TokenRequest API
- Kubernetes RBAC
- kubectl
- Kubernetes TokenReview API
- Kubernetes Go client-go
- Kubernetes Python client
- curl and bearer token API requests

## Sources Consulted
- Kubernetes documentation: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Authenticating - https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes kubectl reference: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes client-go rest package documentation - https://pkg.go.dev/k8s.io/client-go/rest
- Kubernetes Python client documentation - https://kubernetes-client.github.io/python/
- Kubernetes Python client repository - https://github.com/kubernetes-client/python

## Issues Found
- The first Go example imported `io/ioutil` but did not use it. Removed the unused import so the snippet compiles.
- The token refresh Go example used `metav1.ListOptions{}` without importing `k8s.io/apimachinery/pkg/apis/meta/v1`. Added the missing import.
- The JWT decoding command used plain `base64 -d`, which is not reliable for JWT base64url payloads. Replaced it with a `jq` command that handles base64url character translation before decoding.
- The TokenReview example did not request output and included a metadata name that is unnecessary for this special non-persisted API object. Changed it to `kubectl create -o yaml -f -` and removed the metadata block, matching the Kubernetes documentation pattern.
- The post described all `kubectl create token` tokens as bound tokens. Updated the wording to clarify that `kubectl create token` uses the TokenRequest API for time-limited ServiceAccount tokens, and object binding is available with `--bound-object-*` flags.
- The security best-practice wording implied all bound tokens are tied to pods. Updated it to distinguish projected pod tokens from other TokenRequest tokens.

## Review Notes
The examples assume the relevant ServiceAccount has RBAC permissions to list pods. `kubectl` was not installed in the local environment, so CLI details were verified against the official Kubernetes kubectl reference rather than local `--help` output.
