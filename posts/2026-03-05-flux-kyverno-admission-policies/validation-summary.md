# Validation Summary: How to Configure Flux with Kyverno Admission Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes
- Kyverno ClusterPolicy resources
- Kyverno validation and mutation policies
- Kyverno PolicyReport resources

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno installation customization documentation: https://kyverno.io/docs/installation/customization/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno match and exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno disallow privileged containers policy: https://kyverno.io/policies/pod-security/baseline/disallow-privileged-containers/disallow-privileged-containers/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kyverno Helm chart repository and values: https://kyverno.github.io/kyverno/

## Issues Found
- The Flux HelmRelease example placed the HelmRelease in the `kyverno` namespace while relying on `install.createNamespace: true`. Flux can create the Helm release target namespace, but the HelmRelease object itself must be created in an existing namespace. Changed the HelmRelease namespace to `flux-system` and added `targetNamespace: kyverno`.
- The Kyverno Helm values used `replicaCount: 3`, which is not the documented v3 chart HA value. Replaced it with controller-specific replica settings for `admissionController`, `backgroundController`, `cleanupController`, and `reportsController`.
- The Kyverno Helm `config.webhooks` value was shaped as a list. The chart documents `config.webhooks.namespaceSelector` as an object. Updated the snippet accordingly.
- Validation policies used the deprecated top-level `spec.validationFailureAction`. Moved enforcement settings to `validate.failureAction: Enforce` and updated the best-practice note to recommend `failureAction: Audit`.
- Namespace exclusions were expressed as negated entries in `match.resources.namespaces`. Replaced these with explicit `exclude.any.resources.namespaces` blocks, matching Kyverno's documented match/exclude structure.
- The resource limits policy claimed to require CPU and memory limits but only checked `limits.memory`. Added `limits.cpu`.
- The image registry policy used a single string with `|` to express allowed registries, which is not the documented Kyverno pattern approach. Replaced it with `foreach` and `anyPattern` checks for init containers and regular containers.
- The privileged container policy required `securityContext.privileged: false`, which would reject containers where the field was unset even though unset is non-privileged. Updated it to use optional anchors and added ephemeral container coverage, matching Kyverno's published policy pattern.
- The Flux `dependsOn` comment implied a direct dependency on the HelmRelease. Flux `dependsOn` refers to Kustomization objects, so the comment now clarifies that it waits for the Flux Kustomization that installs Kyverno.

## Review Notes
The post remains based on Kyverno `ClusterPolicy`. Kyverno's current documentation also includes newer CEL-based policy types such as `ValidatingPolicy`, but `ClusterPolicy` remains documented and usable. The article could mention exact Kyverno chart versions in the future to avoid behavior changing under the broad `3.x` chart constraint.
