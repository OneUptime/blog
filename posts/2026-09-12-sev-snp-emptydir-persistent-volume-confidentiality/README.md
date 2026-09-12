# Which emptyDir and Persistent Volume Data Is Confidential in SNP Pods?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, AMD SEV-SNP, Storage, Encryption, Kubernetes

Description: Understand guest memory, confidential emptyDir, persistent volumes, encryption key placement, and replay limits for CoCo SEV-SNP workloads.

---

SEV-SNP protects private guest memory. It does not automatically make every volume attached to the guest confidential. The answer depends on where plaintext exists, where encryption happens, who holds the key, and whether integrity and rollback attacks are in scope.

Current upstream Confidential Containers also has protected storage features that older explanations may omit. Inspect the deployed release and effective runtime settings before applying a general rule to every `emptyDir` or PVC.

## Follow Plaintext Across Each Boundary

Begin with a table for the actual workload:

| Storage path | Expected plaintext location | What to verify |
| --- | --- | --- |
| Default guest container filesystem | Guest memory in the default CoCo path | Actual image and writable-layer storage mode |
| `emptyDir` with `medium: Memory` | Guest memory in the supported CoCo path | Guest mount and memory accounting |
| Current confidential disk `emptyDir` | Guest, with protected host block backing | Confidential runtime and encrypted-volume setup |
| Ordinary filesystem PVC | Depends on CSI and mount path | Whether host or backend can read plaintext |
| Dedicated guest-encrypted block device | Guest, if keys stay there | Encryption, integrity, and key lifecycle |
| Application-encrypted objects | Application inside guest | Authenticated encryption and version protection |

The [CoCo protected-storage overview](https://confidentialcontainers.org/docs/features/protected-storage/) states that its default workload filesystem uses confidential guest memory and cautions that external storage can change the trust model. A host-mounted filesystem forwarded into a guest is not equivalent to data encrypted before leaving that guest.

## Understand Current Confidential emptyDir

In current documented CoCo confidential runtimes, disk-backed `emptyDir` is created on a protected block device. Encryption occurs inside the guest using LUKS2, and the confidential emptyDir mechanism includes integrity protection. The host supplies storage capacity without holding the guest's plaintext or guest-resident LUKS header.

A normal pod fragment selects it through the confidential runtime's implementation:

```yaml
spec:
  volumes:
    - name: scratch
      emptyDir:
        sizeLimit: 16Gi
  containers:
    - name: worker
      volumeMounts:
        - name: scratch
          mountPath: /scratch
```

This fragment assumes the pod already selects the correct confidential RuntimeClass. It does not itself select encryption. Confirm the deployed Kata version and volume implementation; an older runtime, custom configuration, or nonconfidential handler can have different behavior.

The [confidential emptyDir documentation](https://confidentialcontainers.org/docs/features/protected-storage/confidential-emptydir/) makes two distinctions particularly important. The volume is ephemeral, and it does not protect against replay of an earlier volume state. Confidentiality plus integrity does not establish freshness.

Do not generalize that every LUKS2 volume has the same integrity properties. Those depend on the selected storage configuration, including its integrity layer. Verify the effective mapper and guest setup when assessing a custom deployment.

## Use Memory emptyDir Deliberately

To request guest-memory scratch storage, use:

```yaml
volumes:
  - name: memory-scratch
    emptyDir:
      medium: Memory
      sizeLimit: 512Mi
```

This can simplify the data-at-rest boundary for temporary content, but it consumes memory needed by the guest and application. File deletion and pod lifetime affect capacity; it is not a persistent storage solution.

Kubernetes defines `emptyDir` lifetime and memory-backed volume behavior in its [volume documentation](https://kubernetes.io/docs/concepts/storage/volumes/). A container restart within a pod does not necessarily erase emptyDir contents, while removal of the pod removes the ephemeral volume. Distinguish that lifecycle from persistent storage and from an individual application process restart.

In an approved canary, inspect the mounted path inside the guest. Node-side `df` output is not sufficient to identify the guest mount or its plaintext boundary.

## A PVC Is an Allocation, Not an Encryption Claim

A PersistentVolumeClaim describes a request for storage. `ReadWriteOnce`, a StorageClass name containing `encrypted`, and a cloud disk encryption checkbox do not by themselves exclude the host from seeing plaintext.

For a filesystem PVC, determine where it is mounted and decrypted. If the host mounts the decrypted filesystem and passes it into the guest, the host remains a plaintext observer. If a storage service terminates encryption and exposes plaintext to an untrusted intermediary, that intermediary is still in the trust boundary.

For guest-managed encryption of a raw block device, keep keys inside the guest and deliver them only after the required attestation. Design persistence explicitly: a new pod must recover the right key and volume identity, while an unauthorized guest must not. Also authenticate volume metadata and bind keys to the intended dataset rather than accepting any host-presented device.

CoCo's experimental `/dev/trusted_store` image-storage feature is a different case. It uses a block PVC for protected image storage but is ephemeral from the workload perspective. The [image-storage documentation](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/) says it is not a reusable cache for later pods. Do not use that mechanism as an assumed durable application-data encryption service.

## Address Integrity, Freshness, and Capacity Separately

Storage encryption protects confidentiality. Integrity protection detects certain modifications. Freshness requires an additional design, such as a trusted remote version record or application protocol that rejects older authenticated state. A host can also deny storage access; encryption does not ensure availability.

For persistent sensitive state, test restart recovery, wrong-key failure, substituted device handling, corrupted blocks, and replayed snapshots in a controlled environment. Do not call a replay test successful merely because the filesystem mounted: that can be the failure you are trying to detect.

Capacity has its own surprises. Current block-backed emptyDir uses sparse backing files whose logical size relates to host filesystem capacity; `sizeLimit` does not directly size the guest block device. Initial metadata and integrity overhead can trigger eviction early. Also, the protected emptyDir path cannot discard blocks in the documented integrity configuration, so deleting guest files need not shrink host allocation.

## Conclusion

For an SNP pod, identify the storage path and the plaintext boundary before declaring data confidential. Current confidential emptyDir and guest-memory volumes provide useful primitives, while ordinary PVCs need a separate assessment. Keep encryption, integrity, freshness, persistence, and availability as distinct requirements and test each one your workload depends on.

## Official Documentation

- [CoCo protected storage](https://confidentialcontainers.org/docs/features/protected-storage/)
- [CoCo confidential emptyDir](https://confidentialcontainers.org/docs/features/protected-storage/confidential-emptydir/)
- [Kubernetes volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [CoCo experimental image storage](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/)
- [Kata storage capacity limitations](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/Limitations.md)
