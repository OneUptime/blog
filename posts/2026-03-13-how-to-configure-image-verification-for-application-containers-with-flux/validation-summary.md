# Validation Summary: How to Configure Image Verification for Application Containers with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomization
- OCIRepository
- HelmRelease
- HelmRepository
- Cosign
- Sigstore
- OCI registries

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `flux get sources oci` command reference: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign key management documentation: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/

## Issues Found
- The post described Flux verification as enforcing signed application container images before deployment. Flux's native `verify` support in the shown resources verifies OCI source artifacts and OCI Helm chart artifacts, not arbitrary workload container image references inside Kubernetes manifests. Updated the title, description, introduction, prerequisites, examples, and summary to describe OCI artifact verification accurately, and added a note that workload image signature enforcement requires an admission policy engine alongside Flux.
- The signing examples used an application image reference while the Flux examples verified an OCIRepository containing manifests. Updated the Cosign examples to sign and verify the matching `myapp-manifests` OCI artifact.
- The Kustomization section implied that the `verify` field belongs to the Kustomization resource. Updated the wording to clarify that `verify` belongs to the `OCIRepository` source consumed by the Kustomization.
- The keyless OIDC matcher examples used unanchored literal strings. Flux treats `issuer` and `subject` as Go regular expressions, so the examples were changed to anchored regexes.
- The verification step checked for an event reason `VerificationSucceeded`, which is not the documented success signal. Updated it to check the `SourceVerified` condition with `status: True` and `reason: Succeeded`.
- The HelmRepository OCI example was technically valid, but Flux documentation notes that the `oci` HelmRepository type is in maintenance mode and recommends `OCIRepository` for improved OCI support. Added that caveat without restructuring the section.

## Review Notes
The Kubernetes and Flux API versions used in the examples are current for the reviewed Flux v2 APIs. The post now accurately covers Flux source artifact verification; future improvements could add a separate admission-controller section for enforcing signatures on individual workload container images.
