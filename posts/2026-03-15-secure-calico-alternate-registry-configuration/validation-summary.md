# Validation Summary: How to Secure Calico Alternate Registry Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- Kubernetes Secrets
- Kubernetes RBAC
- Sealed Secrets
- Container registries

## Sources Consulted
- Calico documentation: Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Install images by registry digest: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Kubernetes documentation: kubectl create secret docker-registry: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The introduction said operator-based Calico pulls images from `docker.io/calico` by default. Current Calico operator documentation uses `quay.io/calico` for Calico images and `quay.io/tigera` for the operator image, so the text was updated.
- The introduction referred to enforcing image verification, but the guide only covers immutable image references, not signature verification. The wording was changed to avoid overstating what the post implements.
- The prerequisites listed `calicoctl`, but the guide does not use it and the operator registry workflow does not require it. The prerequisite was removed.
- The image pull secret was created in `calico-system`. Calico's operator registry documentation says the pull secret should be configured in the `tigera-operator` namespace for this workflow, so the command and troubleshooting notes were updated.
- The digest pinning section incorrectly implied digests can be specified directly in the Installation resource. Calico operator installations use an `ImageSet` resource for digest pinning, so the section was corrected and a minimal `ImageSet` example was added.
- The verification command only searched for `docker.io`, which would miss current Calico public registry references under `quay.io`. The command now checks for both `quay.io` and `docker.io`.

## Review Notes
The post remains version-neutral. Calico's Installation API reference documents the `registry`, `imagePath`, and `imagePullSecrets` fields, while the alternate registry how-to provides the practical workflow. Future improvements could include a complete ImageSet example for a specific Calico release, but that would be a larger expansion rather than a correctness fix.
