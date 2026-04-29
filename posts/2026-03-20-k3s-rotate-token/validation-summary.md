# Validation Summary: How to Rotate K3s Token

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Bash
- systemd
- OpenSSL

## Sources Consulted
- K3s token documentation: https://docs.k3s.io/cli/token
- K3s architecture documentation: https://docs.k3s.io/architecture
- K3s configuration documentation: https://docs.k3s.io/installation/configuration
- K3s v1.26 release notes documenting server token rotation support: https://docs.k3s.io/release-notes-old/v1.26.X

## Issues Found
- The post referenced `/var/lib/rancher/k3s/server/node-token` as the server token file. Updated it to `/var/lib/rancher/k3s/server/token`, and noted the separate agent token path `/var/lib/rancher/k3s/server/agent-token`, because current K3s documents those as the canonical locations.
- The post described the token as being used for "cluster secrets" encryption. Updated this to bootstrap data encryption, because K3s documents the server token as the PBKDF2 passphrase for bootstrap data persisted to the datastore.
- The post recommended stopping K3s and directly editing the token file to rotate the token. Replaced that workflow with the supported `k3s token rotate --token <old> --new-token <new>` command, because current K3s provides a dedicated rotation command and warns that pre-rotation snapshots require the old token for restore.
- The server and agent configuration examples overwrote full config or environment files with `cat > ...`. Updated those examples to preserve existing settings by using config drop-ins or targeted `sed`/append operations, matching K3s' documented configuration model.
- The post implied all agents always need updating after server token rotation. Clarified that this applies to clusters using the default shared token, and that separate agent-token configurations should only update nodes using the token being rotated.
- The post advised removing `/var/lib/rancher/k3s/server/cred/node-passwd`. Replaced this with deleting the Kubernetes Node object so K3s removes the corresponding node-password secret, because current K3s stores node-password state in `kube-system` and documents node deletion as the recovery path.
- The automation example directly rewrote the old token file. Updated it to use `k3s token rotate`, preserve existing environment settings, and restart nodes with the new token.

## Review Notes
- The guide now reflects the current `k3s token rotate` workflow, which was added in the October 2023 release train and is available in `v1.28.2+k3s1`, `v1.27.7+k3s1`, `v1.26.10+k3s1`, `v1.25.15+k3s1`, and later.
- The examples assume a Linux `systemd`-managed K3s installation. OpenRC-based installs would need equivalent service-management changes.
- Snapshots taken before token rotation still require the old server token during restore, so retaining that token is operationally important.
