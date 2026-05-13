# Validation Summary: How to Configure Flux Notation Secret for Image Signing Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Kubernetes Secrets
- OCIRepository
- HelmChart signature verification
- Notation / Notary Project
- OCI artifact signing and verification
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux source-controller implementation for Notation verification: https://github.com/fluxcd/source-controller/blob/main/internal/controller/ocirepository_controller.go and https://github.com/fluxcd/source-controller/blob/main/internal/oci/notation/notation.go
- Flux v2.3.0 source-controller manifest reference: https://github.com/fluxcd/flux2/blob/v2.3.0/manifests/bases/source-controller/kustomization.yaml
- Notary Project trust store and trust policy specification: https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md
- Notation GitHub repository and command documentation references: https://github.com/notaryproject/notation
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post described Flux Notation verification as verifying container image signatures before deploying containers. Flux source-controller verifies signed OCI source artifacts for `OCIRepository` and OCI-backed `HelmChart` resources before making those artifacts available to downstream controllers; it does not verify arbitrary workload container images referenced inside manifests. I updated the title, description, introduction, prerequisites, and conclusion to use OCI artifact signature verification.
- The examples were inconsistent: the trust policy used `myregistry.example.com/my-app`, the `OCIRepository` fetched `myregistry.example.com/my-app-manifests`, and the Notation examples signed `myregistry.example.com/my-app:1.0.0`. I changed the trust policy, signing, local verification, and troubleshooting commands to consistently use `myregistry.example.com/my-app-manifests:latest`.
- The certificate wording implied that the leaf signing certificate or public key alone is always the right verification material. Notation trust stores are X.509 trust stores that typically contain CA root certificates, and Flux expects CA certificate files with `.pem` or `.crt` extensions in the verification Secret. I updated the wording to refer to a CA root certificate or signing certificate chain.
- The Notation certificate listing command was written as `notation cert list` under a comment about exporting. I changed it to `notation cert ls` and clarified that it lists local test certificates rather than exporting one.
- The prerequisite stated Flux v2.1 or later, but Notation verification support appears in source-controller v1.3.0, which is bundled with Flux v2.3.0. I changed the prerequisite to Flux v2.3 or later.

## Review Notes
Flux's current documentation confirms that Notation verification is configured with `.spec.verify.provider: notation` and a `secretRef` on `OCIRepository`; HelmChart also supports `.spec.verify`, but only for Helm charts fetched from OCI registries. The post is now technically correct for Flux source-controller artifact verification, but admission-time verification of workload container images would require a separate policy/enforcement component outside this guide.
