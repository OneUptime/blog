# Validation Summary: How to Configure Crossplane Composite Resource Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane CompositeResourceDefinitions and Compositions
- Crossplane claims and composite resources
- Crossplane Function Patch and Transform
- Crossplane Function Go Templating
- Upbound AWS provider resources
- Kubernetes kubectl
- kube-state-metrics and PrometheusRule

## Sources Consulted
- Crossplane v2.3 Composite Resource Definitions: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane v2.3 Compositions: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane v2.3 Composite Resources: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane v2.3 Function Patch and Transform: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v2 upgrade guide, legacy claims behavior: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Crossplane v1.20 claims: https://docs.crossplane.io/v1.20/concepts/claims/
- Crossplane v1.20 server-side apply and claim status sync behavior: https://docs.crossplane.io/v1.20/concepts/server-side-apply/
- crossplane-contrib function-go-templating README: https://github.com/crossplane-contrib/function-go-templating
- Upbound provider-aws-rds Instance v1beta1 reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- Upbound provider-aws-elbv2 LB v1beta1 reference: https://marketplace.upbound.io/providers/upbound/provider-aws-elbv2/v0.43.1/resources/elbv2.aws.upbound.io/LB/v1beta1
- kube-state-metrics custom resource state metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md

## Issues Found
- The Composition examples used the deprecated top-level `spec.resources` form. Updated them to `mode: Pipeline` with `function-patch-and-transform` and `pt.fn.crossplane.io/v1beta1` `Resources` input.
- The RDS state mapping used invalid YAML/Crossplane syntax with `*: provisioning` in a `map` transform. Replaced it with a `match` transform and explicit fallback value.
- The RDS status field path used `status.atProvider.dbInstanceStatus`, which is not the Upbound RDS Instance field. Changed it to `status.atProvider.status`.
- The RDS host-style endpoint examples used `status.atProvider.endpoint`, which can include the port. Changed those patches to `status.atProvider.address` where the post separately exposes `port` or builds a connection string.
- The readiness example included `type: None` alongside stricter checks, which could imply always-ready behavior. Removed it so the example matches the explanation that all checks must pass.
- The conditions section defined `status.conditions` in the XRD schema, but Crossplane reserves that field. Replaced the schema example with a custom status field and changed the condition example to use `function-go-templating` `ClaimConditions`.
- The condition Composition mixed pipeline mode with top-level `resources`, which is invalid. Moved resource provisioning into the function pipeline.
- The cache example used `cache.aws.upbound.io`; the Upbound provider group for ElastiCache Cluster is `elasticache.aws.upbound.io`. Updated the apiVersion.
- The load balancer example patched `status.atProvider.state.code`, which is not present in the referenced Upbound LB schema. Removed that patch.
- The Prometheus example assumed Crossplane emits `crossplane_composite_resource_info` labels for arbitrary custom status fields. Replaced it with a kube-state-metrics custom resource state metrics configuration and PrometheusRule that alert on the exported metric.
- The kube-state-metrics Deployment example needed a selector, template labels, and container image to be a valid apps/v1 Deployment. Added those fields.

## Review Notes
The post intentionally uses legacy v1 XRD claims because current Crossplane v2 XRDs do not support claims. Crossplane v2 keeps v1-style XRDs working through legacy behavior, but future posts should call out that distinction explicitly when teaching claims.
