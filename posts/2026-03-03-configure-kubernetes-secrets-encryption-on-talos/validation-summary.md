# Validation Summary: How to Configure Kubernetes Secrets Encryption on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Kubernetes EncryptionConfiguration (kube-apiserver `--encryption-provider-config`)
- etcd (`etcdctl`)
- Encryption providers: aescbc, aesgcm, secretbox, identity
- kubectl (secrets, replace, CronJob)

## Sources Consulted
- Talos v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos v1.10 configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos CLI reference (`talosctl etcd`, `talosctl machineconfig patch`, `talosctl logs`): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos GitHub issue on key rotation support: https://github.com/siderolabs/talos/issues/8702
- Talos troubleshooting (static pod log access via `-k`): https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting
- Kubernetes encryption-at-rest provider documentation (upstream behavior for `EncryptionConfiguration`)

## Issues Found

1. **Fabricated `cluster.secretsEncryption` schema.** The original post used a nested structure (`cluster.secretsEncryption.provider`, `cluster.secretsEncryption.aescbc.keys[]`, `cluster.secretsEncryption.resources[]`) that does not exist in Talos. Talos actually exposes two single-string fields, `cluster.aescbcEncryptionSecret` and `cluster.secretboxEncryptionSecret`, each accepting one base64-encoded 32-byte key. Replaced the bogus YAML with the real native fields and added a note that the native field encrypts only `secrets` and supports only one key.

2. **First "verbose" YAML example was internally inconsistent.** It mixed `apiServer.extraArgs` and `extraVolumes` with the same fake `secretsEncryption` block and never created the encryption-config file it referenced. Removed that example and consolidated the manual approach into the Key Rotation and Encrypting Other Resources sections, where it is actually needed and now includes a `machine.files` entry that writes the `EncryptionConfiguration` to disk plus matching `extraArgs` / `extraVolumes`.

3. **`talosctl etcd get` does not exist.** The `etcd` subcommand only offers `alarm`, `defrag`, `forfeit-leadership`, `leave`, `members`, `remove-member`, `snapshot`, `status`. Replaced the verification snippet with `kubectl exec` into an etcd pod and a call to `etcdctl get /registry/secrets/...`, and updated the description to mention the `k8s:enc:aescbc:v1:` / `k8s:enc:secretbox:v1:` prefix users should expect.

4. **`talosctl logs kube-apiserver` is missing the kubernetes flag.** kube-apiserver runs as a Kubernetes static pod, not a Talos service, so reading its logs through `talosctl` requires `-k` (or `--kubernetes`) and the `kube-system/kube-apiserver` resource ID. Fixed the command and added a one-line explanation.

5. **Key Rotation section relied on the fake multi-key schema.** Rewrote it to acknowledge the native field cannot rotate (tracked by siderolabs/talos#8702) and to demonstrate the supported workflow: a `machine.files` entry that writes an `EncryptionConfiguration` containing both keys, plus `apiServer.extraArgs` / `extraVolumes` to wire it into the API server. Also added a note that the previous `aescbcEncryptionSecret` field must be removed when switching to the manual config so the API server doesn't end up with two encryption configurations.

6. **"Encrypting Other Resources" section used the same fake schema.** Rewrote it to use the manual `EncryptionConfiguration` approach with a `resources:` list of `secrets` and `configmaps`, and reused the same `extraArgs` / `extraVolumes` wiring.

## Review Notes

- The intro's framing that "Kubernetes stores Secrets in etcd as base64-encoded plaintext" is colloquially common but slightly loose — the storage encoding in etcd is the protobuf-serialized Secret object, where the `data` field values happen to be base64-encoded. The functional point (anyone with etcd access sees the secret data) is accurate, so left as-is.
- AES-CBC is the focus of the post, but upstream Kubernetes has effectively deprecated `aescbc` in favor of `aesgcm` and `secretbox` for new clusters. The post now mentions `secretboxEncryptionSecret` as an alternative; readers building a new cluster may prefer it.
- The native `cluster.aescbcEncryptionSecret` field is itself marked as a candidate for removal in upstream Talos discussions because AES-CBC's status in upstream Kubernetes is shaky; this is worth re-checking against the Talos release that the reader is targeting.
- The "Talos handles rolling restarts gracefully" claim in considerations is true in the sense that Talos applies machine config changes per-node, but Talos does not orchestrate a control-plane rolling upgrade for you — readers should still apply nodes one at a time and wait for each kube-apiserver to come back healthy.
- The CronJob health check uses `kubectl` inside the cluster and assumes a `ServiceAccount` named `encryption-checker` exists with the right RBAC. The post does not show creating that ServiceAccount/Role/RoleBinding; that's a documentation gap rather than a correctness bug.
