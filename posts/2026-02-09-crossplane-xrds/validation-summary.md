# Validation Summary: How to Implement Crossplane CompositeResourceDefinitions (XRDs)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 schemas
- Crossplane CompositeResourceDefinitions
- Crossplane Composite Resources and Claims
- Crossplane Compositions
- kubectl

## Sources Consulted
- Crossplane v2.3 Composite Resource Definitions: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane v1.20 Composite Resource Definitions: https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane v2 What's New: https://docs.crossplane.io/latest/whats-new/
- Crossplane Composite Resources: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane v2 Upgrade Guide: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/access-kubernetes-api/extend-api-custom-resource-definitions/

## Issues Found
- The post stated that XRDs create both XRs and Claims as an absolute rule. Updated the wording to clarify that this is true when `claimNames` is specified in the v1-style `LegacyCluster` model, while Crossplane v2 namespaced and cluster-scoped XRs do not use claims.
- The status schema defined `status.conditions`. Crossplane reserves and manages `status.conditions`, so the field was removed from the custom schema example and the text now warns not to define it.
- The connection secret schema defined `spec.writeConnectionSecretToRef`. Crossplane reserves that field in v1-style XRD schemas, so the example now shows only custom parameters and explains that Crossplane manages `writeConnectionSecretToRef`.
- The multi-version XRD example changed the schema shape between versions in a breaking way. Updated the newer version to preserve the existing `size` field and added a note that breaking schema changes require conversion.
- The composition selection example defined `compositionSelector` as a custom schema field. Updated it to keep the schema to user parameters and explain that composition selection is a built-in XR or claim field.
- The final verification command used the singular resource name `xpostgresqlinstance`. Changed it to the plural `xpostgresqlinstances`, which matches the XRD's declared resource name.

## Review Notes
The examples intentionally retain the v1-style claim model because claims are central to the article. Crossplane v2 remains backward compatible with this legacy model, but new v2 designs should consider namespaced XRs without claims.
