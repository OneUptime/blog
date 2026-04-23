# Validation Summary: How to Enable RKE2 Secret Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RKE2
- Kubernetes Secret encryption at rest
- Kubernetes API server EncryptionConfiguration
- etcd and etcdctl
- RKE2 secrets-encrypt key rotation

## Sources Consulted
- RKE2 Secrets Encryption documentation (https://docs.rke2.io/security/secrets_encryption)
- RKE2 Server Configuration Reference (https://docs.rke2.io/reference/server_config)
- RKE2 Configuration Options documentation (https://docs.rke2.io/install/configuration)
- RKE2 CIS 1.10 Self-Assessment Guide (https://docs.rke2.io/security/cis_self_assessment110)
- Kubernetes Encrypting Confidential Data at Rest documentation (https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- Kubernetes kube-apiserver config API reference (https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/)
- RKE2 source for default server encryption behavior (https://github.com/rancher/rke2/blob/master/pkg/rke2/rke2.go)
- RKE2 source for secrets-encrypt command wiring (https://github.com/rancher/rke2/blob/master/pkg/cli/cmds/secrets_encrypt.go)

## Issues Found
1. **First-time enable flow was inaccurate for RKE2.** The post described `sudo rke2 secrets-encrypt enable` as the normal way to enable encryption and said it generates the key, writes the config, updates the API server, and restarts the API server. Current RKE2 enables secret encryption by default and manages the generated config automatically. Replaced this with `rke2 secrets-encrypt status` and clarified that the command is used to verify and manage the feature.
2. **Encryption configuration paths were wrong.** The post referenced `/var/lib/rancher/rke2/server/cred/encryption-state.json` and `/var/lib/rancher/rke2/server/tls/encryption-config.yaml`. RKE2 documents the generated encryption provider config at `/var/lib/rancher/rke2/server/cred/encryption-config.json`. Updated the paths and added a process check for `--encryption-provider-config`.
3. **Provider guidance was inaccurate.** The post claimed newer RKE2 versions use AES-GCM. RKE2 defaults to `aescbc` and supports `secretbox` on version-gated newer releases; FIPS clusters should keep `aescbc`. Updated the provider explanation and removed the AES-GCM recommendation.
4. **Rotation procedure was outdated and incomplete.** The post used the classic `prepare`, `rotate`, `reencrypt` sequence without the required restart points and did not mention the current `rotate-keys` flow. Updated the primary procedure to use `rke2 secrets-encrypt rotate-keys`, added an etcd snapshot step, and retained a corrected classic flow for older releases.
5. **Manual configuration snippet was unsafe for RKE2.** The post created a custom `EncryptionConfiguration` under `/etc/rancher/rke2` and passed it to kube-apiserver without handling RKE2 static-pod mounting, and the later rotation snippet used an undefined `OLD_KEY`. Replaced this with RKE2's documented `secrets-encryption-provider` configuration using a config drop-in file.
6. **Manual re-encryption verification was misleading.** The post used `strings` and said encrypted etcd data should be unreadable binary with no readable text. Kubernetes encrypted values include a readable `k8s:enc:<provider>:v1` prefix, while the secret payload should not appear in plaintext. Updated the verification to use `hexdump` and check for the encryption prefix.
7. **Kubernetes re-encryption command and namespace handling were tightened.** Kept the official `kubectl get secrets --all-namespaces -o json | kubectl replace -f -` flow, added `ETCDCTL_API=3`, and made the test secret read/delete commands explicitly use the `default` namespace.
8. **Compliance wording was too absolute.** The conclusion stated that encryption at rest is mandatory for several compliance frameworks. Softened this to say it is often required or used to satisfy data-protection controls.

## Review Notes
- RKE2's current documentation recommends `rotate-keys` for supported releases and the classic prepare/rotate/reencrypt sequence only for older releases.
- Kubernetes documentation notes that AES-GCM requires careful automated rotation due to nonce limits; the post now avoids recommending AES-GCM for RKE2-managed encryption.
