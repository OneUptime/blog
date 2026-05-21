# Validation Summary: How to Use Istio with Kubernetes Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio workload identity
- Istio mutual TLS
- Istio AuthorizationPolicy
- Kubernetes ServiceAccount
- Kubernetes Deployment manifests
- istioctl and pilot-agent debugging commands
- Helm templating

## Sources Consulted
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Service Accounts concept documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Deployment examples omitted `spec.selector` and matching pod template labels. In `apps/v1`, Kubernetes requires an explicit selector and the selector must match `spec.template.metadata.labels`. Added matching `app` labels and selectors to the Deployment snippets and Helm template.
- The identity verification examples used `deploy/web-frontend` with `istioctl proxy-config secret`. The documented Istio form uses `deployment/<name>`, so the command was changed to `deployment/web-frontend`.
- The certificate inspection command read `/var/run/secrets/credential/cert-chain.pem` from the proxy container, which is not a reliable default path for Istio sidecar workload certificates. Replaced it with `istioctl proxy-config secret ... -o json` and decoding the default secret's inline certificate chain before passing it to `openssl`.

## Review Notes
- The AuthorizationPolicy examples use the current `security.istio.io/v1` API and valid `source.principals`, `source.namespaces`, HTTP methods, paths, and header conditions.
- The default-deny example is correct for an ALLOW policy with no rules applied to the namespace workloads.
- The `source.principals` examples assume the default `cluster.local` trust domain. Meshes with a custom trust domain should substitute that value.
