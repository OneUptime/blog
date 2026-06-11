# Validation Summary: How to Build Kyverno Policy Mutation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kyverno ClusterPolicy mutation rules
- Kubernetes admission control resources
- Strategic merge patches
- RFC 6902 JSON Patch / JSON Pointer
- Kyverno CLI policy testing
- Helm-based Kyverno installation
- Kubernetes RBAC

## Sources Consulted
- Kyverno mutate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno CLI documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno GitHub releases: https://github.com/kyverno/kyverno/releases

## Issues Found
- Corrected the description of Kyverno mutation methods. Kyverno documents strategic merge patches and RFC 6902 JSON patches as mutation patch forms, while `foreach` is a loop construct that can apply patch forms to array elements.
- Removed `copy` and `move` from the `patchesJson6902` operation table because Kyverno documents `add`, `replace`, and `remove` for this mutation method.
- Added the sidecar injection marker label to Deployment metadata as well as the Pod template so the `exclude.resources.selector` can match after the first mutation.
- Fixed the GPU resource JMESPath expression to quote the `nvidia.com/gpu` key correctly and use a numeric comparison fallback.
- Fixed the foreach image rewrite example to quote the dynamic container name in `images.containers."{{element.name}}"`, matching Kyverno's documented pattern for container names with special characters.
- Updated the Linux Kyverno CLI manual install example from v1.11.0 to the verified current v1.18.1 release URL and used `cp` as shown in Kyverno's manual install guidance.
- Updated the Kyverno test manifest example to include `apiVersion`, `kind`, `metadata`, plural `resources`, and `patchedResources`, which are required by the current CLI test schema for mutate tests.
- Replaced the mutate-only "audit mode" guidance and deprecated `spec.validationFailureAction` examples. That setting applies to validation policy behavior, is deprecated as of Kyverno 1.13, and does not make mutate rules audit-only.

## Review Notes
- The post is technically relevant and remains a useful Kyverno mutation tutorial after the corrections.
- A local YAML parser was not available in the workspace, so code-fence validation was performed by manual review against official documentation and by checking changed snippets carefully.
