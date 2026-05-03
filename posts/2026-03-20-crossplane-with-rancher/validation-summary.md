# Validation Summary: How to Use Crossplane with Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Crossplane (control plane / Helm install)
- Crossplane Compositions and composition functions (function-patch-and-transform)
- Upbound family AWS provider (provider-aws-s3, provider-aws-rds)
- Rancher / Kubernetes
- Helm, kubectl
- AWS S3 and RDS

## Sources Consulted
- Crossplane install docs: https://docs.crossplane.io/latest/software/install/
- Crossplane Composition Revisions: https://docs.crossplane.io/latest/composition/composition-revisions/
- Crossplane Compositions (v2.2): https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Functions (Packages): https://docs.crossplane.io/latest/packages/functions/
- Crossplane v2 upgrade guide: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Deprecation of native P&T (issue #4746): https://github.com/crossplane/crossplane/issues/4746
- Upbound provider-aws-s3 marketplace: https://marketplace.upbound.io/providers/upbound/provider-aws-s3
- Upbound Bucket schema: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- Upbound ProviderConfig schema: https://marketplace.upbound.io/providers/upbound/provider-aws/v0.6.0/resources/aws.upbound.io/ProviderConfig/v1beta1
- Upbound RDS Instance schema: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/latest/resources/rds.aws.upbound.io/Instance/v1beta1
- function-patch-and-transform releases: https://github.com/crossplane-contrib/function-patch-and-transform/releases

## Issues Found
1. **Step 1 — obsolete `--enable-composition-revisions` Helm flag.** Composition Revisions were promoted to beta in Crossplane v1.11 and have been enabled by default since. Setting the flag is redundant on current Crossplane versions. Removed `--set args='{"--enable-composition-revisions"}'` from the `helm install` command.

2. **Step 3 — non-existent provider version `v1.0.0`.** The published Upbound `provider-aws-s3` version history goes from the v0.x series (e.g. v0.36.0) directly to v1.4.0 and then v2.x. There is no `v1.0.0` tag. Updated the package reference to `xpkg.upbound.io/upbound/provider-aws-s3:v2.5.3` (current latest as of 2026-04-17).

3. **Step 6 — Composition uses removed legacy P&T style.** Native inline `spec.resources:` (P&T mode) was deprecated in Crossplane v1.17 and **removed in Crossplane v2**. Since Step 1 installs the latest Crossplane (v2.x), the original Composition would fail to apply. Rewrote Step 6 to:
   - Install the `function-patch-and-transform` Function (`xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.10.4`).
   - Define the Composition with `mode: Pipeline` and a single `patch-and-transform` step that wraps the original RDS Instance base.

## Review Notes
- The RDS Instance example, when actually instantiated, still requires fields not shown (e.g. `username`, `passwordSecretRef`). Since Step 6 is only the Composition base — and real values would normally be supplied via patches from the composite resource claim — this is acceptable for an illustrative snippet.
- The post does not show the corresponding `CompositeResourceDefinition` (XRD) for `platform.example.org/v1alpha1 Database`. Without it the Composition cannot actually be claimed, but the post is scoped as an introductory walkthrough so this omission is reasonable.
- AWS credentials are written to a local file with `cat > aws-credentials.txt`. Readers should be reminded to delete the file after creating the secret; not strictly a technical error, just a security hygiene note.
- The package registry `xpkg.crossplane.io` is the canonical registry for crossplane-contrib functions in Crossplane v2; the older Upbound family providers still publish at `xpkg.upbound.io`. Both references in the post are correct for their respective artifacts.
