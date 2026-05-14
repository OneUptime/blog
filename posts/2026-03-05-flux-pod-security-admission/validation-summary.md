# Validation Summary: How to Configure Flux with Pod Security Admission

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Kubernetes namespace labels
- Flux CD Kustomization
- Flux CD HelmRelease
- Bitnami Redis Helm chart values
- kubectl
- jq

## Sources Consulted
- Kubernetes: Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes: Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Flux: Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux: Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux: HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux: Security documentation: https://fluxcd.io/flux/security/
- Bitnami Redis Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml

## Issues Found
- The development namespace example said "Baseline warnings only" but also configured `pod-security.kubernetes.io/enforce: baseline` and `audit: restricted`. I removed the unintended enforce label and updated the comment to match the remaining warn and audit labels.
- The Step 3 explanation said all workloads in PSA-enforced namespaces must comply with Restricted. This is only true for namespaces enforcing the Restricted profile, not namespaces enforcing Baseline. I changed the sentence to "Restricted-enforced namespaces."
- The Bitnami Redis Helm values placed `runAsNonRoot`, `runAsUser`, and `seccompProfile` under `master.podSecurityContext`. The chart documents these under `master.containerSecurityContext`, while pod security context mainly covers fields such as `fsGroup`. I moved those values to `containerSecurityContext`.

## Review Notes
- The Kubernetes API versions and Flux `Kustomization` / `HelmRelease` API versions used in the examples are current.
- The workspace does not have local `kubectl` or `flux` binaries installed, so command validation was done against official documentation rather than local `--help` output.
- The examples pin PSA profile versions to Kubernetes `v1.28`. That is valid, but future readers should align pinned versions with the Kubernetes minor versions they operate.
