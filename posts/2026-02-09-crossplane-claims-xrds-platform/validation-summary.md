# Validation Summary: How to Configure Crossplane Claims and XRDs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Crossplane CompositeResourceDefinitions (XRDs)
- Crossplane Claims and Composite Resources
- Crossplane Compositions and Composition Functions
- Crossplane function-patch-and-transform
- Upbound AWS RDS provider resources
- Upbound GCP Cloud SQL provider resources
- kubectl

## Sources Consulted
- Crossplane Composite Resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane CompositeResourceDefinitions documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane v2 upgrade and compatibility documentation: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Crossplane v2 "What's New" documentation for claims and namespaced XRs: https://docs.crossplane.io/latest/whats-new/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Upbound provider-aws-rds SubnetGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.4.0/resources/rds.aws.upbound.io/SubnetGroup/v1beta1
- Upbound provider-aws-rds Instance API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound provider-gcp-sql DatabaseInstance API reference: https://marketplace.upbound.io/providers/upbound/provider-gcp-sql/v1.8.1/resources/sql.gcp.upbound.io/DatabaseInstance/v1beta1
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- Clarified that Claims are a v1-style Crossplane interface. Crossplane v2 native namespaced composite resources do not use claims, while v1 XRDs continue to support claims in legacy mode.
- Corrected the explanation of responsibility between XRDs and Compositions. XRDs define the API schema; Compositions map that API to composed resources.
- Added `connectionSecretKeys` and `spec.writeConnectionSecretToRef` to the XRD example so claim connection secret configuration is represented in the schema.
- Replaced legacy `spec.resources` Composition examples with `mode: Pipeline` and `function-patch-and-transform`, because native patch-and-transform compositions were deprecated in Crossplane v1.17 and removed in Crossplane v2.
- Corrected the AWS RDS subnet group API group from `database.aws.upbound.io/v1beta1` to `rds.aws.upbound.io/v1beta1`.
- Added an RDS `dbSubnetGroupNameSelector` using `matchControllerRef` so the example RDS instance actually references the composed subnet group.
- Added required RDS instance fields for a plausible PostgreSQL instance example, including `username`, `autoGeneratePassword`, and a complete `writeConnectionSecretToRef`.
- Corrected the math transform example to include `math.type: multiply`, which is required by function-patch-and-transform.
- Updated the GCP Composition example to use function-patch-and-transform pipeline structure.
- Adjusted the dependency wording around `matchControllerRef` so it accurately describes reference selection without overstating ordering guarantees.
- Clarified that the policy example depends on a custom installed function rather than an out-of-the-box Crossplane function.

## Review Notes
The post is now technically accurate for Crossplane v1-style claims and XRDs, including Crossplane v2 legacy compatibility. A future rewrite could show the Crossplane v2 native namespaced XR pattern separately, because Crossplane v2 no longer needs Claims for namespace-scoped developer APIs.
