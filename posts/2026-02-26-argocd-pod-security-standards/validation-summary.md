# Validation Summary: How to Configure Pod Security Standards for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- Argo CD
- Argo CD Helm chart
- kubectl
- Helm
- jq

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Admission: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodSecurityPolicy migration guide: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes PodSecurityPolicy deprecation/removal documentation: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Argo CD installation manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD CLI `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/

## Issues Found
- The post said the Kubernetes Restricted Pod Security Standard enforces read-only root filesystems. Kubernetes Restricted does not require `readOnlyRootFilesystem`; it requires controls such as non-root execution, `allowPrivilegeEscalation: false`, explicit seccomp, and dropping all capabilities. Updated the Restricted description and conclusion.
- The Argo CD workload snippets looked like complete standalone manifests, but the examples omit required `apps/v1` fields such as selectors and pod template labels. Added a sentence clarifying that they are fields to merge into existing Argo CD workloads.
- The application controller example used `kind: Deployment`. Current upstream Argo CD manifests deploy `argocd-application-controller` as a `StatefulSet`, so the example was corrected.
- The PSP migration commands included `kubectl get psp` without a version caveat. PodSecurityPolicy was removed in Kubernetes 1.25, so the section now clarifies that those inspection commands apply on pre-1.25 clusters.

## Review Notes
- The Helm values keys used in the post (`global.securityContext`, `server.containerSecurityContext`, `controller.containerSecurityContext`, `repoServer.containerSecurityContext`, and `redis.containerSecurityContext`) match the current Argo CD Helm chart structure.
- The current upstream Argo CD manifests already include Restricted-compatible container security context settings for the core components. Existing installations may vary by Argo CD version and installation method.
- The `kubectl label --dry-run=server --overwrite namespace argocd pod-security.kubernetes.io/enforce=restricted` validation approach matches Kubernetes guidance for checking warnings before changing namespace enforcement.
