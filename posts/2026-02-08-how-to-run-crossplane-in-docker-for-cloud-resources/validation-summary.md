# Validation Summary: How to Run Crossplane in Docker for Cloud Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Kubernetes
- kind
- Docker
- Helm
- AWS S3
- Crossplane providers
- Crossplane compositions
- Kubernetes custom resources and secrets

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Upbound Marketplace Bucket API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- kind v0.31.0 GitHub release: https://github.com/kubernetes-sigs/kind/releases/tag/v0.31.0

## Issues Found
- The kind install command pinned an older v0.22.0 binary. Updated it to v0.31.0, the current latest release found on the official kind GitHub release page.
- The AWS provider package used `xpkg.upbound.io/upbound/provider-aws-s3:v1.1.0`. Updated the example to Crossplane's current documented community package, `xpkg.crossplane.io/crossplane-contrib/provider-aws-s3:v2.0.0`, and aligned the provider name with the package.
- The ProviderConfig and S3 Bucket examples used older cluster-scoped API groups. Updated them to the current Crossplane v2 namespaced AWS provider API groups, `aws.m.upbound.io/v1beta1` and `s3.aws.m.upbound.io/v1beta1`, including the `default` namespace where needed.
- The composition section claimed it bundled an S3 bucket with a DynamoDB table, but the example only defined an S3 bucket. Corrected the text to say it manages an S3 bucket.
- The composition used the legacy direct `resources` field shape. Updated it to the current `mode: Pipeline` composition with the `crossplane-contrib-function-patch-and-transform` function and `pt.fn.crossplane.io/v1beta1` Resources input.
- The XRD example used v1 claim-style terminology and an `XStorageBundle`/claim pattern. Updated it to the current v2 namespaced XRD shape and adjusted the storage bundle example and commands accordingly.
- The script waited for `provider/provider-aws`, which no longer matched the provider object name after correcting the package. Updated it to wait for `provider/crossplane-contrib-provider-aws-s3`.

## Review Notes
YAML snippets were parsed successfully with PyYAML. Local `kubectl`, `helm`, and `kind` binaries were not installed in the workspace, so CLI command verification was performed against official documentation rather than local `--help` output.
