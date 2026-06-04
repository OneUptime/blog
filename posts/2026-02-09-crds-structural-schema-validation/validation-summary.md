# Validation Summary: How to Create CRDs with Structural Schema Validation in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 validation schemas
- Structural schemas
- CRD defaulting
- CRD array/list validation
- kubectl
- YAML

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions, https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API reference: CustomResourceDefinition v1, https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes documentation: Object Names and IDs, https://kubernetes.io/docs/concepts/overview/working-with-objects/names
- Semantic Versioning 2.0.0 specification, https://semver.org/

## Issues Found
- The post stated that Kubernetes introduced structural schemas as a requirement for CRDs in version 1.16. I narrowed this to `apiextensions.k8s.io/v1`, introduced in Kubernetes 1.16, because the Kubernetes docs specify that structural schemas are mandatory for the v1 CRD API while they were optional in the beta CRD API.
- The SemVer regex did not allow build metadata such as `1.2.3+build.1`, which is part of SemVer 2.0.0. I updated the regex to include the optional build metadata portion from the official SemVer pattern while preserving the post's optional `v` prefix.
- The nested `retryPolicy` defaults would not apply when `retryPolicy` itself was omitted. I added `default: {}` to the `retryPolicy` object so the child defaults can be applied when users omit retry settings.
- The volume array text said names were unique, but the schema did not enforce uniqueness. I added `x-kubernetes-list-type: map` and `x-kubernetes-list-map-keys: [name]`, which Kubernetes uses for map-style lists with unique key guarantees.
- The volume item schema described properly configured sources, but `volumeSource` was optional. I added `volumeSource` to the item `required` list so the existing `oneOf` validation requires exactly one source type on every volume.
- The volume name and common resource-name examples used a DNS-label-style regex without enforcing the documented 63-character label limit. I added `maxLength: 63` to the volume name and changed the common pattern label to "Kubernetes DNS label name" with `maxLength: 63`.
- The autoscaling evolution example relied on child defaults under an optional object. I added `default: {}` to the `autoscaling` object so omitted autoscaling settings receive the documented defaults.

## Review Notes
The YAML examples parse successfully. `kubectl` is not installed in this workspace, so CLI behavior was checked against official Kubernetes documentation rather than local command output.
