# Validation Summary: Provisioning Managed Database Services Using Crossplane on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Kubernetes
- Helm
- Upbound AWS RDS provider
- Upbound GCP Cloud SQL provider
- AWS RDS
- Google Cloud SQL
- Crossplane Compositions and CompositeResourceDefinitions

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane managed resources documentation: https://docs.crossplane.io/v1.20/concepts/managed-resources/
- Crossplane claims documentation: https://docs.crossplane.io/v1.20/concepts/claims/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Upbound provider-aws-rds Instance v1.2.0 API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.2.0/resources/rds.aws.upbound.io/Instance/v1beta2
- Upbound provider-gcp-sql DatabaseInstance v1.2.0 API reference: https://marketplace.upbound.io/providers/upbound/provider-gcp-sql/v1.2.0/resources/sql.gcp.upbound.io/DatabaseInstance/v1beta1

## Issues Found
- The post claimed to demonstrate AWS, GCP, and Azure, but only included AWS and GCP examples. Updated the description, introduction, and conclusion to match the actual tutorial scope.
- The Helm install command enabled `--enable-composition-revisions`, which is not a current Crossplane install flag and is unnecessary for the tutorial. Removed that argument.
- The AWS RDS `Instance` example used `rds.aws.upbound.io/v1beta1`, but `provider-aws-rds:v1.2.0` exposes `Instance` as `rds.aws.upbound.io/v1beta2`. Updated both AWS RDS manifests.
- The AWS RDS managed resource included `metadata.namespace`, but the referenced Upbound AWS RDS `Instance` resource is cluster-scoped. Removed the namespace from the managed resource metadata.
- The connection secret explanation implied Crossplane always writes a fixed set of keys. Updated the wording to clarify that providers determine the published connection details.
- The XRD and Composition examples did not configure connection secret propagation for claims. Added `connectionSecretKeys` to the XRD, `connectionDetails` to the Composition, and `writeConnectionSecretToRef.name` to the claim.
- The Composition used legacy `spec.resources` patch-and-transform style. Updated it to current `mode: Pipeline` syntax and added the required `function-patch-and-transform` function package.
- The application Deployment example was missing the required `spec.selector` and matching pod template labels. Added them.
- The application Deployment referenced a secret name that was not configured by the claim. Updated it to use the claim's `my-app-database-connection` secret.
- The troubleshooting command used an incomplete resource name, `instance.rds`. Updated it to `instance.rds.aws.upbound.io`.
- The connection-secret troubleshooting note was inaccurate for claims and compositions. Updated it to check the claim secret name and composition `connectionDetails`.

## Review Notes
The provider package versions in the post are older but still have official API reference pages. A future update could move the examples to the latest provider families and Crossplane v2 resource models, but that would be a broader version upgrade rather than a narrow correctness fix.
