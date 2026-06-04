# Validation Summary: How to Use Crossplane Resource References for Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane managed resources
- Crossplane Composition and Function Patch and Transform
- Upbound AWS provider for EC2, RDS, and S3
- Kubernetes manifests and kubectl troubleshooting commands

## Sources Consulted
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Runtime v2 common reference and selector API types: https://pkg.go.dev/github.com/crossplane/crossplane-runtime/v2/apis/common/v1
- Upbound provider-aws generated API types for EC2 Subnet, EC2 SecurityGroupRule, RDS Instance, and S3 BucketPolicy: https://github.com/upbound/provider-aws

## Issues Found
- The post overstated reference behavior by saying Crossplane waits for referenced resources to be ready before provisioning dependents. Updated the wording to describe reference resolution more precisely: Crossplane resolves external names or provider-assigned values and keeps reconciling dependent resources as those values become available.
- The standalone `matchControllerRef` example was incorrect because controller references are useful when resources share a Kubernetes controller owner, typically composed resources owned by the same XR. Replaced it with a pipeline-mode Composition example.
- The Composition examples used the older inline `spec.resources` shape. Updated them to current pipeline-mode Composition examples using `function-patch-and-transform` input resources.
- The cross-namespace example mixed `metadata.namespace` with cluster-scoped `ec2.aws.upbound.io` managed resources and incorrectly used `policy.resolve` as a cross-namespace control. Updated the example to use namespaced `ec2.aws.m.upbound.io` resources and the selector `namespace` field.
- The circular dependency example used a non-existent `destinationSecurityGroupIdRef` field. Changed it to the generated Upbound AWS field `sourceSecurityGroupIdRef`.
- The RDS examples omitted important required/operational fields for DB instances. Added `username`, `manageMasterUserPassword`, `skipFinalSnapshot`, and replica `instanceClass` values where needed.
- The S3 patch example patched `bucketRef.name` from the composite name, which would not reliably match the composed Bucket object. Changed it to patch a shared label and use `bucketSelector.matchLabels`.

## Review Notes
All YAML code blocks were parsed successfully after edits. The examples still assume the relevant Crossplane provider packages, the `function-patch-and-transform` Function, and the referenced XRDs are installed before applying the Composition manifests.
