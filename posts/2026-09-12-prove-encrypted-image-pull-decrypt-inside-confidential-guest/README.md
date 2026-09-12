# Verify Encrypted Images Are Pulled and Decrypted Inside the Guest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Encryption, Security, Troubleshooting

Description: Collect evidence that CoCo pulls and decrypts image layers inside its confidential guest, and understand what host metadata cannot prove.

---

An encrypted image starts successfully under a confidential RuntimeClass. That is encouraging, but it does not by itself prove that plaintext layers stayed inside the guest. A convincing check combines the configured data path, attestation-gated key release, guest-side execution evidence, and tests designed to fail when that path is broken.

No command run on a potentially malicious host can prove that the host never observed plaintext. Host inspection is useful operational evidence. The security argument must ultimately depend on the approved measured guest, its enforced policy, and secrets delivered only to that guest.

## Understand the Expected Data Path

In CoCo, the guest's Confidential Data Hub (CDH) handles image pulling and decryption, while its Attestation Agent obtains evidence used in the KBS exchange. The [architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md) describes those responsibilities.

Host-side containerd can still fetch image metadata and coordinate snapshots. Kata's [guest image management design](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/design/kata-guest-image-management-design.md) explicitly distinguishes blob confidentiality from manifest and configuration visibility. Therefore a host image listing is not proof that payload layers were decrypted there, and an empty listing is not proof they were never present.

Record the runtime handler, Kata configuration, snapshotter configuration, guest image digest, and Trustee version. Confirm they belong to the guest-pull path for your release. A RuntimeClass name is administrator-controlled and does not establish the configuration behind it.

## Verify the Registry Artifact

Start with a fresh test artifact whose encryption key has never been installed on the worker. Use a registry reference pinned by digest. Inspect the raw manifest from a trusted administrative machine:

```bash
skopeo inspect --raw "docker://$ENCRYPTED_IMAGE" > manifest.json
jq -r '.layers[] | [.digest, .mediaType] | @tsv' manifest.json
```

Here `ENCRYPTED_IMAGE` is the approved registry reference. If the response is an image index, first select the platform-specific manifest; an index has no `layers` array. Confirm the intended layers use encrypted media types and carry the encryption annotations expected by the [CoCo encrypted-image workflow](https://confidentialcontainers.org/docs/features/encrypted-images/).

Encryption can be layer-selective. An unencrypted layer can contain sensitive files even when another layer is encrypted. Image configuration, command arguments, labels, and build history may remain visible, so never hide secrets there on the assumption that the entire OCI artifact is opaque.

## Correlate a Fresh Guest with Key Release

Create a disposable pod with a new sandbox and a canary image. Record its identity before collecting supporting logs:

```bash
NS=coco-test
POD=image-canary
kubectl get pod "$POD" -n "$NS" -o json | jq '{
  uid: .metadata.uid,
  runtime: .spec.runtimeClassName,
  node: .spec.nodeName,
  images: [.spec.containers[].image]
}'
```

On the verifier side, confirm that the request came through the actual hardware evidence path and that AS appraisal and KBS resource authorization succeeded for the approved guest and Init-Data. Record the resource identifier and decision; do not record the decryption key or response body.

The key should be unavailable to the node's ordinary identity. Confirm that the approved agent policy restricts workload images and operations, because a trusted guest allowed to run arbitrary containers could become an oracle for extracting secrets.

Where diagnostic collection is permitted, correlate the Kata image-pull request with CDH completion inside that sandbox. Use release-specific component logs and a harmless workload. Avoid enabling a guest console or broad debug output in a production pod merely to collect this evidence.

## Inspect the Host Without Overclaiming

On the assigned worker, identify the CRI sandbox and inspect the relevant host snapshot paths using the release's guest-pull guide. The expected result is no plaintext workload root filesystem exported from the host into the guest.

Do not search every mounted filesystem for real secrets. Instead, use a unique nonsecret marker in the canary layer and a bounded set of known snapshot locations. This can expose an accidental host unpack path while keeping the investigation controlled.

A host may store ciphertext, sparse encrypted backing files, metadata, and logs without violating the intended payload boundary. Conversely, deleting a host cache before inspection does not establish that plaintext was never there. Write down what was inspected and what the result actually demonstrates.

## Use Negative Controls

Repeat the test in a new sandbox after denying the canary's decryption-key resource. The encrypted workload should fail before running. A reused sandbox or already available plaintext can invalidate this test, so use a new artifact/key pair if the result is ambiguous.

Also run an ordinary host-side pull attempt without a decryption key in the isolated test environment. It should not produce a usable plaintext root filesystem. Confirm no key is supplied through local ocicrypt configuration or another secret provider.

Finally, restore the staging resource rule and verify success, then substitute an unauthorized image digest or Init-Data value and verify rejection. These controls separate three explanations: registry connectivity works, key delivery works only for the intended attester, and guest policy prevents workload substitution.

A denied attempt is only meaningful if it failed for the expected reason. A DNS failure is not evidence that a secret-release policy is correct.

## Account for Integrity and Storage

Encryption alone does not establish publisher authenticity. Use the supported [signed-image verification](https://confidentialcontainers.org/docs/features/signed-images/) workflow or another approved artifact-authentication mechanism inside the trusted path. A digest also needs a trusted source of approval.

After decryption, inspect where guest layers and writable data live. Default image storage uses guest memory; optional protected block storage changes the storage argument. Its documented ephemeral and replay limitations should be included in the deployment assessment.

## Conclusion

The strongest evidence combines approved measured guest software, restrictive workload policy, attested key delivery, and fresh-sandbox negative controls. Host cache checks help detect configuration mistakes, but they supplement the trust chain rather than replace it.

## Official Documentation

- [CoCo architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md)
- [Kata guest image management design](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/design/kata-guest-image-management-design.md)
- [CoCo encrypted images](https://confidentialcontainers.org/docs/features/encrypted-images/)
- [CoCo signed images](https://confidentialcontainers.org/docs/features/signed-images/)
- [CoCo confidential image storage](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/)
