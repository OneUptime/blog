# Validation Summary: How to Deploy Kyverno for Kubernetes Policy Management and Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kyverno
- Kubernetes
- Kubernetes admission policies
- Helm
- kubectl
- Kubernetes PolicyReport resources

## Sources Consulted
- Kyverno Installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno Releases documentation: https://kyverno.io/docs/installation/releases/
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Mutate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno Generate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno Policy Exceptions documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno Policy Reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno Monitoring documentation: https://kyverno.io/docs/guides/monitoring/
- Kyverno Restrict Image Registries sample policy: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/

## Issues Found
- The kubectl install command referenced Kyverno `v1.11.0`, which is outdated for a 2026 tutorial. Updated it to `v1.18.1`, a current tagged release whose `install.yaml` asset is available on GitHub.
- The validation examples used top-level `spec.validationFailureAction`, which Kyverno now marks as deprecated. Moved the setting to `spec.rules[*].validate.failureAction` in each validation rule.
- The `PolicyException` example used `apiVersion: kyverno.io/v2beta1`. Current Kyverno documentation uses `apiVersion: kyverno.io/v2` for ClusterPolicy-style `PolicyException` resources, so the example was updated.
- The background scanning example tried to describe a `ClusterPolicyReport` object literally named `clusterpolicyreport`. Current Kyverno report names are generated from the resources being reported, so the command was changed to describe available `ClusterPolicyReport` resources without assuming a fixed name.

## Review Notes
The post uses classic `ClusterPolicy` examples. Current Kyverno documentation still documents these APIs and sample policies, but the docs also present newer CEL-based policy types and label the ClusterPolicy documentation area as deprecated. A future post update could migrate the examples to `ValidatingPolicy`, `MutatingPolicy`, and `GeneratingPolicy`, but that would require a larger rewrite than a correctness fix.
