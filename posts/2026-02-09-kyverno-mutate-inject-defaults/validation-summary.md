# Validation Summary: How to Implement Kyverno Mutate Policies to Inject Default Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy mutate rules
- Strategic merge patches
- RFC 6902 JSON Patch
- Kyverno foreach loops and preconditions
- Kubernetes PolicyReport resources
- Kyverno Prometheus metrics

## Sources Consulted
- Kyverno documentation: Mutate Rules - https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno documentation: Selecting Resources - https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno documentation: Preconditions - https://kyverno.io/docs/policy-types/cluster-policy/preconditions/
- Kyverno documentation: External Data Sources - https://kyverno.io/docs/policy-types/cluster-policy/external-data-sources/
- Kyverno documentation: Policy Reports - https://kyverno.io/docs/guides/reports/
- Kyverno documentation: Metrics - https://kyverno.io/docs/reference/metrics/
- Kyverno policy library: Prepend Image Registry - https://kyverno.io/policies/other/prepend-image-registry/prepend-image-registry/

## Issues Found
- The post described three mutation strategies by listing JSON patches and JSON Patch 6902 separately. Kyverno `ClusterPolicy` mutate rules document two patch formats: strategic merge patch and RFC 6902 JSON Patch. Updated the explanation accordingly.
- The first policy included a comment saying mutations only work on new or updated resources because `background: false` was set. Standard mutate rules are admission mutations for create/update requests, while mutate-existing behavior is separate background-controller functionality. Removed the misleading comment.
- The security context example used `+(capabilities)`, which would skip adding `drop` when a container already had a `capabilities` object. Changed it to add the missing `drop` field under `capabilities`.
- The resource limits example used `+(limits)` and `+(requests)`, which would skip missing CPU or memory defaults when the parent map already existed. Changed the example so individual `cpu` and `memory` fields are added if absent.
- The JSON Patch example used `operator: NotIn`, which is not a supported Kyverno precondition operator. Changed it to a per-container `foreach` precondition using `operator: NotEquals` with the existing `element.image` value.
- The monitoring section referred to PolicyReport commands as Kyverno metrics and described "mutation counts." Updated it to distinguish current policy report results from historical Prometheus metrics.

## Review Notes
Kyverno's current documentation marks the legacy `ClusterPolicy` documentation as deprecated in favor of newer CEL-based policy types such as `MutatingPolicy`, but the `kyverno.io/v1` `ClusterPolicy` mutate examples remain documented and usable. The local environment did not have `kyverno` or `kubectl` installed, so validation was performed against official documentation rather than by running the policies in a cluster.
