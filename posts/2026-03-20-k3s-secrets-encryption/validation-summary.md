# Validation Summary: How to Configure K3s Secrets Encryption

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Kubernetes Secrets
- etcd
- SQLite
- `kubectl`
- `etcdctl`

## Sources Consulted
- K3s Secrets Encryption: https://docs.k3s.io/security/secrets-encryption
- K3s `secrets-encrypt` CLI: https://docs.k3s.io/cli/secrets-encrypt
- K3s Server CLI: https://docs.k3s.io/cli/server
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Good Practices for Secrets: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes Decrypt Confidential Data that is Already Encrypted at Rest: https://kubernetes.io/docs/tasks/administer-cluster/decrypt-data/
- etcdctl interaction docs: https://etcd.io/docs/v3.2/dev-guide/interacting_v3/

## Issues Found
- The install snippet used `INSTALL_K3S_EXEC="--secrets-encryption"` without the documented `server` command. I changed it to `curl -sfL https://get.k3s.io | sh -s - server --secrets-encryption` to match the K3s docs.
- The post mixed a hand-written upstream `EncryptionConfiguration` workflow with K3s-managed `k3s secrets-encrypt` commands. I rewrote that section to use the documented K3s `secrets-encryption-provider` flow so the provider-selection, rotation, and backup steps are internally consistent.
- The custom encryption example had multiple technical problems: it labeled the provider as AES-GCM while configuring `aescbc`, and the sample base64 key decoded to 33 bytes instead of the required 32 bytes for AES-256. That section was removed in favor of the supported K3s-managed provider configuration.
- The key-rotation procedure was outdated and out of order for current K3s releases. I replaced it with the documented `k3s secrets-encrypt rotate-keys` workflow and added a note pointing older releases to the legacy `prepare` / `rotate` / `reencrypt` procedure.
- The etcd verification example would include the key path before the secret value, so the output would not actually begin with the encryption prefix as described. I added `--print-value-only` and corrected the explanation to check for the generic `k8s:enc:` prefix.
- The datastore verification text referred to plaintext YAML and JSON/YAML markers, but K3s stores Kubernetes objects in serialized JSON. I corrected those explanations to reference plaintext JSON.
- The rewrite example used a custom `kubectl apply` loop. I replaced it with the upstream-documented `kubectl get secrets --all-namespaces -o json | kubectl replace -f -` command for forcing existing Secrets to be rewritten through the API server.
- The backup example copied and encrypted `/etc/rancher/k3s/encryption-config.yaml`, which no longer matched the corrected K3s-managed workflow. I updated it to back up the K3s-generated `/var/lib/rancher/k3s/server/cred/encryption-config.json` file.

## Review Notes
- `secretbox` support in K3s is version-gated; the post now notes the April 2025 release lines where it became available.
- Current K3s documentation distinguishes between the modern `rotate-keys` workflow and the legacy `prepare` / `rotate` / `reencrypt` flow; the post now reflects that split.
- The article now stays within the documented K3s-managed encryption workflow. A separate post would be more appropriate if the team wants to cover fully custom upstream kube-apiserver `EncryptionConfiguration` management.
