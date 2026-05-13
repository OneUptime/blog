# Validation Summary: How to Create Crossplane CompositeResourceDefinitions with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane CompositeResourceDefinitions
- Crossplane composite resources
- Flux CD Kustomizations
- Kubernetes CustomResourceDefinitions
- Kustomize
- OpenAPI v3 schema validation
- kubectl

## Sources Consulted
- Crossplane Composite Resource Definitions documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane API reference for CompositeResourceDefinition v1 and v2: https://docs.crossplane.io/latest/api/
- Crossplane v2 changes and namespaced XR behavior: https://docs.crossplane.io/latest/whats-new/
- Crossplane connection details documentation: https://docs.crossplane.io/v2.0/guides/connection-details-composition/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The XRD examples used `apiextensions.crossplane.io/v1`, which is deprecated in current Crossplane. Updated both examples to `apiextensions.crossplane.io/v2`.
- The post described namespace-scoped claims and included `claimNames`, but Crossplane v2 XRDs do not support claims. Updated the explanation to use namespaced composite resources, removed `claimNames`, and added `scope: Namespaced` to both XRD examples.
- The verification command checked for a claim CRD (`storagebuckets.platform.example.com`). Updated it to verify the composite resource CRD (`xstoragebuckets.platform.example.com`).
- The connection secret guidance said keys are propagated to the claim namespace. Updated it to describe limiting keys included in composite resource connection details.
- The multi-version XRD example added new required fields in `v1beta1`, which Crossplane documents as a breaking schema change. Removed the new `required` entries from `v1beta1` so the example aligns with the stated backward compatibility goal.

## Review Notes
- Flux `Kustomization` fields including `apiVersion`, `interval`, `path`, `prune`, `sourceRef`, and `dependsOn` match current Flux documentation.
- The YAML snippets were syntax-checked after edits.
