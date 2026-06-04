# Validation Summary: How to Configure Crossplane EnvironmentConfigs for Dynamic Composition Patching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane EnvironmentConfigs
- Crossplane Composition Functions
- Crossplane function-environment-configs
- Crossplane function-patch-and-transform
- Kubernetes manifests and kubectl
- Upbound AWS and Kubernetes providers

## Sources Consulted
- Crossplane EnvironmentConfigs documentation: https://docs.crossplane.io/latest/composition/environment-configs/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v1.20 EnvironmentConfig migration notes: https://docs.crossplane.io/v1.20/concepts/environment-configs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Upbound Marketplace provider schema references for AWS RDS and Kubernetes Object resources: https://marketplace.upbound.io/

## Issues Found
- Updated `EnvironmentConfig` examples from `apiextensions.crossplane.io/v1alpha1` to `apiextensions.crossplane.io/v1beta1`, matching current Crossplane documentation.
- Replaced legacy native Composition environment usage with `mode: Pipeline`, `function-environment-configs`, and `function-patch-and-transform`, because native `spec.environment.environmentConfigs` and environment patching were removed in Crossplane v1.18.
- Removed `environmentConfigRefs` from the claim example. Current EnvironmentConfig selection is configured in the Composition function input, not directly on claims.
- Added environment labels to the dev/prod EnvironmentConfigs so selector examples can match them.
- Changed numeric and boolean EnvironmentConfig values from strings to native YAML numbers and booleans where they are patched into typed provider fields.
- Added the missing `provider: aws` label to the database Composition so the example claim's `compositionSelector` can match it.
- Fixed string and math transform syntax by adding required transform subtypes such as `type: Format` and `type: multiply`.
- Corrected the conditional resource creation section. Patch and Transform can conditionally set fields, but it does not omit entire resources; the section now describes conditional configuration and notes that templating/custom functions are needed for true conditional resource omission.
- Added required fields to the embedded `apps/v1` Deployment manifest, including selector, pod template labels, and a container.
- Replaced a single-input string format that had two `%s` placeholders with a valid one-placeholder format.

## Review Notes
The examples assume the referenced composition functions and providers are already installed in the Crossplane control plane. Provider API groups and field names can vary by provider package family and version, so production examples should pin provider versions and verify schemas against the installed CRDs.
