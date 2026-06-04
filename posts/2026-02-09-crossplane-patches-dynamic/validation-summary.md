# Validation Summary: How to Use Crossplane Patches for Dynamic Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Crossplane Compositions
- Crossplane function-patch-and-transform
- Crossplane patch and transform syntax
- Upbound AWS RDS managed resources
- kubectl

## Sources Consulted
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane connection details composition guide: https://docs.crossplane.io/master/guides/connection-details-composition/
- Crossplane troubleshooting guide: https://docs.crossplane.io/latest/guides/troubleshoot-crossplane/
- Crossplane What's New in v2 documentation: https://docs.crossplane.io/latest/whats-new/
- Upbound provider-aws-rds managed resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds

## Issues Found
- The Composition examples used deprecated native `spec.resources` style. Updated the full examples to use `mode: Pipeline` with `function-patch-and-transform` input, matching current Crossplane guidance.
- The post described `CombineToComposite` as splitting a field into multiple fields. Corrected it to describe combining managed-resource fields and writing the result to the Composite Resource.
- The examples used outdated AWS RDS resource names and fields such as `database.aws.crossplane.io/v1beta1`, `RDSInstance`, `dbInstanceClass`, and `multiAZ`. Updated examples to current-style Upbound RDS API group and fields such as `rds.aws.m.upbound.io/v1beta1`, `Instance`, `instanceClass`, and `multiAz`.
- Math transforms used `type: Multiply`, but current function-patch-and-transform syntax uses `type: multiply`. Updated both math examples.
- Several map transforms wrote quoted strings into numeric or boolean provider fields. Updated mapped results to numeric and boolean YAML values where appropriate.
- The connection secret example attempted to build a connection string with `FromValue` interpolation. `FromValue` is static and does not interpolate other secret keys, so the example now exposes explicit connection keys and uses a static value only for a static field.
- The connection secret configuration patched `spec.writeConnectionSecretToRef` as if it controlled the aggregated XR secret. Updated it to use function input `writeConnectionSecretToRef` patches for the aggregated secret.
- The ToCompositeFieldPath example used a JSONPath filter expression for conditions. Crossplane field paths support a subset of JSONPath and array indexes, so the example now patches concrete status fields instead.
- The debugging section referenced a non-standard `crossplane.io/debug` annotation. Replaced it with Crossplane's documented troubleshooting guidance: inspect events and logs, and use the `--debug` flag when more detail is needed.
- The performance section claimed `fromFieldPath: Required` avoids unnecessary updates. Corrected the wording because that policy surfaces missing required inputs rather than optimizing updates.
- Updated references to Claims to account for Crossplane v2's Composite Resource focus while noting Crossplane v1 Claim behavior where relevant.

## Review Notes
The examples remain illustrative and provider field availability can vary by installed provider package and version. The corrected post now aligns with current Crossplane pipeline-based composition guidance and avoids deprecated native patch-and-transform composition style.
