# Validation Summary: How to Deploy Crossplane Compositions with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane CompositeResourceDefinitions and Compositions
- Crossplane Function Patch and Transform
- Upbound AWS S3 and RDS providers
- Flux CD Kustomizations
- Kubernetes kubectl

## Sources Consulted
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v1.20 connection details documentation: https://docs.crossplane.io/v1.20/concepts/connection-details/
- Crossplane v2.2 CompositeResourceDefinition documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane v2.2 API reference: https://docs.crossplane.io/latest/api/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Upbound provider-aws-s3 Bucket resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- Upbound provider-aws-s3 BucketVersioning resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v1.9.0/resources/s3.aws.upbound.io/BucketVersioning/v1beta1
- Upbound provider-aws-s3 BucketServerSideEncryptionConfiguration resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.5.1/resources/s3.aws.m.upbound.io/BucketServerSideEncryptionConfiguration/v1beta1
- Upbound provider-aws-rds Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.9.0/resources/rds.aws.upbound.io/Instance/v1beta2

## Issues Found
- The architecture diagram listed an IAM Policy, but the S3 composition did not create one. I changed that node to Public Access Block to match the actual resources.
- The storage bucket XRD and claim exposed an `encryption` boolean that the composition never used; the composition always created the encryption resource. I removed the unused parameter and clarified the resource comment as enforced encryption.
- The S3 bucket example used `s3.aws.upbound.io/v1beta2`, while the current Upbound provider-aws-s3 marketplace page lists the cluster-scoped Bucket resource as `s3.aws.upbound.io/v1beta1`. I updated the Bucket API version.
- The storage XRD advertised `status.bucketDomainName`, but the composition only patched `status.bucketArn`. I added a `ToCompositeFieldPath` patch from `status.atProvider.bucketRegionalDomainName`.
- The Function install manifest used the older `pkg.crossplane.io/v1beta1` API and an older `xpkg.upbound.io` package reference. I updated it to `pkg.crossplane.io/v1` and the current Crossplane package reference from the official function guide.
- The RDS example used an empty `passwordSecretRef`, but Upbound's RDS Instance schema requires `namespace`, `name`, and `key`. I added those fields and patched per-XR secret names from `metadata.uid`.
- The RDS composition listed connection details but did not configure a managed resource `writeConnectionSecretToRef` or include the `password` key advertised by the XRD. I added the resource secret reference and a `FromConnectionSecretKey` password entry.
- The string transforms added for generated RDS secret names now include `type: Format`, matching the current Function Patch and Transform schema.

## Review Notes
The post uses Crossplane v1-style XRDs and claims. Crossplane v2 is backward compatible with this mode, but current Crossplane documentation recommends namespaced XRs for new v2-style APIs and notes that claims are not supported by the v2 XRD API. The local environment did not have `kubectl` or `flux` installed, so CLI command verification was performed against official command references rather than local help output.
