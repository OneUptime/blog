# Validation Summary: How to Configure Security Context for Flux Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments
- Kubernetes security contexts
- Kustomize patches
- kubectl
- jq
- RBAC and service accounts

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux Installation Documentation: https://fluxcd.io/flux/installation/
- Flux CLI `flux install` Documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux latest generated install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes Security Context Documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Seccomp Documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes seccomp tutorial for `RuntimeDefault`: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes `kubectl auth can-i` Documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Flux Kustomization patches Documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The prerequisite Kubernetes version was too specific for an open-ended "Flux CLI v2.0 or later" requirement. Current Flux documentation defines supported Kubernetes versions by Flux release, so the prerequisite now says to use a Kubernetes version supported by the installed Flux release.
- The examples used `fsGroup: 65534`, but Flux's security documentation and generated manifests use `fsGroup: 1337` while the controller user and group ID are `65534`. Updated examples to use `fsGroup: 1337` and `runAsGroup: 65534` where a pod-level user is specified.
- The Kustomize patches added extra `/tmp` volume mounts named `tmp` to kustomize-controller, helm-controller, and notification-controller. Current Flux manifests already mount `/tmp` as `temp`, so adding another mount at the same path can make the Deployment invalid. Removed the unnecessary volume and volumeMount additions from the security-context patch examples.
- The verification step described a `kubectl auth can-i` RBAC check as proving "No privilege escalation is possible." That command checks Kubernetes RBAC authorization, not Linux privilege escalation. Reworded it to state the specific service-account permission being checked.
- The process identity example omitted the supplemental Flux filesystem group. Updated the expected `id` output to include group `1337`.
- The troubleshooting note incorrectly said `fsGroup` must match `runAsUser`. Kubernetes does not require this; `fsGroup` controls supplemental group ownership/access for volumes. Reworded the guidance and aligned the sample values with Flux defaults.

## Review Notes
Current Flux controller manifests already conform to the Kubernetes Restricted Pod Security Standard, including dropped capabilities, read-only root filesystems, `RuntimeDefault` seccomp, non-root execution, and `fsGroup: 1337`. The guide remains useful for auditing or overriding existing installations, but future revisions should make clear that recent Flux installs usually already include these hardening settings.
