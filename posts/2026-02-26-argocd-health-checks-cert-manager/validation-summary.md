# Validation Summary: How to Configure Health Checks for Cert-Manager Certificates in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource health checks
- Lua health scripts
- Kubernetes ConfigMaps and kubectl
- cert-manager Certificate, Issuer, ClusterIssuer, CertificateRequest, Order, and Challenge resources
- ACME certificate issuance

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD bundled cert-manager Certificate health check: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/cert-manager.io/Certificate/health.lua
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The introduction overstated that Argo CD always shows cert-manager resources as healthy without custom checks. Updated it to account for built-in and custom health checks.
- The post claimed coverage for all cert-manager resource types. Updated the wording to "common" resource types because the post covers the main certificate issuance resources, not every cert-manager-related API.
- The Certificate explanation said conditions indicate expiry. cert-manager exposes expiry through status fields such as `notAfter`, while Certificate conditions are `Ready` and `Issuing`. Updated the wording.
- The Certificate health check evaluated `Ready` before `Issuing`. Updated it to check `Issuing=True` first, matching the upstream Argo CD behavior so active issuance or renewal is shown as Progressing.
- The CertificateRequest health check treated denial as a `Ready` reason. cert-manager uses `Denied` and `InvalidRequest` as condition types. Updated the script to check those condition types before `Ready`.
- The ACME Order health check marked `ready` as Healthy. cert-manager documents `ready` as a transient state before finalization, so it now reports Progressing.
- The ACME Order and Challenge health checks did not handle the documented `expired` state. Added Degraded handling for `expired`.
- The complete ConfigMap example repeated the Certificate `Ready`-first issue. Updated it to check `Issuing=True` first.

## Review Notes
The local workspace does not have `kubectl`, `argocd`, or a Lua interpreter installed, so CLI and Lua behavior were verified against official documentation and upstream Argo CD source rather than local command execution.
