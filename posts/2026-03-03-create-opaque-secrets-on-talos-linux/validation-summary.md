# Validation Summary: How to Create Opaque Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl, encryption at rest)
- Kubernetes Secrets (Opaque type)
- kubectl (create, get, patch, apply, auth can-i, rollout restart)
- Kubernetes RBAC (Role, RoleBinding, ServiceAccount)
- YAML manifests (Pod, Secret, RBAC)
- base64 encoding
- etcd (encryption at rest)

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Talos Linux configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos source code (`pkg/machinery/config/types/v1alpha1/v1alpha1_types.go`) for the exact YAML field names of `VolumeMountConfig` (`hostPath`, `mountPath`, `readonly`)
- kubectl CLI documentation (create secret, patch, rollout restart, auth can-i)

## Issues Found
No technical issues found. Verified specifically:
- All base64 encodings in the post (`admin`, `S3cur3P@ssw0rd!`, `postgres.default.svc.cluster.local`, `my-api-key-12345`, `my-api-secret-67890`) match the expected output of `base64` exactly.
- The Talos `cluster.apiServer.extraVolumes` schema uses lowercase `readonly` (not `readOnly`) — the post is correct. This is unusual since Kubernetes itself uses `readOnly`, but Talos's v1alpha1 schema explicitly tags the YAML field as `readonly`.
- `extraArgs: { encryption-provider-config: ... }` translates correctly to the `--encryption-provider-config` flag the kube-apiserver expects.
- `kubectl patch secret ... --type merge -p '{"stringData":{...}}'` is supported — `stringData` is honored on updates as well as creates.
- `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -` is the standard idiom for in-place secret replacement.
- Claim that volume-mounted Secrets auto-update (except when using `subPath`) and that env-injected Secrets do not auto-update is accurate.
- Default kubelet sync window of ~60s for projected Secret updates is correct.
- RBAC manifest is structurally valid (empty `apiGroups` for core resources, `resourceNames` to restrict to specific secrets, correct `roleRef`/`subjects` shapes).

## Review Notes
- Talos has since added a higher-level option for encryption at rest (`cluster.secretboxEncryptionSecret`, now itself deprecated in favor of `cluster.etcd.encryption` / `KubeEtcdEncryptionConfig` in newer Talos versions). The post uses the lower-level "wire up your own EncryptionConfiguration" approach, which is still fully supported and the most portable across Talos versions, so the choice is fine — but a future revision could mention the built-in option as a simpler alternative.
- The encryption-at-rest snippet wires up the volume mount but does not show how the `encryption-config.yaml` file actually gets placed at `/var/etc/kubernetes/encryption-config.yaml` on the node (this would normally be done via a `machine.files` entry in the Talos config). This is a reasonable scope cut for an Opaque-Secrets-focused post.
- `defaultMode: 0400` relies on the common Kubernetes convention where the leading `0` is parsed as octal; this works as Kubernetes intends, though it can occasionally surprise users on strict YAML 1.2 parsers.
