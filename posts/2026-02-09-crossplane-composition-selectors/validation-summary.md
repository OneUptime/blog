# Validation Summary: How to Use Crossplane Composition Selectors for Multi-Provider

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Crossplane
- Kubernetes custom resources
- CompositeResourceDefinitions
- Composite resource claims
- Crossplane Compositions and composition selectors
- Upbound AWS and GCP provider managed resources
- kubectl

## Sources Consulted
- Crossplane v2.3 Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane v2.3 Composite Resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane v2.3 API Reference: https://docs.crossplane.io/latest/api/
- Crossplane v1.20 Composite Resources documentation: https://docs.crossplane.io/v1.20/concepts/composite-resources/
- Crossplane v1.20 Composite Resource Definitions documentation: https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane v1.20 Claims documentation: https://docs.crossplane.io/v1.20/concepts/claims/
- Crossplane v2 upgrade guide: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/

## Issues Found
- The post implied the examples were current without a version caveat. The examples use Crossplane v1.20-style claims and native `spec.resources` Composition syntax, while current Crossplane v2 guidance prefers namespaced composite resources and function pipelines. Added a concise caveat so readers understand the version context.
- The post said Crossplane selects the "first" composition that matches. Official docs describe label-based selection but do not guarantee a first-match ordering. Changed this to say Crossplane selects a composition satisfying the requirements.
- The default composition example used a `crossplane.io/default: "true"` label. Official Crossplane documentation configures the default with `spec.defaultCompositionRef` on the XRD. Replaced the example with an XRD snippet using `defaultCompositionRef`.
- The "Dynamic Selection Based on Claim Parameters" section said to use composition revisions and patches to route based on parameters, but the example used a normal `compositionSelector`. Reworded the section to accurately state that the claim selector must be set to match the provider label.
- The observability section used Prometheus metric names that are not documented Crossplane metrics. Removed the unsupported Prometheus rule example and kept verified `kubectl` inspection commands.
- The commands queried `database app-database` directly, but claims create generated composite resources. Updated the commands to read the claim's `spec.resourceRef.name` and then inspect the generated composite resource.

## Review Notes
The remaining Composition examples use Crossplane v1 `Resources` mode style. Crossplane v1.20 supports this for compatibility, but Crossplane v2 removed native patch-and-transform composition and recommends `mode: Pipeline` with composition functions for new work.
