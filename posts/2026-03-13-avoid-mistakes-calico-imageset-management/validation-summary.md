# Validation Summary: How to Avoid Common Mistakes with Calico ImageSet Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes custom resources
- ImageSet resources
- Container image registries and digests
- crane CLI
- kubectl

## Sources Consulted
- Tigera Calico documentation: Install images by registry digest: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Tigera Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera Calico documentation: Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Tigera Operator source, image reference construction: https://github.com/tigera/operator/blob/master/pkg/components/references.go
- go-containerregistry crane command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md

## Issues Found
- The "wrong ImageSet name" YAML example used duplicate `metadata.name` keys in a single mapping, which is invalid YAML. I split the examples into separate `metadata` blocks.
- The ImageSet version example used older Calico `v3.27.0` values while the documented current operator example uses `quay.io/tigera/operator:v1.42.0` and Calico `v3.32.0`. I updated the concrete examples to match the current official documentation.
- The digest example used abbreviated `sha256:...` values. Tigera documents that the field must be prefixed with `sha256:` and contain the digest without a leading `@`, so I replaced abbreviated placeholders with full-length placeholder digests.
- The private registry example put a path into `spec.registry`. Tigera documents registry, image path, and image prefix as separate Installation fields, so I changed the example to use `registry: "registry.internal.example.com"` and `imagePath: "calico"`.
- The post referenced `status.computedConfig`, but the Installation status field is `status.computed`. I replaced that check with the official `docker run quay.io/tigera/operator:v1.42.0 --print-images=list` command for listing operator images.
- The post claimed a missing ImageSet image falls back to the default registry. The operator source returns an error when an ImageSet is present but does not contain the required image, and the API reference says all deployed images must be specified. I corrected the wording to say the operator cannot construct the digest-pinned reference.
- The mirror example implied `crane copy` may cause digest changes through registry recompression. The crane command documentation says `crane copy` retains the digest value, so I changed the warning to cover mirroring tools and registry behavior generally and kept the recommendation to verify the destination digest.

## Review Notes
The post is technically relevant and validated after corrections. In future updates, the exact required image list should be checked against the target operator version because Calico image components can change between releases.
