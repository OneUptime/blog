# Validation Summary: OpenTofu vs Crossplane: Choosing the Right IaC Approach

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- OpenTofu (HCL, `tofu` CLI)
- Crossplane (Kubernetes operator, CRDs, XRDs / CompositeResourceDefinitions)
- Kubernetes (`kubectl`, RBAC, etcd)
- AWS provider for Crossplane (`s3.aws.crossplane.io`)
- GitOps tooling (ArgoCD, Flux) - referenced

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu license (MPL 2.0): https://github.com/opentofu/opentofu/blob/main/LICENSE
- Crossplane documentation: https://docs.crossplane.io/
- Crossplane CompositeResourceDefinition reference: https://docs.crossplane.io/latest/concepts/composite-resource-definitions/
- Crossplane license (Apache 2.0): https://github.com/crossplane/crossplane/blob/main/LICENSE
- crossplane-contrib/provider-aws (legacy AWS provider) S3 Bucket type reference
- OpenTofu/Terraform Registry provider count

## Issues Found
1. **XRD example missing required fields** — The `CompositeResourceDefinition` example was missing fields that Crossplane's XRD schema treats as required: `spec.names.plural`, `spec.versions[].served`, and `spec.versions[].referenceable`. As written it would have failed schema validation if applied. Added the three fields so the snippet is a usable, minimally valid XRD.
2. **Wrong language tag on text block** — The "Using Both Together" code block listed plain English text but was tagged as `hcl`, which is misleading (it's not HCL). Changed the fence to `text`.

## Review Notes
- The Crossplane S3 Bucket example uses the legacy `s3.aws.crossplane.io/v1beta1` API from `crossplane-contrib/provider-aws`. This API still works, but the Crossplane ecosystem has largely moved to the Upbound family providers (`s3.aws.upbound.io/v1beta1` from `provider-aws-s3`). Left the legacy form since it is still valid and widely referenced; future revisions may want to switch to the Upbound family form.
- Provider counts for OpenTofu ("3,000+") match the OpenTofu/Terraform Registry order of magnitude and are reasonable.
- Drift detection claim for OpenTofu (`tofu plan -refresh-only`) is correct — same flag as Terraform.
- Crossplane state storage description ("Kubernetes etcd") is accurate; resource state lives on the managed resource CR status held in etcd via the API server.
- Licenses are correctly stated: OpenTofu = MPL 2.0, Crossplane = Apache 2.0.
