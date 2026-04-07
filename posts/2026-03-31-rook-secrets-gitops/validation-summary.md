# Validation Summary: How to Manage Rook-Ceph Secrets in GitOps Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (secret management, CSI secrets, RGW credentials)
- Bitnami Sealed Secrets
- External Secrets Operator (with AWS Secrets Manager)
- Mozilla SOPS with Age encryption
- Flux CD (Kustomization with SOPS decryption)
- Kubernetes Secrets
- Helm
- kubeseal CLI

## Sources Consulted
- Sealed Secrets GitHub repository and documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator documentation: https://external-secrets.io/latest/api/externalsecret/
- Mozilla SOPS documentation: https://github.com/getsops/sops
- Age encryption tool documentation: https://github.com/FiloSottile/age
- Flux CD SOPS decryption documentation: https://fluxcd.io/flux/guides/mozilla-sops/
- Rook-Ceph documentation on CSI secrets: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/

## Issues Found
- **SOPS Age public key reference**: The original command `sops --age=$(cat age.pub)` referenced a file `age.pub` that does not exist. The `age-keygen -o age.agekey` command writes the private key to `age.agekey` and prints the public key to stderr; it does not create an `age.pub` file. Fixed by extracting the public key from the comment line in the key file using `grep` and `sed`, and storing it in an environment variable before passing it to `sops --age`.

## Review Notes
- The External Secrets Operator API version `external-secrets.io/v1beta1` is valid but `v1` is now the stable release. The v1beta1 API still works and is not yet removed, so this is not an error, but authors may want to update to v1 in the future.
- The Flux Kustomization API version `kustomize.toolkit.fluxcd.io/v1` is current and correct.
- The Rook CSI secret name `rook-ceph-csi-rbd-node` and field `userKey` are accurate for standard Rook-Ceph deployments.
