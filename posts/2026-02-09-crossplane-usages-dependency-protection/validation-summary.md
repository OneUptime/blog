# Validation Summary: How to Use Crossplane Usages for Resource Dependency Protection in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane Usage and Cluster protection APIs
- Crossplane Compositions and CompositeResourceDefinitions
- Kubernetes manifests and kubectl
- Upbound AWS provider managed resources
- provider-kubernetes Object resources
- Prometheus-style monitoring considerations

## Sources Consulted
- Crossplane latest Usages documentation: https://docs.crossplane.io/latest/managed-resources/usages/
- Crossplane latest API reference: https://docs.crossplane.io/latest/api/
- Crossplane latest Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane latest CompositeResourceDefinitions documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane latest Metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Upbound provider-aws-rds Instance API documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- provider-kubernetes Object API usage reference: https://github.com/crossplane-contrib/provider-kubernetes
- Kubernetes kubectl reference behavior for fully qualified resource names: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used the deprecated `apiextensions.crossplane.io/v1alpha1` Usage API. Updated Usage examples to `protection.crossplane.io/v1beta1`.
- The AWS managed resource API groups used older cluster-scoped provider groups. Updated examples to the current namespaced `.m.upbound.io` groups and added namespaces where needed.
- The basic RDS examples omitted practical required/provider fields for creating an instance. Added username, generated password secret references, and region where missing.
- The `kubectl delete instance app-database` command was ambiguous for current namespaced provider resources. Changed it to a fully qualified resource and namespace.
- The composition examples used deprecated native `resources` mode. Updated them to Pipeline mode with `function-patch-and-transform`.
- The post claimed an application could not be deleted until infrastructure was removed. Corrected the deletion direction: Usage blocks deletion of the `of` resource while the `by` resource exists.
- The cascading Usage snippet was not a complete YAML document. Wrapped it in a Kubernetes `List`.
- The selector section claimed one Usage protects all matching resources. Corrected this because Crossplane resolves selectors once to a single matching resource.
- The time-based protection section used a nonexistent Crossplane expiration annotation. Replaced it with a custom cleanup annotation and clarified that Crossplane does not expire Usage resources automatically.
- The custom Usage policy example patched booleans into annotations and would not conditionally create valid Usage resources. Reworked it to patch concrete resource names into `spec.of.resourceRef.name`.
- The monitoring section used undocumented `crossplane_usage_*` metrics. Replaced it with supported kubectl inspection commands and noted that alerts require a separate CR-state/event/log export path.
- The cleanup CronJob attempted to discover orphaned arbitrary resources with invalid dynamic `kubectl` lookups. Reworked it to delete only Usage resources with the tutorial's custom expiration annotation.

## Review Notes
The examples are still illustrative and assume the relevant Crossplane providers, composition functions, provider configs, RBAC, and cloud prerequisites are already installed. The review focused on Crossplane Usage semantics, current API versions, manifest validity, and avoiding undocumented Crossplane behavior.
