# Validation Summary: How to Set Up Calico ImageSet Management Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (Tigera Operator) v3.27
- Kubernetes (`kubectl`)
- `operator.tigera.io/v1` CRDs: `ImageSet`, `Installation`
- `crane` (go-containerregistry) for image mirroring
- Private container registries (Harbor, Artifactory, ECR)
- Mermaid for the architecture diagram

## Sources Consulted
- Tigera Calico ImageSet docs: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico v3.27 ImageSet docs (archive): https://archive-os-3-27.netlify.app/calico/3.27/operations/image-options/imageset
- Tigera Installation API reference (registry / imagePath / imagePrefix fields): https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera alternate-registry guide: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- `crane` CLI reference: https://github.com/google/go-containerregistry/tree/main/cmd/crane

## Issues Found

1. **Step 2 mirroring script — invalid source paths for `tigera/operator`.** The original loop prepended `docker.io/` to every entry in `IMAGES`, which turned `quay.io/tigera/operator:${CALICO_VERSION}` into `docker.io/quay.io/tigera/operator:${CALICO_VERSION}` — not a valid image reference and `crane copy` would fail on it. Fixed by:
   - Including the source registry hostname in each `IMAGES` entry (`docker.io/calico/...`, `quay.io/tigera/...`).
   - Replacing `src="docker.io/${img}"` with use of the full source path directly.
   - Replacing `basename ${img%:*}` (which dropped the `owner/` segment, e.g. produced `cni` from `calico/cni`) with `path="${src#*/}"` so the owner namespace is preserved in the mirrored destination.

2. **Step 2 / Step 4 registry path mismatch.** The original script mirrored to `registry.internal.example.com/calico/cni:tag` (with `REGISTRY=registry.internal.example.com/calico` plus `basename`), while the Installation set `registry: registry.internal.example.com/calico`. The operator resolves images as `<registry>/<imagePath>/<imagePrefix><owner>/<image>:<tag>`, so it would have looked for `registry.internal.example.com/calico/calico/cni:tag` (note the double `calico/`), which the script never mirrored — pulls would have failed with `ImagePullBackOff`. Fixed by:
   - Setting `REGISTRY=registry.internal.example.com` in the script and mirroring with the owner namespace preserved (so destinations are `registry.internal.example.com/calico/cni:tag`, `registry.internal.example.com/tigera/operator:tag`, etc.).
   - Updating the `Installation` `spec.registry` to `registry.internal.example.com/` so the resolved image paths match the mirrored destinations.

3. **Missing trailing slash on `spec.registry`.** The Tigera Operator API requires `spec.registry` to end with `/`. The original `registry.internal.example.com/calico` had no trailing slash. Addressed as part of fix (2) above.

## Review Notes

- The `ImageSet` resource correctly lists `tigera/operator` — per the Tigera v3.27 docs, `tigera/operator` is one of the images that can be included in an ImageSet (alongside the `calico/*` components and `tigera/key-cert-provisioner`).
- The `ImageSet` name format `calico-v3.27.0` is correct; Tigera requires `calico-<version>` matching the operator version exactly.
- The digest placeholders (`sha256:abc123...`) are non-functional but obviously templated, and Step 3 shows how to obtain real digests with `crane digest`. Left as-is.
- The `Installation` `spec.calicoNetwork.ipPools[].encapsulation: VXLANCrossSubnet` value is valid (valid values are `IPIP`, `VXLAN`, `IPIPCrossSubnet`, `VXLANCrossSubnet`, `None`).
- `kubectl get events --field-selector reason=Failed` is valid — `reason` is one of the supported event field selectors — though in practice `ImagePullBackOff` surfaces as a `Warning` event with reason `Failed` or `BackOff`. Not changed.
- The Step 6 jsonpath query only walks `spec.containers[*]` and would miss images from `spec.initContainers[*]`. Not technically wrong; just incomplete. Not changed since the user didn't request improvements.
- The post does not explain how to bootstrap the operator itself from the private registry (the operator image is set via the `tigera-operator.yaml` manifest before any ImageSet/Installation exists). This is a content gap, not an error, so it was left alone.
