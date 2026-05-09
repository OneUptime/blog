# Validation Summary: How to Troubleshoot Calico ImageSet Management

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes custom resources
- Kubernetes image pulls and imagePullSecrets
- Container image registries and digests
- kubectl
- crane

## Sources Consulted
- Calico Documentation: Install images by registry digest: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico Documentation: Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera Operator Go package documentation for ImageSet validation: https://pkg.go.dev/github.com/tigera/operator/pkg/controller/utils/imageset
- Tigera Operator API package documentation: https://pkg.go.dev/github.com/tigera/operator/api/v1

## Issues Found
- The introduction overstated digest validation and implied direct Installation status errors for image pull failures. Updated it to match the operator behavior documented by Tigera: ImageSet validation checks known images and digest format, while incorrect or unpullable digests usually surface through rollout status and pod events.
- The ImageSet status command checked `spec.imageSet`, but the operator records the selected ImageSet in `status.imageSet`. Updated the command to query `.status.imageSet`.
- The secret verification step only checked `calico-system`. Added a check for `tigera-operator` because private registry installs also need pull access for the operator image.
- The digest update example patched `/spec/images/0/digest`, which may update the wrong image entry. Replaced it with `kubectl edit imageset` so the matching image entry is updated explicitly.
- The registry patch placed a registry subpath in `spec.registry`. Updated the example to use `spec.registry` for the registry host and `spec.imagePath` for the subpath.
- The ImageSet lookup section relied on a non-documented log message. Updated it to use `status.calicoVersion` when available and the operator `--version` command for new installs or upgrades.

## Review Notes
The post is version-sensitive because Calico image lists and operator versions change by release. The example version `v3.27.0` remains valid as an example, but readers should generate ImageSets using the operator version they are actually deploying.
