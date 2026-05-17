# Validation Summary: How to Configure Kubernetes Secrets Encryption at Rest on Talos

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Kubernetes (EncryptionConfiguration, kube-apiserver `--encryption-provider-config`)
- etcd (snapshots, on-disk secret storage)
- Encryption providers: secretbox (XSalsa20+Poly1305), aesgcm, aescbc, identity
- `auger` (etcd snapshot inspection)
- HashiCorp Vault (for key backup)

## Sources Consulted
- Talos `talosctl etcd` source: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/etcd.go
- Talos v1alpha1 config reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Talos etcd maintenance docs: https://www.talos.dev/v1.7/advanced/etcd-maintenance/
- Kubernetes "Encrypting Confidential Data at Rest": https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- siderolabs/talos issue #6362 (secretbox as default since v1.3)
- etcd-io/auger: https://github.com/etcd-io/auger

## Issues Found
1. **Non-existent `talosctl etcd get` command (CRITICAL, 4 occurrences).** The post repeatedly used `talosctl etcd get /registry/secrets/...` to read raw etcd values. That subcommand does not exist in talosctl — the only `talosctl etcd` subcommands are `alarm`, `defrag`, `forfeit-leadership`, `leave`, `members`, `remove-member`, `snapshot`, and `status`. Fixed by replacing each call with `talosctl etcd snapshot <path>` followed by either `strings <snapshot> | grep "k8s:enc:secretbox:v1:"` (for active-encryption checks) or `auger extract -f <snapshot> -k <key>` (for per-key inspection). This affected: the "Verify It Is Encrypted" section, the "Verify Using etcd Directly" section (renamed to "Verify Individual Keys with auger"), Step 6 of key rotation, and the `check-encryption.sh` monitoring script.

2. **Missing required `op` field on Talos `files` entries.** Talos `files` entries require `op` to be one of `create`/`append`/`overwrite`; validation rejects an entry without it. Added `op: create` to the Method 2 initial config and `op: overwrite` to the Step 2 key-rotation config (since it replaces an existing file).

3. **Wrong yq path in backup section.** `talosctl get machineconfig -o yaml` returns a COSI resource where the machine config lives under `.spec`, so `yq '.cluster.secretboxEncryptionSecret'` would return null. Corrected to `yq '.spec.cluster.secretboxEncryptionSecret'` and added a short clarifying comment.

## Review Notes
- `talosctl health` is still functional but is deprecated in newer Talos versions in favor of the dashboard / `talosctl get nodes`. Left as-is since it still works and is widely used in tutorials.
- The `aescbc` provider is described as "Older, still widely used"; Kubernetes upstream has flagged it as a less-preferred option in recent releases (AES-CBC + PKCS#7 has known padding-oracle concerns when not authenticated). Not strictly inaccurate, so left untouched.
- The "secretbox (recommended)" framing is reasonable here because Talos's first-class `cluster.secretboxEncryptionSecret` configures exactly that provider, and secretbox is the Talos default for new clusters since v1.3.
- The `kubectl get secrets --all-namespaces -o json | kubectl replace -f -` approach is valid (kubectl handles List resources), though some auto-generated/immutable secrets (e.g., bound service-account tokens) will be skipped — the second, controlled script accounts for this.
- The `permissions: 0o600` octal notation is correct Talos syntax.
- `EncryptionConfiguration` `apiVersion: apiserver.config.k8s.io/v1` is current (GA since Kubernetes 1.13).
- The encrypted-data prefix `k8s:enc:secretbox:v1:` matches Kubernetes' on-disk format.
