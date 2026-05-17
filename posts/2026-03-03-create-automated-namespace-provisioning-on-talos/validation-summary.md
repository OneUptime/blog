# Validation Summary: How to Create Automated Namespace Provisioning on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux / Kubernetes (namespace lifecycle, RBAC, ResourceQuota, LimitRange, NetworkPolicy)
- Pod Security Admission / Pod Security Standards labels
- Bash scripting (`kubectl` automation)
- Kustomize (overlays/base structure)
- Argo CD (`Application` CRD, automated sync policy)
- Capsule operator (`Tenant` CRD, multi-tenant namespace management)
- Self-service workflows via a custom `NamespaceRequest` CRD

## Sources Consulted
- Kubernetes Pod Security Admission docs — https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Namespaces (automatic `kubernetes.io/metadata.name` label, stable since 1.22) — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes NetworkPolicy reference — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota / LimitRange references
- Kustomize Kustomization reference — https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Argo CD declarative setup — https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Capsule operator (`capsule.clastix.io/v1beta2`) Tenant API — https://projectcapsule.dev/docs/reference/
- Bash manual — Parameter Expansion (`${var%pat}` vs `${var%%pat}`)

## Issues Found
- **Shell script: incorrect bash parameter expansion for stripping memory/CPU units.** The script used `${CPU_QUOTA%[^0-9]*}` and `${MEMORY_QUOTA%[^0-9]*}` with `%` (shortest-match suffix removal). Because the glob `[^0-9]*` is "one non-digit followed by any string", the shortest matching suffix of `"32Gi"` is just `"i"`, leaving `"32G"`. Feeding `32G` to `$(( ... * 2 ))` produces an arithmetic syntax error, and with `set -euo pipefail` the script aborts immediately for the default `MEMORY_QUOTA="32Gi"`. Changed both expansions to `%%[^0-9]*` (longest-match), which correctly strips the entire trailing unit (`"32Gi"` → `"32"`), letting the doubled limit be reconstructed as `"64Gi"`.

## Review Notes
- The RBAC step references `ClusterRole`s named `namespace-admin` and `namespace-developer`. These are not built-in Kubernetes roles (the built-in ones are `cluster-admin`, `admin`, `edit`, `view`); the post assumes the cluster operator has created them ahead of time. Not incorrect, but worth a one-line note in a future revision so readers don't expect them to exist by default.
- The `allow-dns` NetworkPolicy correctly uses the AND form (both `namespaceSelector` and `podSelector` under a single `to[]` entry) to restrict egress to kube-dns pods specifically in `kube-system` — this is the recommended pattern and relies on the automatic `kubernetes.io/metadata.name` namespace label (stable since 1.22).
- Capsule has been moving some features (e.g. `limitRanges`, `networkPolicies` propagation) toward "Tenant Replications" in newer releases, but the v1beta2 fields used here remain valid. Worth re-checking on future Capsule major upgrades.
- The example `NamespaceRequest` CRD under `platform.company.com/v1` is illustrative and clearly marked as a custom CRD pattern, so no validation concerns.
