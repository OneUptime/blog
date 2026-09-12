# Trace CoCo Image Decryption Through Annotations and KBS Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Encryption, OCI, Security, Troubleshooting

Description: Debug CoCo image decryption by following layer key annotations, KBS resource identifiers, attestation, key bytes, and the guest pull path.

---

A confidential container that cannot decrypt its image may never reach application startup. The useful evidence is in the image descriptors, guest components, and Trustee, not the application's logs.

Treat image decryption as a chain: the guest recognizes an encrypted layer, reads its key annotation, obtains the referenced resource after attestation and authorization, unwraps the layer key, and decrypts the layer. Stop at the first unsuccessful stage. [CoCo encrypted images](https://confidentialcontainers.org/docs/features/encrypted-images/)

## Freeze the Image Identity

Record the exact image digest and guest architecture. A multi-platform image index points to separate manifests; inspect the child manifest used by the failing guest. Save that manifest as `manifest.json` using `skopeo inspect --raw` against its digest.

List the layers and annotation names:

```bash
jq '.layers[] | {
  mediaType,
  digest,
  annotationNames: ((.annotations // {}) | keys)
}' manifest.json
```

This establishes whether the selected platform is actually encrypted and whether the expected provider annotation exists. If the layer type is unsupported, fix format compatibility before diagnosing KBS resource retrieval. An image tag containing the word `encrypted` proves neither property.

For the CoCo keyprovider, the relevant annotation is `org.opencontainers.image.enc.keys.provider.attestation-agent`. Its encoded payload describes the key identifier, wrapped data, initialization vector, and wrapping algorithm. It does not contain the plaintext key. [CoCo keyprovider](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)

## Read Every Referenced Key Identifier

Inspect identifiers without dumping wrapped payloads into a ticket. The ocicrypt implementation permits comma-separated annotation entries, so handle each entry:

```python
import base64
import json
from pathlib import Path

manifest = json.loads(Path('manifest.json').read_text())
annotation = 'org.opencontainers.image.enc.keys.provider.attestation-agent'
for number, layer in enumerate(manifest['layers']):
    value = layer.get('annotations', {}).get(annotation)
    if not value:
        print(number, layer['mediaType'], 'no CoCo key annotation')
        continue
    for item in value.split(','):
        decoded = json.loads(base64.b64decode(item, validate=True))
        print(number, decoded.get('kid'), decoded.get('wrap_type'))
```

Malformed base64 or JSON indicates an annotation problem before KBS authorization. Multiple layers may reference different keys, so a successful request for one key is not enough. [ocicrypt annotation handling](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/ocicrypt-rs/src/encryption.rs)

A typical identifier is:

```text
kbs:///default/image-key/app-v3
```

Its three resource path components are repository `default`, resource type `image-key`, and resource tag `app-v3`. For the administration CLI, that becomes `default/image-key/app-v3`. Keep spelling and capitalization identical.

The KBS server address is configured separately in the guest. Do not assume that adding a hostname to the annotation redirects every KBC implementation; the current keyprovider documentation explicitly notes limitations around that authority component. Prefer the documented empty-authority form and verify the configured KBS URL.

## Check Guest Configuration and Resource Authorization

Confirm the guest's KBC name, KBS endpoint, and trusted certificate. Inspect the configuration embedded in the deployed Init-Data or guest artifact. Checking the intended configuration file in Git is not proof that the running sandbox received it.

The current CDH configuration includes `[kbc]` settings for the client and KBS endpoint. Registry authentication and image decryption resources are different inputs; a successful private registry login does not authorize the image key. [CDH configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)

Correlate one fresh pod attempt with KBS and attestation-service logs. Distinguish these outcomes:

| Stage | Diagnostic meaning |
|---|---|
| No KBS request | Guest configuration, TLS, DNS, or earlier image failure |
| Evidence generation fails | Guest attester or hardware quote path |
| Evidence verifies but appraisal is contraindicated | Measurements, reference values, or attestation policy |
| Resource request denied | Resource policy or requested path |
| Resource absent | Wrong identifier or provisioning backend |
| Resource returned, unwrap fails | Wrong key bytes, annotation, or algorithm compatibility |

HTTP status codes alone may not uniquely identify these cases. Use the server's structured error and matching timestamp.

## Verify the Provisioned Bytes

The CoCo keyprovider's file-based KEK input requires 32 bytes. A common provisioning mistake is storing a 44-character base64 representation instead of the original 32-byte key, or adding a newline while copying it.

In the trusted build or administration environment, check the source file without printing it:

```bash
wc -c < /secure/image-key
```

Provision the original binary file using the supported KBS administration workflow. Compare it with the trusted resource backend copy when that backend permits an administrator to do so. For two local trusted files, `cmp -s` provides equality without displaying their contents:

```bash
cmp -s /secure/image-key /secure/exported-kbs-resource
```

Do not retrieve a production decryption key through `kubectl exec` and send it to the host terminal. For an end-to-end retrieval test, use a separate diagnostic key and resource under a narrowly scoped test policy.

## Retest with a New Sandbox

After correcting the resource path or key, create a fresh pod using the same encrypted digest. This removes ambiguity from per-guest state and partially completed pulls. If key retrieval succeeds but decryption fails, retain the literal cryptographic error and compare the keyprovider and guest-components versions.

If decryption completes but unpacking fails, investigate compression, layer integrity, filesystem capacity, or image configuration. Those are subsequent stages. Avoid erasing the entire worker as an initial response because it discards the evidence needed to distinguish them.

## Conclusion

Trace decryption from the selected layer descriptor to its key identifier, then through attestation, resource policy, and exact key bytes. Validate each dependency with a fresh diagnostic workload and keep production key material inside its intended trust boundary.

## Official Documentation

- [CoCo encrypted images](https://confidentialcontainers.org/docs/features/encrypted-images/)
- [CoCo keyprovider parameters and annotations](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)
- [ocicrypt annotation processing](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/ocicrypt-rs/src/encryption.rs)
- [CDH configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
